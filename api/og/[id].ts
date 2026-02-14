import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const html = (meta: { title: string; description: string; image: string; url: string }) => `<!doctype html>
<html lang="fr"><head>
<meta charset="utf-8" />
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
<meta http-equiv="Pragma" content="no-cache" />
<meta http-equiv="Expires" content="0" />
<title>${meta.title}</title>
<meta name="description" content="${meta.description}" />
<meta property="og:type" content="article" />
<meta property="og:title" content="${meta.title}" />
<meta property="og:description" content="${meta.description}" />
<meta property="og:image" content="${meta.image}" />
<meta property="og:image:alt" content="${meta.title}" />
<meta property="og:url" content="${meta.url}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${meta.title}" />
<meta name="twitter:description" content="${meta.description}" />
<meta name="twitter:image" content="${meta.image}" />
</head>
<body>
<p>Chargement…</p>
<script>location.replace(${JSON.stringify(meta.url)});</script>
</body></html>`;

export default async function handler(req: any, res: any) {
  try {
    const { id } = req.query as { id?: string };
    const origin = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
    if (!id || !supabase) {
      const fallback = {
        title: 'WCI - L’actualité en continu',
        description: 'Suivez l’actualité en temps réel sur WCI.',
        image: `${origin}/logo.png`,
        url: `${origin}/`
      };
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(200).send(html(fallback));
      return;
    }

    const { data, error } = await supabase.from('articles').select('*').eq('id', id).single();
    if (error || !data) {
      const fallback = {
        title: 'WCI - L’actualité en continu',
        description: 'Suivez l’actualité en temps réel sur WCI.',
        image: `${origin}/logo.png`,
        url: `${origin}/`
      };
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(200).send(html(fallback));
      return;
    }

    const title = data.title || 'WCI';
    const description = data.excerpt || '';
    const image = (data.imageUrl && String(data.imageUrl).startsWith('http'))
      ? data.imageUrl
      : `${origin}${data.imageUrl ? (data.imageUrl.startsWith('/') ? '' : '/') + data.imageUrl : '/logo.png'}`;
    const url = `${origin}/article/${id}`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html({ title, description, image, url }));
  } catch (e: any) {
    const origin = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html({
      title: 'WCI - L’actualité en continu',
      description: 'Suivez l’actualité en temps réel sur WCI.',
      image: `${origin}/logo.png`,
      url: `${origin}/`
    }));
  }
}
