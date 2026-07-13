-- Script pour créer le bucket de stockage Supabase pour les médias WordPress

-- 1. Insérer le nouveau bucket dans la table de configuration du Storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('wci-media', 'wci-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Autoriser la lecture publique de tous les fichiers du bucket (pour que le site puisse les afficher)
CREATE POLICY "Lecture publique des médias WCI" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'wci-media');

-- 3. (Optionnel) Autoriser l'upload de fichiers via l'API pour les utilisateurs authentifiés ou pour le script
-- Note: Pour notre script Node.js, l'utilisation de la clé "Service Role" contournera de toute façon ces règles,
-- mais c'est une bonne pratique de les définir.
CREATE POLICY "Upload pour les utilisateurs authentifiés" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'wci-media' AND auth.role() = 'authenticated');

CREATE POLICY "Mise à jour pour les utilisateurs authentifiés" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'wci-media' AND auth.role() = 'authenticated');

CREATE POLICY "Suppression pour les utilisateurs authentifiés" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'wci-media' AND auth.role() = 'authenticated');
