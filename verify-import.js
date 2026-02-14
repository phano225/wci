import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Variables manquantes (VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const CSV_PATH = path.resolve(process.cwd(), 'imports', 'wp_posts.csv');
if (!fs.existsSync(CSV_PATH)) {
  console.error(`❌ CSV introuvable: ${CSV_PATH}`);
  process.exit(1);
}

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

function stripHtml(s = '') {
  return s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

async function fetchAllArticlesTitles() {
  const all = [];
  let from = 0;
  const size = 1000;
  // Loop pages
  /* eslint-disable no-constant-condition */
  while (true) {
    const to = from + size - 1;
    const { data, error } = await supabase.from('articles')
      .select('title, createdAt', { count: 'exact' })
      .order('createdAt', { ascending: false })
      .range(from, to);
    if (error) {
      console.error('❌ Erreur Supabase:', error);
      break;
    }
    if (!data || data.length === 0) break;
    all.push(...data.map(d => stripHtml(d.title).toLowerCase()));
    if (data.length < size) break;
    from += size;
  }
  return new Set(all);
}

async function main() {
  console.log('🔎 Vérification import WP');
  const text = fs.readFileSync(CSV_PATH, 'utf8');
  const rows = parseCSV(text, ',');
  const headers = rows[0] || [];
  const titleIdx = headers.findIndex(h => /title/i.test(h));
  const postTypeIdx = headers.findIndex(h => /post type/i.test(h));
  const statusIdx = headers.findIndex(h => /status/i.test(h));
  if (titleIdx === -1) {
    console.error('❌ Colonne Title introuvable dans le CSV');
    process.exit(1);
  }

  let totalCSV = 0;
  const csvTitles = new Set();
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0) continue;
    totalCSV++;
    const postType = postTypeIdx >= 0 ? (r[postTypeIdx] || '').toLowerCase() : '';
    const status = statusIdx >= 0 ? (r[statusIdx] || '').toLowerCase() : '';
    if (postType && postType !== 'post') continue; // garder uniquement les posts
    if (status && !status.includes('publish')) continue; // uniquement publiés pour comparaison
    const title = stripHtml(r[titleIdx] || '').toLowerCase();
    if (title) csvTitles.add(title);
  }

  const dbTitles = await fetchAllArticlesTitles();
  let found = 0;
  const missing = [];
  for (const t of csvTitles) {
    if (dbTitles.has(t)) found++;
    else if (missing.length < 50) missing.push(t);
  }

  console.log('📊 Résumé:');
  console.log(`- Lignes CSV (hors en-tête): ${totalCSV}`);
  console.log(`- Titres uniques dans CSV: ${csvTitles.size}`);
  console.log(`- Titres trouvés en base:  ${found}`);
  console.log(`- Différence estimée:      ${csvTitles.size - found}`);
  if (missing.length) {
    console.log('🔻 Exemples manquants (max 50):');
    missing.forEach((m, i) => console.log(`${i + 1}. ${m}`));
  } else {
    console.log('✅ Aucun titre manquant détecté dans l’échantillon (comparaison titre).');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
