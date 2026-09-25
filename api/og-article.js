import { createClient } from '@supabase/supabase-js';
import sanitizeHtml from 'sanitize-html';
import { decode } from 'html-entities';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const SITE_URL = 'https://journal.worldcanalinfo.com';

const escapeAttr = (str) => {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

const proxify = (u) => {
  if (!u) return u;
  try {
    const parsed = new URL(u);
    if (parsed.hostname.includes('worldcanalinfo.com') && parsed.pathname.startsWith('/wp-content/')) {
      const base = `${parsed.hostname}${parsed.pathname}${parsed.search}`;
      const params = new URLSearchParams();
      params.set('fit', 'cover');
      params.set('w', '1200');
      params.set('h', '630');
      const query = params.toString();
      return `https://images.weserv.nl/?url=${encodeURIComponent(base)}${query ? `&${query}` : ''}`;
    }
    return u;
  } catch {
    return u;
  }
};

const validateId = (id) => {
  if (!id || typeof id !== 'string') return null;
  const trimmed = id.trim();
  // Valid article ID is alphanumeric / integer
  if (/^[a-zA-Z0-9_-]{1,64}$/.test(trimmed)) {
    return trimmed;
  }
  return null;
};

const validateStringParam = (param, maxLength = 500) => {
  if (!param || typeof param !== 'string') return '';
  return param.slice(0, maxLength);
};

export default async function handler(req, res) {
  if (!req || !req.query) {
    return res.status(400).send('Invalid request');
  }

  const rawId = req.query.id;
  const id = validateId(rawId);
  
  if (!id) {
    return res.status(400).send('Valid article ID is required');
  }

  const qTitle = validateStringParam(req.query.title, 300);
  const qDesc = validateStringParam(req.query.desc, 1000);
  const qImage = validateStringParam(req.query.image, 2048);

  const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;
  let article = null;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('id', id)
        .single();
      if (!error && data) {
        article = data;
      }
    } catch (e) {
      console.error('Error fetching article for OG:', e);
    }
  }

  // Fallbacks if not in supabase
  const rawTitle = article?.title || qTitle || 'WCI - L’actualité en continu';
  const rawDesc = article?.excerpt || qDesc || 'Suivez l’actualité en temps réel sur WCI. Articles, vidéos et reportages exclusifs.';

  // Strip html tags, then decode HTML entities for clean reading
  const cleanTitle = decode(sanitizeHtml(rawTitle, { allowedTags: [], allowedAttributes: {} })).trim();
  const cleanDesc = decode(sanitizeHtml(rawDesc, { allowedTags: [], allowedAttributes: {} })).trim();

  // Determine image
  let imageUrl = article?.ogImageUrl || article?.coverUrl || article?.thumbnailUrl || article?.imageUrl || qImage;
  if (!imageUrl && article?.content) {
    const m = article.content.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (m) imageUrl = m[1];
  }

  if (imageUrl && !imageUrl.startsWith('http')) {
    imageUrl = `${SITE_URL}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
  }
  if (!imageUrl) {
    imageUrl = `${SITE_URL}/logo.png`;
  }

  imageUrl = proxify(imageUrl);

  let imageType = 'image/jpeg';
  if (imageUrl.includes('.webp')) {
    imageType = 'image/webp';
  } else if (imageUrl.includes('.png')) {
    imageType = 'image/png';
  }

  const url = `${SITE_URL}/article/${id}`;
  const attrTitle = escapeAttr(cleanTitle);
  const attrDesc = escapeAttr(cleanDesc);

  const html = `<!DOCTYPE html>
<html lang="fr" prefix="og: http://ogp.me/ns#">
  <head>
    <meta charset="utf-8" />
    <title>${attrTitle}</title>
    <meta name="description" content="${attrDesc}" />
    
    <!-- Open Graph / Facebook / WhatsApp -->
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="WCI - L'actualité en continu" />
    <meta property="og:url" content="${url}" />
    <meta property="og:title" content="${attrTitle}" />
    <meta property="og:description" content="${attrDesc}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:secure_url" content="${imageUrl}" />
    <meta property="og:image:type" content="${imageType}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${attrTitle}" />
    <link rel="image_src" href="${imageUrl}" />
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@WCI" />
    <meta name="twitter:url" content="${url}" />
    <meta name="twitter:title" content="${attrTitle}" />
    <meta name="twitter:description" content="${attrDesc}" />
    <meta name="twitter:image" content="${imageUrl}" />
    
    <link rel="canonical" href="${url}" />
  </head>
  <body>
    <h1>${cleanTitle}</h1>
    <p>${cleanDesc}</p>
    <img src="${imageUrl}" alt="${attrTitle}" style="max-width:100%;" />
    <!-- Redirection automatique pour les utilisateurs humains -->
    <script>
      window.location.replace("${url}");
    </script>
    <noscript>
      <meta http-equiv="refresh" content="0;url=${url}" />
      <p><a href="${url}">Cliquez ici pour lire l'article</a></p>
    </noscript>
  </body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(html);
}
