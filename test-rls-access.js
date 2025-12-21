import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://aqbsagaifmtxrrsngbme.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxYnNhZ2FpZm10eHJyc25nYm1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyMjM3NTQsImV4cCI6MjA4MTc5OTc1NH0.7L1Fv3_qk0pQUMyLtshuChZ-mY-R3NGQGvB6gpyCDzc';

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
