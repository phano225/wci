import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
// WARNING: This script requires SERVICE_ROLE_KEY which should be in .env
// DO NOT COMMIT .env TO GITHUB
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; 

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function syncUsers() {
  console.log('🔄 SYNCHRONISATION DES IDs UTILISATEURS...');

  // 1. Récupérer les utilisateurs de Auth
  const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.error('Erreur Auth:', authError);
    return;
  }
  console.log(`Trouvé ${authUsers.length} utilisateurs dans Auth.`);

  // 2. Récupérer les utilisateurs de la table public.users
  const { data: publicUsers, error: publicError } = await supabase.from('users').select('*');
  if (publicError) {
    console.error('Erreur Public:', publicError);
    return;
  }
  console.log(`Trouvé ${publicUsers.length} profils dans public.users.`);

  // 3. Mettre à jour les profils publics avec les bons IDs
  for (const authUser of authUsers) {
    const publicUser = publicUsers.find(u => u.email === authUser.email);
    
    if (publicUser) {
      console.log(`\nTraitement de ${authUser.email}...`);
      if (publicUser.id !== authUser.id) {
        console.log(`⚠️ ID différent ! Public: ${publicUser.id} vs Auth: ${authUser.id}`);
        console.log(`Mise à jour de l'ID dans public.users et des références...`);

        // Stratégie révisée (pour éviter l'erreur de contrainte unique sur l'email)
        // 1. Mettre à jour l'email de l'ancien profil temporairement (ex: admin@old.com)
        // 2. Créer le nouveau profil avec le bon ID et le bon email
        // 3. Migrer les articles
        // 4. Supprimer l'ancien profil

        console.log('Renommage temporaire de l\'ancien profil...');
        const { error: renameError } = await supabase
            .from('users')
            .update({ email: `old_${publicUser.email}` })
            .eq('id', publicUser.id);

        if (renameError) {
            console.error('Erreur renommage:', renameError);
            continue;
        }

        const newProfile = { ...publicUser, id: authUser.id };
        // Remove DB generated fields if any, except if we want to keep data
        // But ID is changed.
        
        // 1. Insérer le profil avec le bon ID
        const { error: insertError } = await supabase.from('users').upsert(newProfile);
        
        if (insertError) {
          console.error('Erreur création nouveau profil:', insertError);
          // Revert rename if possible?
        } else {
          console.log('✅ Nouveau profil créé avec le bon UUID.');
          
          // 2. Mettre à jour les articles de l'ancien auteur
          // Note: On utilise l'ancien ID pour trouver les articles
          const { error: updateArticlesError } = await supabase
            .from('articles')
            .update({ authorid: authUser.id }) 
            .eq('authorid', publicUser.id);
            
          if (updateArticlesError) {
             console.error('Erreur migration articles:', updateArticlesError);
          } else {
             console.log('✅ Articles mis à jour.');
          }

          // 3. Supprimer l'ancien profil
          const { error: deleteError } = await supabase
            .from('users')
            .delete()
            .eq('id', publicUser.id);
            
          if (deleteError) console.error('Erreur suppression ancien profil:', deleteError);
          else console.log('🗑️ Ancien profil supprimé.');
        }
      } else {
        console.log('✅ ID déjà synchronisé.');
      }
    } else {
      console.log(`⚠️ Pas de profil public pour ${authUser.email}. Création...`);
      // Créer le profil manquant
      const newProfile = {
        id: authUser.id,
        email: authUser.email,
        name: authUser.user_metadata.name || authUser.email.split('@')[0],
        role: authUser.user_metadata.role || 'CONTRIBUTOR',
        avatar: `https://ui-avatars.com/api/?name=${authUser.email}&background=random`
      };
      await supabase.from('users').insert(newProfile);
      console.log('✅ Profil créé.');
    }
  }
  
  console.log('\n🔄 SYNCHRONISATION TERMINÉE.');
}

syncUsers();
