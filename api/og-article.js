import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const SITE_URL = 'https://journal.worldcanalinfo.com';

export default async function handler(req, res) {
  const { id } = req.query;
  
  if (!id) {
    return res.status(400).send('Article ID is required');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: article, error } = await supabase
    .from('articles')
    .select('title, excerpt, imageUrl')
    .eq('id', id)
    .single();

  if (error || !article) {
    return res.status(404).send('Article not found');
  }

  // Sécuriser les chaînes pour éviter les injections HTML
  const escapeHtml = (unsafe) => {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const title = escapeHtml(article.title || 'Article WCI');
  const description = escapeHtml(article.excerpt || 'Lisez cet article sur WCI News.');
  
  let imageUrl = article.imageUrl;
  if (imageUrl && !imageUrl.startsWith('http')) {
    // Si l'image est relative, on essaie de construire l'URL complète
    // Supposons que c'est une image stockée localement ou via un chemin relatif
    imageUrl = `${SITE_URL}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
  }
  // Fallback image
  if (!imageUrl) {
    imageUrl = `${SITE_URL}/logo.png`;
  }

  const url = `${SITE_URL}/article/${id}`;

  const html = `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    
    <!-- Open Graph / Facebook / WhatsApp -->
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${url}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:site_name" content="WCI News" />
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${url}" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${imageUrl}" />
    
    <!-- Redirection JS pour les utilisateurs humains qui tomberaient ici par erreur -->
    <script>
      window.location.href = "${url}";
    </script>
  </head>
  <body>
    <h1>${title}</h1>
    <img src="${imageUrl}" alt="${title}" style="max-width:100%; display:none;" />
    <p>${description}</p>
  </body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300'); // Cache court pour les bots
  res.status(200).send(html);
}
