import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Variables d’environnement manquantes: VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const CSV_PATH = path.resolve(process.cwd(), 'imports', 'wp_posts.csv');
if (!fs.existsSync(CSV_PATH)) {
  console.error(`❌ Fichier introuvable: ${CSV_PATH}`);
  process.exit(1);
}

// CSV parser minimal qui gère les guillemets, virgules et retours à la ligne dans les champs
function parseCSV(text, delimiter = ',') {
  const rows = [];
  let cur = '';
  let row = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cur += '"';
        i++; // skip escaped quote
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        row.push(cur);
        cur = '';
      } else if (ch === '\r' && next === '\n') {
        row.push(cur);
        rows.push(row);
        row = [];
        cur = '';
        i++; // skip \n
      } else if (ch === '\n') {
        row.push(cur);
        rows.push(row);
        row = [];
        cur = '';
      } else if (ch === '\r') {
        // handle lone \r
        row.push(cur);
        rows.push(row);
        row = [];
        cur = '';
      } else {
        cur += ch;
      }
    }
  }
  // last cell/row
  row.push(cur);
  if (row.length > 1 || row[0] !== '') rows.push(row);
  return rows;
}

function indexOfHeader(headers, aliases) {
  const lower = headers.map(h => h.trim().toLowerCase());
  for (const a of aliases) {
    const idx = lower.indexOf(a.toLowerCase());
    if (idx !== -1) return idx;
  }
  return -1;
}

async function main() {
  console.log('📥 Lecture du CSV:', CSV_PATH);
  const csvText = fs.readFileSync(CSV_PATH, 'utf8');
  const rows = parseCSV(csvText, ',');
  if (rows.length < 2) {
    console.error('❌ CSV vide ou invalide');
    process.exit(1);
  }

  const headers = rows[0];

  const idx = {
    title: indexOfHeader(headers, ['Title', 'post_title', 'titre']),
    content: indexOfHeader(headers, ['Content', 'post_content', 'contenu']),
    excerpt: indexOfHeader(headers, ['Excerpt', 'post_excerpt', 'extrait']),
    date: indexOfHeader(headers, ['Date', 'post_date', 'published_at']),
    image: indexOfHeader(headers, ['Image URL', 'featured_image', 'Attachment URL', 'Image Featured']),
    category: indexOfHeader(headers, ['Catégories', 'Categories', 'Category']),
    authorFirst: indexOfHeader(headers, ['Author First Name', 'author_first_name']),
    authorLast: indexOfHeader(headers, ['Author Last Name', 'author_last_name']),
    authorUsername: indexOfHeader(headers, ['Author Username', 'author']),
    status: indexOfHeader(headers, ['Status', 'post_status']),
    slug: indexOfHeader(headers, ['Slug', 'post_name']),
    permalink: indexOfHeader(headers, ['Permalink']),
  };

  console.log('🧭 Mapping colonnes:', idx);

  // Charger les titres existants pour éviter les doublons lors des passes multiples
  console.log('📡 Récupération des titres existants...');
  const existingTitles = new Set();
  let from = 0;
  const size = 1000;
  while (true) {
    const to = from + size - 1;
    const { data, error } = await supabase.from('articles')
      .select('title')
      .range(from, to);
    if (error) { console.error('⚠️ Erreur fetch titres existants:', error); break; }
    if (!data || data.length === 0) break;
    data.forEach(d => existingTitles.add((d.title || '').replace(/<[^>]*>/g, '').trim().toLowerCase()));
    if (data.length < size) break;
    from += size;
  }
  console.log(`ℹ️ Titres connus: ${existingTitles.size}`);

  let imported = 0, skipped = 0, failed = 0;
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const title = idx.title >= 0 ? row[idx.title]?.trim() : '';
    if (!title) continue;
    const normalizedTitle = title.replace(/<[^>]*>/g, '').trim().toLowerCase();
    if (existingTitles.has(normalizedTitle)) {
      skipped++;
      continue;
    }
    const content = idx.content >= 0 ? row[idx.content] : '';
    const excerpt = idx.excerpt >= 0 ? row[idx.excerpt] : '';
    const dateRaw = idx.date >= 0 ? row[idx.date] : '';
    const imageUrl = idx.image >= 0 ? row[idx.image] : '';
    const category = idx.category >= 0 ? row[idx.category]?.split(',')[0]?.trim() : '';
    const authorFirst = idx.authorFirst >= 0 ? row[idx.authorFirst] : '';
    const authorLast = idx.authorLast >= 0 ? row[idx.authorLast] : '';
    const authorUser = idx.authorUsername >= 0 ? row[idx.authorUsername] : '';
    const authorName = [authorFirst, authorLast].filter(Boolean).join(' ').trim() || authorUser || 'Rédaction WCI';
    const statusRaw = (idx.status >= 0 ? row[idx.status] : 'publish')?.toLowerCase();
    const status = statusRaw?.includes('publish') ? 'PUBLISHED' : 'DRAFT';
    const slug = idx.slug >= 0 ? row[idx.slug] : undefined;

    let createdAt;
    if (dateRaw) {
      const d = new Date(dateRaw);
      if (!isNaN(d.getTime())) createdAt = d.toISOString();
    }

    const candidate = {
      id: crypto.randomUUID(),
      title,
      content,
      excerpt,
      imageUrl: imageUrl || null,
      category: category || null,
      authorName,
      status,
      createdAt,
      updatedAt: createdAt,
      views: 0
    };
    // Nettoyage: retirer les clés undefined/vides et éviter les colonnes absentes (ex: slug)
    const article = Object.fromEntries(
      Object.entries(candidate).filter(([_, v]) => v !== undefined && v !== null && `${v}`.trim() !== '')
    );

    try {
      const { error } = await supabase.from('articles').insert(article);
      if (error) {
        console.error('⚠️ Échec insert:', title, error);
        failed++;
      } else {
        imported++;
        existingTitles.add(normalizedTitle);
        if (imported % 10 === 0) console.log(`✅ ${imported} articles importés...`);
      }
    } catch (e) {
      console.error('⚠️ Exception insert pour:', title, e);
      failed++;
    }
  }

  console.log(`🎉 Import terminé. ${imported} inséré(s), ${skipped} ignoré(s) (doublons), ${failed} échec(s).`);
}

main().catch(e => {
  console.error('Erreur fatale:', e);
  process.exit(1);
});
