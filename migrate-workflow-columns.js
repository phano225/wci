import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://aqbsagaifmtxrrsngbme.supabase.co';
// Service Role Key (allows bypassing RLS, but not DDL without RPC)
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxYnNhZ2FpZm10eHJyc25nYm1lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjIyMzc1NCwiZXhwIjoyMDgxNzk5NzU0fQ.EprIGCnYsX3bivBs6n54rBTxooRSKzc0V1XLTQadGiU';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkAndMigrate() {
  console.log('🔍 Vérification du schéma de la base de données...');

  // Tentative de sélection des nouvelles colonnes
  const { error } = await supabase
    .from('articles')
    .select('submitted_by, submitted_at, submission_status, reviewed_by, reviewed_at, review_comments')
    .limit(1);

  if (error) {
    console.log('❌ Les colonnes semblent manquantes (ou une erreur est survenue).');
    console.log('Message:', error.message);
    
    console.log('\n⚠️ ACTION REQUISE ⚠️');
    console.log('Le client JS Supabase ne permet pas de modifier la structure de la table directement (sécurité).');
    console.log('Veuillez copier/coller le code SQL suivant dans votre Dashboard Supabase > SQL Editor :');
    console.log('\n----------------------------------------------------------------------------------');
    console.log(`
ALTER TABLE articles
ADD COLUMN IF NOT EXISTS submitted_by text,
ADD COLUMN IF NOT EXISTS submitted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS submission_status text DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS reviewed_by text,
ADD COLUMN IF NOT EXISTS reviewed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS review_comments text;
    `);
    console.log('----------------------------------------------------------------------------------\n');
  } else {
    console.log('✅ Les colonnes existent déjà ! Aucune action requise.');
  }
}

checkAndMigrate();
