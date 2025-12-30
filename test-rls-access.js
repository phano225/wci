import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function testAccess() {
  console.log('Test accès table users avec clé ANON...');
  const { data, error } = await supabase.from('users').select('*');
  
  if (error) {
    console.error('Erreur:', error);
  } else {
    console.log(`Nombre d'utilisateurs récupérés: ${data.length}`);
    if (data.length === 0) {
      console.log('⚠️ Aucune donnée retournée. Probablement bloqué par RLS (Row Level Security).');
    } else {
      console.log('✅ Accès OK.');
      console.log('Exemple:', data[0]);
    }
  }
}

testAccess();
