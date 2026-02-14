export default async function handler(req: any, res: any) {
  try {
    const { src } = req.query as { src?: string };
    if (!src) {
      res.status(400).send('Missing src');
      return;
    }
    const decoded = decodeURIComponent(src);
    const url = new URL(decoded);
    if (!/^https?:$/.test(url.protocol)) {
      res.status(400).send('Invalid protocol');
      return;
    }

    const r = await fetch(decoded, {
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://journal.worldcanalinfo.com/',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
    });

    if (!r.ok) {
      res.status(302).setHeader('Location', '/logo.png').end();
      return;
    }

    const type = r.headers.get('content-type') || 'image/jpeg';
    const buf = Buffer.from(await r.arrayBuffer());

    res.setHeader('Content-Type', type);
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    res.status(200).send(buf);
  } catch (e: any) {
    res.status(302).setHeader('Location', '/logo.png').end();
  }
}
