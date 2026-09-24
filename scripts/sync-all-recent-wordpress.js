import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Clés Supabase manquantes.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const WP_API_URL = 'https://worldcanalinfo.com/wp-json/wp/v2';
const BUCKET_NAME = 'wci-media';

// Récupération du cache des catégories
async function getCategoriesMap() {
  const { data: cats } = await supabase.from('categories').select('id, name');
  const map = {};
  cats?.forEach(c => {
    map[c.id] = c.name;
  });
  return map;
}

// Récupération du cache des auteurs
async function getAuthorsMap() {
  const { data: users } = await supabase.from('users').select('id, name, avatar');
  const map = {};
  users?.forEach(u => {
    map[u.name.toLowerCase().trim()] = u;
  });
  return map;
}

// Téléchargement, conversion WebP et upload Supabase
async function processAndUploadImage(imageUrl, slug) {
  if (!imageUrl || !imageUrl.startsWith('http')) return null;

  try {
    const res = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!res.ok) {
      console.warn(`    ⚠️ Image non accessible (${res.status}): ${imageUrl}`);
      return null;
    }

    const inputBuffer = Buffer.from(await res.arrayBuffer());

    // Compression WebP
    const webpBuffer = await sharp(inputBuffer)
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 80, effort: 4 })
      .toBuffer();

    const cleanSlug = (slug || 'img').replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 45);
    const fileName = `${cleanSlug}-${Date.now()}.webp`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, webpBuffer, {
        contentType: 'image/webp',
        upsert: true
      });

    if (uploadError) {
      console.error(`    ❌ Erreur upload Supabase: ${uploadError.message}`);
      return null;
    }

    const { data: publicData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    return publicData.publicUrl;
  } catch (err) {
    console.error(`    ⚠️ Erreur conversion image: ${err.message}`);
    return null;
  }
}

// Traitement des images du corps d'article HTML
async function processContentImages(html, slug) {
  if (!html) return '';
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/g;
  let newHtml = html;
  let match;
  const urls = new Set();

  while ((match = imgRegex.exec(html)) !== null) {
    const url = match[1];
    if (url.includes('worldcanalinfo.com')) {
      urls.add(url);
    }
  }

  for (const wpImgUrl of urls) {
    const newWebpUrl = await processAndUploadImage(wpImgUrl, `${slug}-inline`);
    if (newWebpUrl) {
      newHtml = newHtml.split(wpImgUrl).join(newWebpUrl);
    }
  }

  return newHtml;
}

async function syncAllRecentPosts() {
  console.log('🚀 === DÉBUT DE LA SYNCHRONISATION COMPLÈTE EN WEBP ===\n');

  const catMap = await getCategoriesMap();
  const authorMap = await getAuthorsMap();

  let page = 1;
  let hasMore = true;
  let importedCount = 0;
  let skippedCount = 0;

  while (hasMore) {
    console.log(`\n📄 Récupération de la page ${page}...`);
    let res;
    try {
      res = await fetch(`${WP_API_URL}/posts?per_page=20&page=${page}&_embed=1`);
    } catch (e) {
      console.error('Erreur réseau WP:', e.message);
      await new Promise(r => setTimeout(r, 3000));
      continue;
    }

    if (!res.ok) {
      if (res.status === 400) {
        console.log('🏁 Plus d’articles à récupérer (fin des pages).');
      } else {
        console.error(`Erreur HTTP WordPress : ${res.status}`);
      }
      break;
    }

    const posts = await res.json();
    if (!posts || posts.length === 0) {
      break;
    }

    let pageSkipped = 0;

    for (const post of posts) {
      const postIdStr = post.id.toString();

      // Vérifier si l'article est déjà dans Supabase
      const { data: existing } = await supabase
        .from('articles')
        .select('id')
        .eq('id', postIdStr)
        .maybeSingle();

      if (existing) {
        skippedCount++;
        pageSkipped++;
        process.stdout.write(`.`);
        continue;
      }

      console.log(`\n[#${importedCount + 1}] Importation de : "${post.title.rendered.substring(0, 60)}..." (ID: ${post.id})`);

      // 1. Image à la une en WebP
      let featuredImageUrl = '';
      if (post._embedded && post._embedded['wp:featuredmedia']) {
        const media = post._embedded['wp:featuredmedia'][0];
        featuredImageUrl = media?.source_url || '';
      }

      let webpImageUrl = null;
      if (featuredImageUrl) {
        webpImageUrl = await processAndUploadImage(featuredImageUrl, post.slug);
      }

      // 2. Contenu avec images WebP
      const processedContent = await processContentImages(post.content.rendered, post.slug);

      // 3. Catégorie
      const catId = post.categories?.[0]?.toString();
      const categoryName = catMap[catId] || 'Général';

      // 4. Auteur
      const wpAuthorName = post._embedded?.author?.[0]?.name || 'Rédaction';
      const authorProfile = authorMap[wpAuthorName.toLowerCase().trim()];

      const articleData = {
        id: postIdStr,
        title: post.title.rendered,
        slug: post.slug,
        excerpt: post.excerpt?.rendered?.replace(/<[^>]+>/g, '').trim() || '',
        content: processedContent,
        category: categoryName,
        imageUrl: webpImageUrl || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
        authorId: authorProfile?.id || '0f7bc316-27b3-4807-90eb-282dcdc91435',
        authorName: authorProfile?.name || wpAuthorName,
        authorAvatar: authorProfile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(wpAuthorName)}&background=random`,
        status: 'PUBLISHED',
        views: 0,
        createdAt: post.date,
        updatedAt: post.modified || post.date
      };

      const { error: insertError } = await supabase.from('articles').insert(articleData);
      if (insertError) {
        console.error(`  ❌ Erreur insertion: ${insertError.message}`);
      } else {
        importedCount++;
        console.log(`  ✅ Importé avec succès en WebP !`);
      }
    }

    // Si tous les articles de la page étaient déjà présents, on a rattrapé l'historique
    if (pageSkipped === posts.length) {
      console.log(`\n\n🎯 Tous les articles de cette page existent déjà. Rattrapage terminé !`);
      break;
    }

    page++;
    // Petite pause de 500ms entre les pages pour soulager le serveur
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n========================================`);
  console.log(`✨ SYNCHRONISATION TERMINÉE !`);
  console.log(`- Nouveaux articles importés : ${importedCount}`);
  console.log(`- Articles déjà existants ignorés : ${skippedCount}`);
  console.log(`========================================\n`);
}

syncAllRecentPosts().catch(console.error);
