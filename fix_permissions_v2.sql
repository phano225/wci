-- Script COMPLET de réinitialisation et réparation WCI
-- À exécuter dans Supabase > SQL Editor

-- 1. Création/Vérification des tables avec les bonnes colonnes (camelCase via "")

-- TABLE ARTICLES
CREATE TABLE IF NOT EXISTS articles (
    id text PRIMARY KEY,
    title text,
    excerpt text,
    content text,
    category text,
    "imageUrl" text,
    "videoUrl" text,
    "authorId" text,
    "authorName" text,
    "authorAvatar" text,
    status text,
    views integer DEFAULT 0,
    "createdAt" timestamptz DEFAULT now(),
    "updatedAt" timestamptz DEFAULT now(),
    "submittedBy" text,
    "submittedAt" timestamptz,
    "reviewedBy" text,
    "reviewedAt" timestamptz,
    "reviewComments" text,
    "submissionStatus" text
);

-- Assurer que les colonnes existent (si la table existait déjà mais incomplètement)
DO $$
BEGIN
    BEGIN ALTER TABLE articles ADD COLUMN "imageUrl" text; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE articles ADD COLUMN "videoUrl" text; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE articles ADD COLUMN "authorId" text; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE articles ADD COLUMN "authorName" text; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE articles ADD COLUMN "authorAvatar" text; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE articles ADD COLUMN "createdAt" timestamptz DEFAULT now(); EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE articles ADD COLUMN "updatedAt" timestamptz DEFAULT now(); EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE articles ADD COLUMN "submittedBy" text; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE articles ADD COLUMN "submittedAt" timestamptz; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE articles ADD COLUMN "reviewedBy" text; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE articles ADD COLUMN "reviewedAt" timestamptz; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE articles ADD COLUMN "reviewComments" text; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE articles ADD COLUMN "submissionStatus" text; EXCEPTION WHEN duplicate_column THEN END;
END $$;

-- TABLE CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
    id text PRIMARY KEY,
    name text,
    slug text
);

-- TABLE USERS (Profils publics)
CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY, -- Doit correspondre à auth.users.id
    email text,
    name text,
    role text DEFAULT 'CONTRIBUTOR',
    avatar text,
    "createdAt" timestamptz DEFAULT now()
);

-- TABLE VIDEOS
CREATE TABLE IF NOT EXISTS videos (
    id text PRIMARY KEY,
    title text,
    "youtubeId" text,
    category text,
    duration text,
    "createdAt" timestamptz DEFAULT now()
);

DO $$
BEGIN
    BEGIN ALTER TABLE videos ADD COLUMN "youtubeId" text; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE videos ADD COLUMN "createdAt" timestamptz DEFAULT now(); EXCEPTION WHEN duplicate_column THEN END;
END $$;

-- TABLE SOCIAL LINKS
CREATE TABLE IF NOT EXISTS social_links (
    id text PRIMARY KEY,
    platform text,
    url text,
    "iconClass" text,
    "bgColor" text,
    "textColor" text
);

DO $$
BEGIN
    BEGIN ALTER TABLE social_links ADD COLUMN "iconClass" text; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE social_links ADD COLUMN "bgColor" text; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE social_links ADD COLUMN "textColor" text; EXCEPTION WHEN duplicate_column THEN END;
END $$;

-- TABLE ADS
CREATE TABLE IF NOT EXISTS ads (
    id text PRIMARY KEY,
    title text,
    location text,
    type text,
    content text,
    "imageUrl" text,
    "linkUrl" text,
    "targetUrl" text,
    active boolean DEFAULT true,
    "isActive" boolean DEFAULT true,
    views integer DEFAULT 0,
    clicks integer DEFAULT 0,
    "createdAt" timestamptz DEFAULT now()
);

DO $$
BEGIN
    BEGIN ALTER TABLE ads ADD COLUMN "imageUrl" text; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE ads ADD COLUMN "linkUrl" text; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE ads ADD COLUMN "targetUrl" text; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE ads ADD COLUMN "isActive" boolean DEFAULT true; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE ads ADD COLUMN "createdAt" timestamptz DEFAULT now(); EXCEPTION WHEN duplicate_column THEN END;
END $$;

-- TABLE MESSAGES
CREATE TABLE IF NOT EXISTS messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text,
    email text,
    subject text,
    message text,
    date timestamptz DEFAULT now(),
    status text DEFAULT 'UNREAD'
);

-- 2. POLITIQUE DE SÉCURITÉ (RLS)
-- On active RLS mais on crée une politique PERMISSIVE pour éviter les erreurs de droits pour l'instant

ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Articles" ON articles;
CREATE POLICY "Public Access Articles" ON articles FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Categories" ON categories;
CREATE POLICY "Public Access Categories" ON categories FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Users" ON users;
CREATE POLICY "Public Access Users" ON users FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Videos" ON videos;
CREATE POLICY "Public Access Videos" ON videos FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE social_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Socials" ON social_links;
CREATE POLICY "Public Access Socials" ON social_links FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Ads" ON ads;
CREATE POLICY "Public Access Ads" ON ads FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Messages" ON messages;
CREATE POLICY "Public Access Messages" ON messages FOR ALL USING (true) WITH CHECK (true);

-- 3. BUCKET STORAGE (Images)
-- Tentative de création du bucket 'images' s'il n'existe pas (nécessite extension, sinon à faire manuellement)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access Storage" ON storage.objects;
CREATE POLICY "Public Access Storage" ON storage.objects FOR ALL USING (bucket_id = 'images') WITH CHECK (bucket_id = 'images');
