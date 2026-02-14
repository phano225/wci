import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Variables d’environnement Supabase manquantes. Définissez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const isWpUpload = (url) => {
  try {
    const u = new URL(url);
    return u.hostname.includes('worldcanalinfo.com') && u.pathname.startsWith('/wp-content/');
  } catch {
    return false;
  }
};

const sha1 = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 12);

const guessExt = (contentType, srcUrl) => {
  if (contentType) {
    if (contentType.includes('jpeg')) return 'jpg';
    if (contentType.includes('png')) return 'png';
    if (contentType.includes('webp')) return 'webp';
    if (contentType.includes('gif')) return 'gif';
    if (contentType.includes('svg')) return 'svg';
  }
  const p = path.parse(new URL(srcUrl).pathname);
  const ext = (p.ext || '').replace('.', '').toLowerCase();
  return ext || 'jpg';
};

async function uploadFromUrl(srcUrl, destPrefix) {
  const attemptFetch = async (url) => {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': 'https://worldcanalinfo.com'
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    return { buf, contentType };
  };
  try {
    // 1) Direct origin
    let data;
    try {
      data = await attemptFetch(srcUrl);
    } catch (e1) {
      // 2) Fallback via weserv proxy
      try {
        const u = new URL(srcUrl);
        const base = `${u.hostname}${u.pathname}${u.search}`;
        const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(base)}`;
        data = await attemptFetch(proxyUrl);
      } catch (e2) {
        throw e2;
      }
    }
    const ext = guessExt(data.contentType, srcUrl);
    const filename = `${destPrefix}-${sha1(srcUrl)}.${ext}`;
    const storagePath = `articles/${filename}`;
    const { error: upErr } = await supabase.storage.from('images').upload(storagePath, data.buf, { contentType: data.contentType, upsert: true });
    if (upErr) throw upErr;
    const { data: pub } = supabase.storage.from('images').getPublicUrl(storagePath);
    return pub.publicUrl;
  } catch (e) {
    console.error('⚠️ Échec upload depuis URL:', srcUrl, e.message);
    return null;
  }
}

function extractWpImageUrls(html = '') {
  if (!html) return [];
  const urls = new Set();
  const regex = /src=["']([^"']+worldcanalinfo\.com\/wp-content\/[^"']+)["']/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    const raw = m[1];
    // Certaines balises contiennent plusieurs URLs concaténées avec | ou %7C
    raw.split(/(?:\||%7C)/).forEach(part => {
      const u = part.trim();
      if (u) urls.add(u);
    });
  }
  return Array.from(urls);
}

async function processBatch(from = 0, to = 199) {
  const { data: rows, error } = await supabase
    .from('articles')
    .select('id, title, imageUrl, content')
    .order('createdAt', { ascending: false })
    .range(from, to);
  if (error) throw error;
  if (!rows || rows.length === 0) return { done: true, count: 0 };

  let updatedCount = 0;
  for (const art of rows) {
    let changed = false;
    let newImageUrl = art.imageUrl;
    if (art.imageUrl && isWpUpload(art.imageUrl)) {
      const uploaded = await uploadFromUrl(art.imageUrl, `${art.id}-featured`);
      if (uploaded) {
        newImageUrl = uploaded;
        changed = true;
        console.log(`✅ ${art.id} - imageUrl migrée`);
      }
    }

    let newContent = art.content || '';
    const inContentUrls = extractWpImageUrls(newContent);
    if (inContentUrls.length) {
      const map = {};
      for (const src of inContentUrls) {
        const uploaded = await uploadFromUrl(src, `${art.id}-content`);
        if (uploaded) map[src] = uploaded;
      }
      if (Object.keys(map).length) {
        const pattern = new RegExp(Object.keys(map).map(u => u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
        newContent = newContent.replace(pattern, (match) => map[match] || match);
        changed = true;
        console.log(`🖼️  ${art.id} - ${Object.keys(map).length} image(s) in-content migrées`);
      }
    }

    if (changed) {
      const { error: upErr } = await supabase
        .from('articles')
        .update({ imageUrl: newImageUrl, content: newContent })
        .eq('id', art.id);
      if (upErr) {
        console.error('❌ Erreur update article', art.id, upErr.message);
      } else {
        updatedCount++;
      }
    }
  }
  return { done: rows.length < (to - from + 1), count: updatedCount };
}

async function main() {
  console.log('--- Migration des images WP -> Supabase Storage ---');
  let from = 0;
  const size = 200;
  let totalUpdated = 0;
  while (true) {
    const to = from + size - 1;
    const { done, count } = await processBatch(from, to);
    totalUpdated += count;
    console.log(`Batch ${from}-${to} terminé. Articles mis à jour: ${count}. Total: ${totalUpdated}`);
    if (done) break;
    from += size;
  }
  console.log(`🎉 Migration terminée. Articles mis à jour: ${totalUpdated}`);
}

main().catch(e => { 
  console.error('Erreur de migration:', e); 
  process.exit(1);
});
