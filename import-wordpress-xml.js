import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { XMLParser } from 'fast-xml-parser';
import crypto from 'crypto';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Variables d’environnement manquantes: VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const XML_PATH = path.resolve(process.cwd(), 'imports', 'WordPress.2026-04-05.xml');
if (!fs.existsSync(XML_PATH)) {
  console.error(`❌ Fichier introuvable: ${XML_PATH}`);
  process.exit(1);
}

async function main() {
  console.log('📥 Lecture du fichier XML:', XML_PATH);
  const xmlData = fs.readFileSync(XML_PATH, 'utf8');

  console.log('⏳ Analyse du XML (cela peut prendre quelques secondes)...');
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    cdataPropName: false, // Parse CDATA directly as text value
    parseTagValue: false, // Don't parse things like IDs as numbers implicitly everywhere
  });
  
  const jsonObj = parser.parse(xmlData);

  if (!jsonObj || !jsonObj.rss || !jsonObj.rss.channel) {
    console.error('❌ Structure XML invalide ou non reconnue comme export WordPress.');
    process.exit(1);
  }

  const channel = jsonObj.rss.channel;
  
  // Extraire les auteurs
  console.log('🧑‍💻 Extraction des auteurs...');
  const authorsMap = {};
  const authors = channel['wp:author'] || [];
  const authorArray = Array.isArray(authors) ? authors : [authors];
  authorArray.forEach(author => {
    const login = author['wp:author_login'];
    const displayName = author['wp:author_display_name'];
    if (login) {
      authorsMap[login] = displayName || login;
    }
  });

  // Extraire les items
  let items = channel.item || [];
  if (!Array.isArray(items)) {
    items = [items];
  }

  console.log(`📦 ${items.length} éléments trouvés dans le XML.`);

  // Créer un dictionnaire des images à la une (attachments)
  console.log('🖼️ Extraction des images...');
  const attachments = {};
  items.forEach(item => {
    if (item['wp:post_type'] === 'attachment') {
      const postId = item['wp:post_id'];
      const url = item['wp:attachment_url'];
      if (postId && url) {
        attachments[postId] = url;
      }
    }
  });

  const posts = items.filter(item => item['wp:post_type'] === 'post');
  console.log(`📝 ${posts.length} articles (posts) à traiter.`);

  // Récupérer les titres existants pour éviter les doublons
  console.log('📡 Récupération des titres existants dans la base de données...');
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
  console.log(`ℹ️ Titres déjà connus en base: ${existingTitles.size}`);

  let imported = 0, skipped = 0, failed = 0;

  // Importer par lots (batch) pour éviter de surcharger Supabase
  const batchSize = 100;
  for (let i = 0; i < posts.length; i += batchSize) {
    const batch = posts.slice(i, i + batchSize);
    const articlesToInsert = [];

    for (const post of batch) {
      let title = post.title;
      if (typeof title === 'object') title = '';
      if (!title || typeof title !== 'string') continue;

      const normalizedTitle = title.replace(/<[^>]*>/g, '').trim().toLowerCase();
      if (existingTitles.has(normalizedTitle)) {
        skipped++;
        continue;
      }

      let content = post['content:encoded'];
      if (typeof content === 'object') content = '';
      
      let excerpt = post['excerpt:encoded'];
      if (typeof excerpt === 'object') excerpt = '';

      const dateRaw = post['wp:post_date'] || post.pubDate;
      
      const statusRaw = post['wp:status'] || 'publish';
      const status = statusRaw === 'publish' ? 'PUBLISHED' : 'DRAFT';

      const creator = post['dc:creator'];
      const authorName = authorsMap[creator] || creator || 'Rédaction WCI';

      let categoryName = '';
      const catNode = post.category;
      if (catNode) {
        const cats = Array.isArray(catNode) ? catNode : [catNode];
        const mainCat = cats.find(c => c['@_domain'] === 'category');
        if (mainCat) {
          categoryName = mainCat['#text'] || mainCat;
        } else if (cats.length > 0 && typeof cats[0] === 'string') {
          categoryName = cats[0];
        }
      }
      if (typeof categoryName === 'object') categoryName = '';

      let thumbId = null;
      let imageUrl = null;
      const metaNode = post['wp:postmeta'];
      if (metaNode) {
        const metas = Array.isArray(metaNode) ? metaNode : [metaNode];
        const thumbMeta = metas.find(m => m['wp:meta_key'] === '_thumbnail_id');
        if (thumbMeta) {
          thumbId = thumbMeta['wp:meta_value'];
        }
      }
      if (thumbId && attachments[thumbId]) {
        imageUrl = attachments[thumbId];
      } else {
        const match = content && typeof content === 'string' ? content.match(/<img[^>]+src="([^">]+)"/) : null;
        if (match) imageUrl = match[1];
      }

      let createdAt;
      if (dateRaw) {
        const d = new Date(dateRaw);
        if (!isNaN(d.getTime())) createdAt = d.toISOString();
      }

      const candidate = {
        id: crypto.randomUUID(),
        title: title.trim(),
        content: content ? String(content).trim() : '',
        excerpt: excerpt ? String(excerpt).trim() : '',
        imageUrl: imageUrl || null,
        category: categoryName || null,
        authorName: String(authorName).trim(),
        status,
        createdAt,
        updatedAt: createdAt,
        views: 0
      };

      const article = Object.fromEntries(
        Object.entries(candidate).filter(([_, v]) => v !== undefined && v !== null && `${v}`.trim() !== '')
      );
      
      articlesToInsert.push(article);
      existingTitles.add(normalizedTitle);
    }

    if (articlesToInsert.length > 0) {
      try {
        const { error } = await supabase.from('articles').insert(articlesToInsert);
        if (error) {
          console.error(`⚠️ Échec batch ${i/batchSize + 1}:`, error.message);
          failed += articlesToInsert.length;
        } else {
          imported += articlesToInsert.length;
          console.log(`✅ ${imported} articles importés...`);
        }
      } catch (e) {
        console.error(`⚠️ Exception batch ${i/batchSize + 1}:`, e.message);
        failed += articlesToInsert.length;
      }
      
      // Pause entre les requêtes pour ne pas surcharger l'API
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log(`\n🎉 Import terminé avec succès !`);
  console.log(`📊 Résultat: ${imported} inséré(s), ${skipped} ignoré(s) (doublons), ${failed} échec(s).`);
}

main().catch(e => {
  console.error('Erreur fatale:', e);
  process.exit(1);
});
