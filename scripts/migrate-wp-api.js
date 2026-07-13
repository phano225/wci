import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Load environment variables manually or rely on `process.env` passed via CLI
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_KEY || 'YOUR_SUPABASE_SERVICE_KEY';

if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_SERVICE_KEY === 'YOUR_SUPABASE_SERVICE_KEY') {
  console.error("Veuillez fournir VITE_SUPABASE_URL et VITE_SUPABASE_SERVICE_KEY (clé Service Role, pas l'anon key) !");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const WP_API_URL = 'https://worldcanalinfo.com/wp-json/wp/v2';
const BUCKET_NAME = 'wci-media';

// Aide pour uploader l'image dans Supabase Storage
async function uploadImageToSupabase(imageUrl, slug) {
  try {
    if (!imageUrl) return null;
    console.log(`Téléchargement de l'image depuis ${imageUrl}...`);
    const res = await fetch(imageUrl);
    if (!res.ok) {
      console.warn(`Impossible de télécharger l'image: ${imageUrl}`);
      return null;
    }
    const buffer = await res.arrayBuffer();
    
    // Déterminer l'extension
    const extMatch = imageUrl.match(/\.([a-zA-Z0-9]+)(\?|$)/);
    const ext = extMatch ? extMatch[1] : 'jpg';
    const filename = `${slug}-${Date.now()}.${ext}`;
    
    console.log(`Upload vers Supabase Storage: ${filename}...`);
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, buffer, {
        contentType: res.headers.get('content-type') || 'image/jpeg',
        upsert: true
      });
      
    if (error) {
      console.error(`Erreur d'upload: ${error.message}`);
      return null;
    }
    
    const publicUrl = supabase.storage.from(BUCKET_NAME).getPublicUrl(filename).data.publicUrl;
    return publicUrl;
  } catch (err) {
    console.error(`Erreur lors du traitement de l'image ${imageUrl}: ${err.message}`);
    return null;
  }
}

// Fonction pour remplacer les images dans le contenu HTML
async function processHtmlContent(html, slug) {
  if (!html) return '';
  const imgRegex = /<img[^>]+src="([^">]+)"/g;
  let newHtml = html;
  let match;
  
  // On trouve toutes les URLs d'images uniques
  const imageUrls = new Set();
  while ((match = imgRegex.exec(html)) !== null) {
    imageUrls.add(match[1]);
  }
  
  for (const url of imageUrls) {
    // Si c'est une image de worldcanalinfo.com
    if (url.includes('worldcanalinfo.com')) {
      const supabaseUrl = await uploadImageToSupabase(url, `${slug}-content`);
      if (supabaseUrl) {
        newHtml = newHtml.split(url).join(supabaseUrl);
      }
    }
  }
  return newHtml;
}

async function runMigration() {
  console.log("=== Début de la migration WordPress ===");
  
  // 1. Vider les anciennes données (articles et utilisateurs)
  console.log("Suppression des articles, catégories et auteurs existants...");
  await supabase.from('articles').delete().neq('id', 'dummy');
  await supabase.from('categories').delete().neq('id', 'dummy');
  await supabase.from('users').delete().neq('id', 'dummy');
  
  // 2. Importer les catégories
  console.log("--- Importation des catégories ---");
  const catRes = await fetch(`${WP_API_URL}/categories?per_page=100`);
  const wpCategories = await catRes.json();
  const categoryMap = {};
  
  for (const wpCat of wpCategories) {
    const category = {
      id: wpCat.id.toString(),
      name: wpCat.name,
      slug: wpCat.slug
    };
    categoryMap[wpCat.id] = wpCat.name;
    const { error } = await supabase.from('categories').insert(category);
    if (error) console.error("Erreur insertion catégorie:", error.message);
  }
  
  // 3. Importer les auteurs (Users)
  console.log("--- Importation des auteurs ---");
  const authorRes = await fetch(`${WP_API_URL}/users?per_page=100`);
  const wpAuthors = await authorRes.json();
  const authorMap = {};
  
  for (const wpUser of wpAuthors) {
    // Upload de l'avatar si disponible (les avatars WP sont souvent dans un objet avatar_urls)
    let avatarUrl = wpUser.avatar_urls ? Object.values(wpUser.avatar_urls)[0] : '';
    if (avatarUrl && avatarUrl.includes('worldcanalinfo.com')) {
       avatarUrl = await uploadImageToSupabase(avatarUrl, `avatar-${wpUser.slug}`) || avatarUrl;
    }
    
    const newId = crypto.randomUUID();
    const user = {
      id: newId,
      name: wpUser.name,
      email: `${wpUser.slug}@worldcanalinfo.com`, // Fake email car l'API REST cache souvent les emails
      role: 'CONTRIBUTOR',
      avatar: avatarUrl
    };
    authorMap[wpUser.id] = user;
    const { error } = await supabase.from('users').insert(user);
    if (error) console.error("Erreur insertion auteur:", error.message);
  }
  
  // 4. Importer les articles (Posts)
  console.log("--- Importation des articles ---");
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    console.log(`Récupération de la page ${page} des articles...`);
    const postRes = await fetch(`${WP_API_URL}/posts?per_page=10&page=${page}&_embed=1`);
    if (!postRes.ok) {
      if (postRes.status === 400) hasMore = false; // Plus d'articles
      break;
    }
    const wpPosts = await postRes.json();
    if (wpPosts.length === 0) break;
    
    for (const wpPost of wpPosts) {
      console.log(`Traitement de l'article : ${wpPost.slug}`);
      
      // Récupérer l'image mise en avant
      let featuredImageUrl = '';
      if (wpPost._embedded && wpPost._embedded['wp:featuredmedia']) {
        const media = wpPost._embedded['wp:featuredmedia'][0];
        featuredImageUrl = media?.source_url || '';
      }
      
      let imageUrl = null;
      if (featuredImageUrl) {
        imageUrl = await uploadImageToSupabase(featuredImageUrl, wpPost.slug);
      }
      
      // Traitement du contenu HTML
      const content = await processHtmlContent(wpPost.content.rendered, wpPost.slug);
      
      // Catégorie et Auteur
      const catName = (wpPost.categories && wpPost.categories.length > 0) ? categoryMap[wpPost.categories[0]] : 'Général';
      const author = authorMap[wpPost.author] || { id: 'unknown', name: 'Inconnu', avatar: '' };
      
      const article = {
        id: wpPost.id.toString(),
        title: wpPost.title.rendered,
        slug: wpPost.slug,
        excerpt: wpPost.excerpt.rendered.replace(/<[^>]+>/g, ''), // Strip HTML
        content: content,
        category: catName || 'Général',
        imageUrl: imageUrl,
        authorId: author.id,
        authorName: author.name,
        authorAvatar: author.avatar,
        status: 'PUBLISHED',
        createdAt: wpPost.date,
        views: 0
      };
      
      const { error } = await supabase.from('articles').insert(article);
      if (error) console.error(`Erreur insertion article ${wpPost.slug}:`, error.message);
    }
    
    page++;
  }
  
  console.log("=== Migration terminée ! ===");
}

runMigration().catch(console.error);
