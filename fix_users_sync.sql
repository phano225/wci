-- CE SCRIPT EST CRUCIAL POUR QUE LES UTILISATEURS PUISSENT CRÉER DES ARTICLES
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. TRIGGER : Crée automatiquement un profil public quand un utilisateur s'inscrit
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, avatar)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'role', 'CONTRIBUTOR'),
    COALESCE(new.raw_user_meta_data->>'avatar', 'https://ui-avatars.com/api/?name=' || split_part(new.email, '@', 1))
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Définition du déclencheur (Trigger)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. BACKFILL : Importe les utilisateurs existants qui n'ont pas encore de profil public
INSERT INTO public.users (id, email, name, role, avatar)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1)),
  COALESCE(raw_user_meta_data->>'role', 'CONTRIBUTOR'),
  COALESCE(raw_user_meta_data->>'avatar', 'https://ui-avatars.com/api/?name=' || split_part(email, '@', 1))
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;

-- 3. VERIFICATION : Affiche les utilisateurs synchronisés
SELECT id, email, role FROM public.users;
