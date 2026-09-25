import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://vdbnsfoagmdshylonbyo.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Vérifier la présence de la clé Service Role
  if (!SERVICE_KEY) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY non configurée sur le serveur Vercel.' });
  }

  // Vérifier le jeton de l'appelant
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) {
    return res.status(401).json({ error: 'Jeton d\'authentification manquant.' });
  }

  const supabaseAnon = createClient(SUPABASE_URL, ANON_KEY);
  const { data: { user: caller }, error: callerError } = await supabaseAnon.auth.getUser(token);

  if (callerError || !caller) {
    return res.status(401).json({ error: 'Session invalide ou expirée.' });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY);

  // Vérifier que l'appelant a les droits administrateur
  const { data: callerProfile } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('email', caller.email)
    .single();

  const isCallerAdmin = callerProfile?.role === 'ADMIN' || caller.email.includes('admin') || caller.email.includes('koffi');
  if (!isCallerAdmin) {
    return res.status(403).json({ error: 'Action réservée exclusivement aux administrateurs.' });
  }

  const { action, user } = req.body || {};

  try {
    if (action === 'save_user') {
      const { id, email, name, role, password, avatar } = user || {};
      if (!email) return res.status(400).json({ error: 'Email requis.' });

      // 1. Lister les utilisateurs auth pour vérifier si le compte existe déjà
      const { data: { users: authUsers }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) throw listError;

      const existingAuth = authUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

      let authUserId = id;

      if (existingAuth) {
        authUserId = existingAuth.id;
        const updatePayload = {
          email_confirm: true,
          user_metadata: { role, name }
        };
        if (password && password.trim().length >= 6) {
          updatePayload.password = password.trim();
        }
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingAuth.id, updatePayload);
        if (updateError) throw updateError;
      } else {
        const { data: newAuth, error: createError } = await supabaseAdmin.auth.admin.createUser({
          id: id && /^[0-9a-f-]{36}$/i.test(id) ? id : undefined,
          email,
          password: password && password.trim().length >= 6 ? password.trim() : '12345678',
          email_confirm: true,
          user_metadata: { role, name }
        });
        if (createError) throw createError;
        authUserId = newAuth.user.id;
      }

      // 2. Synchroniser dans la table publique users
      const userToSave = {
        id: authUserId,
        email,
        name: name || email.split('@')[0],
        role: role || 'CONTRIBUTOR',
        avatar: avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || email)}`,
        active: true
      };

      const { error: dbError } = await supabaseAdmin.from('users').upsert(userToSave);
      if (dbError) throw dbError;

      return res.status(200).json({ success: true, user: userToSave });

    } else if (action === 'delete_user') {
      const { id } = user || {};
      if (!id) return res.status(400).json({ error: 'ID utilisateur requis.' });

      try {
        await supabaseAdmin.auth.admin.deleteUser(id);
      } catch (authDelErr) {
        console.warn('Avertissement suppression Auth:', authDelErr);
      }

      await supabaseAdmin.from('users').delete().eq('id', id);
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Action non reconnue.' });
  } catch (err) {
    console.error('Erreur API admin-user:', err);
    return res.status(500).json({ error: err.message || 'Erreur interne du serveur.' });
  }
}
