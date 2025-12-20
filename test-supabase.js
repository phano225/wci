import { supabase } from './supabase-config';

// Test rapide de Supabase
export const testSupabaseConnection = async () => {
  console.log('=== TEST SUPABASE ===');

  try {
    // Test 1: Connexion de base
    console.log('Test 1: Connexion Supabase...');
    const { data: authData, error: authError } = await supabase.auth.getSession();
    console.log('Session actuelle:', authData);
    if (authError) console.error('Erreur auth:', authError);

    // Test 2: Lecture des utilisateurs
    console.log('Test 2: Lecture table users...');
    const { data: users, error: usersError } = await supabase.from('users').select('*');
    console.log('Utilisateurs:', users);
    if (usersError) console.error('Erreur users:', usersError);

    // Test 3: Lecture des articles
    console.log('Test 3: Lecture table articles...');
    const { data: articles, error: articlesError } = await supabase.from('articles').select('*');
    console.log('Articles:', articles);
    if (articlesError) console.error('Erreur articles:', articlesError);

  } catch (error) {
    console.error('Erreur générale:', error);
  }

  console.log('=== FIN TEST ===');
};