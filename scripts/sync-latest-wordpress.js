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

// Fonction pour télécharger, convertir en WebP et uploader sur Supabase Storage
async function processAndUploadImage(imageUrl, slug) {
  if (!imageUrl || !imageUrl.startsWith('http')) return null;

  try {
    const res = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WCIBot/1.0)'
      }
    });

    if (!res.ok) {
      console.warn(`    ⚠️ Impossible de télécharger l'image (${res.status}): ${imageUrl}`);
      return null;
    }

    const inputBuffer = Buffer.from(await res.arrayBuffer());

    // Conversion et compression en WebP via Sharp
    const webpBuffer = await sharp(inputBuffer)
      .resize({ width: 1600, withoutEnlargement: true }) // Évite les images démesurées
      .webp({ quality: 80 })
      .toBuffer();

    const cleanSlug = slug.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 50);
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
    console.error(`    ⚠️ Erreur conversion/upload image (${imageUrl}):`, err.message);
    return null;
  }
}

// Fonction pour traiter les images contenues dans le corps du texte HTML
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

// Test d'import sur 2 articles récents pour valider le pipeline
async function testSync() {
  console.log('=== TEST DE SYNCHRONISATION (2 ARTICLES RÉCENTS EN WEBP) ===');

  const catMap = await getCategoriesMap();
  const authorMap = await getAuthorsMap();

  console.log('Catégories en base:', Object.keys(catMap).length);
  console.log('Auteurs en base:', Object.keys(authorMap).length);

  const res = await fetch(`${WP_API_URL}/posts?per_page=2&_embed=1`);
  const posts = await res.json();

  for (const post of posts) {
    console.log(`\nTraitement article WP ID ${post.id}: "${post.title.rendered}"`);

    // Vérifier si existe déjà
    const { data: existing } = await supabase
      .from('articles')
      .select('id')
      .eq('id', post.id.toString())
      .maybeSingle();

    if (existing) {
      console.log(`  -> Déjà présent dans Supabase (ID: ${post.id}).`);
      continue;
    }

    // Récupérer l'image à la une
    let featuredImageUrl = '';
    if (post._embedded && post._embedded['wp:featuredmedia']) {
      const media = post._embedded['wp:featuredmedia'][0];
      featuredImageUrl = media?.source_url || '';
    }

    let webpImageUrl = null;
    if (featuredImageUrl) {
      console.log(`  -> Conversion WebP de l'image à la une...`);
      webpImageUrl = await processAndUploadImage(featuredImageUrl, post.slug);
      console.log(`  ✅ Image WebP créée : ${webpImageUrl}`);
    }

    // Traitement du contenu
    const processedContent = await processContentImages(post.content.rendered, post.slug);

    // Détermination de la catégorie
    const catId = post.categories?.[0]?.toString();
    const categoryName = catMap[catId] || 'Général';

    // Auteur
    const wpAuthorName = post._embedded?.author?.[0]?.name || 'Rédaction';
    const authorProfile = authorMap[wpAuthorName.toLowerCase().trim()];

    const articleData = {
      id: post.id.toString(),
      title: post.title.rendered,
      slug: post.slug,
      excerpt: post.excerpt?.rendered?.replace(/<[^>]+>/g, '').trim() || '',
      content: processedContent,
      category: categoryName,
      imageUrl: webpImageUrl || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
      authorId: authorProfile?.id || '0f7bc316-27b3-4807-90eb-282dcdc91435', // Fallback sur Parfait KOFFI
      authorName: authorProfile?.name || wpAuthorName,
      authorAvatar: authorProfile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(wpAuthorName)}&background=random`,
      status: 'PUBLISHED',
      views: 0,
      createdAt: post.date,
      updatedAt: post.modified || post.date
    };

    const { error: insertError } = await supabase.from('articles').insert(articleData);
    if (insertError) {
      console.error(`  ❌ Erreur insertion article ${post.id}:`, insertError.message);
    } else {
      console.log(`  🎉 Article ${post.id} inséré avec succès dans Supabase !`);
    }
  }

  console.log('\n=== Test terminé avec succès ! ===');
}

testSync().catch(console.error);
