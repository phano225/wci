-- Script SQL pour créer les tables nécessaires dans Supabase
-- Copiez tout le contenu ci-dessous et exécutez-le dans l'éditeur SQL de Supabase (SQL Editor)

-- 1. Table des catégories
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public categories are viewable by everyone" 
ON categories FOR SELECT USING (true);

CREATE POLICY "Admins and Editors can insert categories" 
ON categories FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins and Editors can update categories" 
ON categories FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Admins and Editors can delete categories" 
ON categories FOR DELETE USING (auth.role() = 'authenticated');

-- 2. Table des articles
CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT,
  category TEXT,
  imageurl TEXT,
  videourl TEXT,
  authorid TEXT,
  authorname TEXT,
  authoravatar TEXT,
  status TEXT DEFAULT 'DRAFT',
  views INTEGER DEFAULT 0,
  createdat TIMESTAMPTZ DEFAULT NOW(),
  updatedat TIMESTAMPTZ DEFAULT NOW(),
  
  -- Workflow de validation
  submitted_by TEXT,
  submitted_at TIMESTAMPTZ,
  submission_status TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  review_comments TEXT
);

ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut voir les articles publiés
CREATE POLICY "Public articles are viewable by everyone" 
ON articles FOR SELECT USING (status = 'PUBLISHED' OR auth.role() = 'authenticated');

-- Les utilisateurs authentifiés peuvent créer des articles
CREATE POLICY "Users can create articles" 
ON articles FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Les auteurs peuvent modifier leurs propres articles, les admins/éditeurs peuvent tout modifier
CREATE POLICY "Users can update own articles" 
ON articles FOR UPDATE USING (
  auth.uid()::text = authorid OR 
  auth.email() IN ('admin@worldcanalinfo.com', 'editor@worldcanalinfo.com')
);

-- Les auteurs peuvent supprimer leurs propres articles
CREATE POLICY "Users can delete own articles" 
ON articles FOR DELETE USING (
  auth.uid()::text = authorid OR 
  auth.email() IN ('admin@worldcanalinfo.com', 'editor@worldcanalinfo.com')
);

-- 3. Table des publicités
CREATE TABLE IF NOT EXISTS ads (
  id TEXT PRIMARY KEY,
  title TEXT,
  location TEXT,
  type TEXT,
  content TEXT,
  linkurl TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public ads are viewable by everyone" 
ON ads FOR SELECT USING (true);

CREATE POLICY "Admins can manage ads" 
ON ads FOR ALL USING (auth.role() = 'authenticated');

-- 4. Fonction pour incrémenter les vues (RPC)
CREATE OR REPLACE FUNCTION increment_views(article_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE articles
  SET views = views + 1
  WHERE id = article_id;
END;
$$;
