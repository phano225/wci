import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Variables manquantes (VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const MAP = {
  'SOCIETE': 'Société',
  'SANTE': 'Santé',
  'ECONOMIE': 'Économie',
  'ECONOMIE ': 'Économie',
  'AFRIQUE & MONDE': 'Afrique & Monde',
  'AFRIQUE &AMP; MONDE': 'Afrique & Monde',
  'AFRIQUE ET MONDE': 'Afrique & Monde',
  'INTERNATIONAL': 'International',
  'POLITIQUE': 'Politique',
  'SPORT': 'Sport',
  'CULTURE': 'Culture',
  'FAITS DIVERS': 'Faits Divers',
  'FAITS DIVERS|SANTE': 'Faits Divers',
  'SOCIETE|VIDEODROME': 'Société',
};

function toSlug(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function fetchDistinctArticleCategories() {
  // Supabase distinct
  const { data, error } = await supabase
    .from('articles')
    .select('category', { head: false })
    .not('category', 'is', null);
  if (error) { console.error('❌ Erreur lecture articles:', error); return []; }
  const set = new Set();
  for (const row of data) {
    const raw = (row.category || '').toString().trim();
    if (!raw) continue;
    set.add(raw);
  }
  return Array.from(set);
}

async function fetchExistingCategories() {
  const { data, error } = await supabase.from('categories').select('*');
  if (error) { console.error('❌ Erreur lecture categories:', error); return []; }
  return data || [];
}

import crypto from 'crypto';

async function upsertCategories(names) {
  let inserted = 0, skipped = 0;
  for (const name of names) {
    const row = { id: crypto.randomUUID(), name, slug: toSlug(name) };
    const { error } = await supabase.from('categories').insert(row);
    if (error) {
      // Code 23505 = unique violation -> déjà présent
      if (error.code === '23505') {
        skipped++;
      } else {
        console.error('❌ Erreur insert catégorie:', name, error);
      }
    } else {
      inserted++;
    }
  }
  console.log(`✅ Catégories: ${inserted} insérées, ${skipped} ignorées (existaient déjà)`);
}

async function normalizeArticleCategories(mapping) {
  let updated = 0;
  for (const [fromRaw, to] of Object.entries(mapping)) {
    const candidates = [fromRaw, fromRaw.replace('&', '&amp;')];
    for (const cand of candidates) {
      const { error, count } = await supabase
        .from('articles')
        .update({ category: to })
        .eq('category', cand)
        .select('*', { count: 'exact', head: true });
      if (error) {
        console.error(`⚠️ Erreur MAJ "${cand}" -> "${to}":`, error);
      } else if (count) {
        updated += count;
        console.log(`↪︎ ${count} article(s): ${cand} → ${to}`);
      }
    }
  }
  console.log(`✅ Normalisation catégories terminée. ${updated} article(s) mis à jour.`);
}

(async () => {
  const rawCats = await fetchDistinctArticleCategories();
  // Appliquer le mapping pour la normalisation
  const normalized = new Set();
  for (const c of rawCats) {
    const key = c.trim().toUpperCase();
    const mapped = MAP[key] || c.trim();
    normalized.add(mapped);
  }
  // Ajouter quelques rubriques standards si absentes
  ['Politique','Société','Économie','International','Sport','Culture','Faits Divers'].forEach(n => normalized.add(n));
  await upsertCategories(Array.from(normalized));
  await normalizeArticleCategories(MAP);
})(); 
