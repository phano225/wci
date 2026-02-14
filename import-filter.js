import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const targets = process.argv.slice(2).map(t => t.toLowerCase());
if (targets.length === 0) {
  console.error('Usage: node import-filter.js \"titre 1\" \"titre 2\"');
  process.exit(1);
}

const CSV_PATH = path.resolve(process.cwd(), 'imports', 'wp_posts.csv');
const text = fs.readFileSync(CSV_PATH, 'utf8');

function parseCSV(text, delimiter = ',') {
  const rows = [];
  let cur = '';
  let row = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') { cur += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { cur += ch; }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === delimiter) { row.push(cur); cur = ''; }
      else if (ch === '\r' && next === '\n') { row.push(cur); rows.push(row); row = []; cur=''; i++; }
      else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur=''; }
      else if (ch === '\r') { row.push(cur); rows.push(row); row = []; cur=''; }
      else { cur += ch; }
    }
  }
  row.push(cur);
  if (row.length > 1 || row[0] !== '') rows.push(row);
  return rows;
}
function stripHtml(s=''){return s.replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();}

const rows = parseCSV(text, ',');
const headers = rows[0];
const idx = {
  title: headers.findIndex(h => /title/i.test(h)),
  content: headers.findIndex(h => /content/i.test(h)),
  excerpt: headers.findIndex(h => /excerpt/i.test(h)),
  date: headers.findIndex(h => /^date$/i.test(h)),
  image: headers.findIndex(h => /image url|image featured|attachment url/i.test(h)),
  category: headers.findIndex(h => /catégories|categories|category/i.test(h)),
  status: headers.findIndex(h => /status/i.test(h)),
  postType: headers.findIndex(h => /post type/i.test(h)),
};

(async () => {
  let inserted = 0;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const postType = (r[idx.postType] || '').toLowerCase();
    const status = (r[idx.status] || '').toLowerCase();
    if (postType !== 'post' || !status.includes('publish')) continue;
    const rawTitle = r[idx.title] || '';
    const normTitle = stripHtml(rawTitle).toLowerCase();
    if (!targets.some(t => normTitle.includes(t))) continue;
    const article = {
      id: crypto.randomUUID(),
      title: stripHtml(rawTitle),
      content: r[idx.content] || '',
      excerpt: r[idx.excerpt] || '',
      imageUrl: r[idx.image] || null,
      category: (r[idx.category] || '').split(',')[0]?.trim() || null,
      authorName: 'Import WP',
      status: 'PUBLISHED',
      createdAt: r[idx.date] ? new Date(r[idx.date]).toISOString() : undefined,
      updatedAt: r[idx.date] ? new Date(r[idx.date]).toISOString() : undefined,
      views: 0
    };
    const cleaned = Object.fromEntries(Object.entries(article).filter(([_,v]) => v !== undefined && v !== null && `${v}`.trim() !== ''));
    const { error } = await supabase.from('articles').insert(cleaned);
    if (error) console.error('Erreur insert', cleaned.title, error);
    else { inserted++; console.log('✅ Inséré:', cleaned.title); }
  }
  console.log(`Fini. ${inserted} article(s) inséré(s).`);
})(); 
