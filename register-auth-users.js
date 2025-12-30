import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
// Service Role Key (nécessaire pour créer des utilisateurs dans Auth)
// Doit être définie dans .env comme SUPABASE_SERVICE_ROLE_KEY
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const usersToCreate = [
  { email: 'admin@worldcanalinfo.com', password: 'admin123', role: 'ADMIN' },
  { email: 'editor@worldcanalinfo.com', password: 'editor', role: 'EDITOR' },
  { email: 'contrib@worldcanalinfo.com', password: 'contrib', role: 'CONTRIBUTOR' }
];

async function registerUsers() {
  console.log('--- ENREGISTREMENT DES UTILISATEURS DANS SUPABASE AUTH ---');
  
  for (const user of usersToCreate) {
    console.log(`Traitement de ${user.email}...`);
    
    // 1. Vérifier si l'utilisateur existe déjà
    // Note: listUsers ne retourne pas le mot de passe, mais on peut voir s'il existe
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('Erreur listing users:', listError);
      continue;
    }
    
    const existingUser = users.find(u => u.email === user.email);
    
    if (existingUser) {
      console.log(`L'utilisateur ${user.email} existe déjà (ID: ${existingUser.id}). Mise à jour du mot de passe...`);
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        { password: user.password, email_confirm: true }
      );
      if (updateError) console.error(`Erreur update ${user.email}:`, updateError);
      else console.log(`Mot de passe mis à jour pour ${user.email}.`);
    } else {
      console.log(`Création de l'utilisateur ${user.email}...`);
      const { data, error: createError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true, // Auto-confirm email
        user_metadata: { role: user.role }
      });
      
      if (createError) {
        console.error(`Erreur création ${user.email}:`, createError);
      } else {
        console.log(`Utilisateur créé avec succès: ${data.user.id}`);
      }
    }
  }
  console.log('--- OPÉRATION TERMINÉE ---');
}

registerUsers();
