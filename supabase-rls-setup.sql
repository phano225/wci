-- Politiques RLS pour Supabase
-- À exécuter dans l'onglet SQL Editor de Supabase

-- Activer RLS sur toutes les tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;

-- Politiques pour la table USERS
-- Lecture pour utilisateurs authentifiés
CREATE POLICY "Enable read access for authenticated users on users" ON users
FOR SELECT USING (auth.role() = 'authenticated');

-- Insertion pour tous (nécessaire pour l'inscription)
CREATE POLICY "Enable insert for all users on users" ON users
FOR INSERT WITH CHECK (true);

-- Mise à jour pour utilisateurs authentifiés
CREATE POLICY "Enable update for authenticated users on users" ON users
FOR UPDATE USING (auth.role() = 'authenticated');

-- Suppression pour utilisateurs authentifiés
CREATE POLICY "Enable delete for authenticated users on users" ON users
FOR DELETE USING (auth.role() = 'authenticated');

-- Politiques pour la table ARTICLES
CREATE POLICY "Enable read access for authenticated users on articles" ON articles
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users on articles" ON articles
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users on articles" ON articles
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users on articles" ON articles
FOR DELETE USING (auth.role() = 'authenticated');

-- Politiques pour la table CATEGORIES
CREATE POLICY "Enable read access for authenticated users on categories" ON categories
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users on categories" ON categories
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users on categories" ON categories
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users on categories" ON categories
FOR DELETE USING (auth.role() = 'authenticated');

-- Politiques pour la table ADS
CREATE POLICY "Enable read access for authenticated users on ads" ON ads
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users on ads" ON ads
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users on ads" ON ads
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users on ads" ON ads
FOR DELETE USING (auth.role() = 'authenticated');