import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Erreur: VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant dans .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const ADMIN_EMAIL = 'admin@wci.com';
const ADMIN_PASSWORD = 'password123';
const ADMIN_NAME = 'Admin WCI';

async function createAdmin() {
  console.log(`Création de l'administrateur ${ADMIN_EMAIL}...`);

  // 1. Créer l'utilisateur dans Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { name: ADMIN_NAME, role: 'ADMIN' }
  });

  let userId;

  if (authError) {
    if (authError.message.includes('already has been registered')) {
        console.log('L\'utilisateur existe déjà dans Auth. Récupération de l\'ID...');
        const { data: { users } } = await supabase.auth.admin.listUsers();
        const existingUser = users.find(u => u.email === ADMIN_EMAIL);
        if (existingUser) {
            userId = existingUser.id;
        } else {
            console.error('Impossible de retrouver l\'utilisateur existant.');
            return;
        }
    } else {
        console.error('Erreur création Auth:', authError);
        return;
    }
  } else {
      userId = authData.user.id;
      console.log('Utilisateur Auth créé avec succès.');
  }

  // 2. Créer/Mettre à jour le profil dans public.users
  const { error: publicError } = await supabase.from('users').upsert({
      id: userId,
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      role: 'ADMIN',
      avatar: `https://ui-avatars.com/api/?name=${ADMIN_NAME.replace(' ', '+')}&background=0D8ABC&color=fff`
  });

  if (publicError) {
      console.error('Erreur création profil public:', publicError);
  } else {
      console.log('✅ Compte administrateur prêt !');
      console.log(`Email: ${ADMIN_EMAIL}`);
      console.log(`Password: ${ADMIN_PASSWORD}`);
  }
}

createAdmin();
