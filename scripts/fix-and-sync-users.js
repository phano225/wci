import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Clés Supabase manquantes dans .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function fixAndSyncUsers() {
  console.log('=== 1. SYNCHRONISATION DES UTILISATEURS AUTH <-> PUBLIC ===');

  // 1. Récupérer les comptes Auth
  const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.error('Erreur Auth:', authError);
    return;
  }
  console.log(`Comptes Auth trouvés: ${authUsers.length}`);

  for (const authUser of authUsers) {
    console.log(`\nTraitement du compte : ${authUser.email} (Auth ID: ${authUser.id})`);
    
    // Rechercher dans public.users tous les enregistrements avec cet email
    const { data: publicProfiles, error: fetchErr } = await supabase
      .from('users')
      .select('*')
      .eq('email', authUser.email);

    if (fetchErr) {
      console.error(`Erreur recherche profil pour ${authUser.email}:`, fetchErr.message);
      continue;
    }

    const exactMatch = publicProfiles?.find(p => p.id === authUser.id);
    const oldProfiles = publicProfiles?.filter(p => p.id !== authUser.id) || [];

    // Si des anciens profils existent avec des ID différents, réassigner leurs articles vers le bon Auth ID
    for (const oldProfile of oldProfiles) {
      console.log(`  -> Réassignation des articles de l'ancien ID (${oldProfile.id}) vers l'ID Auth (${authUser.id})...`);
      
      const { error: artUpdateErr } = await supabase
        .from('articles')
        .update({ authorId: authUser.id })
        .eq('authorId', oldProfile.id);

      if (artUpdateErr) {
        console.error(`  ⚠️ Erreur mise à jour articles: ${artUpdateErr.message}`);
      } else {
        console.log(`  ✅ Articles réassignés avec succès.`);
      }

      // Supprimer l'ancien profil dupliqué
      const { error: delErr } = await supabase
        .from('users')
        .delete()
        .eq('id', oldProfile.id);

      if (delErr) {
        console.error(`  ⚠️ Erreur suppression ancien profil ${oldProfile.id}:`, delErr.message);
      } else {
        console.log(`  🗑️ Ancien profil dupliqué supprimé.`);
      }
    }

    // Déterminer les métadonnées du profil
    const role = (authUser.email.includes('admin') || authUser.email.includes('koffi')) ? 'ADMIN' : (authUser.user_metadata?.role || 'EDITOR');
    const name = exactMatch?.name || oldProfiles[0]?.name || authUser.user_metadata?.name || authUser.email.split('@')[0];
    const avatar = exactMatch?.avatar || oldProfiles[0]?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;

    const profileData = {
      id: authUser.id,
      email: authUser.email,
      name: name,
      role: role,
      avatar: avatar,
      active: true
    };

    const { error: upsertErr } = await supabase.from('users').upsert(profileData);
    if (upsertErr) {
      console.error(`  ❌ Erreur upsert profil ${authUser.email}:`, upsertErr.message);
    } else {
      console.log(`  ✅ Profil public synchronisé (Rôle: ${role}, Nom: ${name}).`);
    }
  }

  console.log('\n=== Synchronisation des utilisateurs terminée avec succès ! ===');
}

fixAndSyncUsers().catch(console.error);
