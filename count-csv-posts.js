import fs from 'fs';
import path from 'path';

const CSV_PATH = path.resolve(process.cwd(), 'imports', 'wp_posts.csv');
if (!fs.existsSync(CSV_PATH)) {
  console.error('❌ CSV introuvable:', CSV_PATH);
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

const text = fs.readFileSync(CSV_PATH, 'utf8');
const rows = parseCSV(text, ',');
const headers = rows[0] || [];
const idxPostType = headers.findIndex(h => /post type/i.test(h));
const idxStatus = headers.findIndex(h => /status/i.test(h));
let total = 0, posts = 0, published = 0;
for (let i = 1; i < rows.length; i++) {
  const r = rows[i];
  total++;
  const postType = idxPostType >= 0 ? (r[idxPostType]||'').toLowerCase() : '';
  const status = idxStatus >= 0 ? (r[idxStatus]||'').toLowerCase() : '';
  if (postType === 'post') {
    posts++;
    if (status.includes('publish')) published++;
  }
}
console.log(`Lignes CSV totales: ${total}`);
console.log(`Posts (post type = post): ${posts}`);
console.log(`Posts publiés (status=publish): ${published}`);

