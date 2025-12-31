-- Script de correction de la base de données
-- Ce script ajoute les colonnes manquantes (en format camelCase "maColonne") aux tables existantes
-- Il ne supprime aucune donnée.

-- 1. Table VIDEOS
CREATE TABLE IF NOT EXISTS videos (id text primary key);
ALTER TABLE videos ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS "youtubeId" text;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS duration text;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS "createdAt" timestamptz default now();
-- Active la sécurité mais permet tout pour l'instant (pour débloquer)
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin videos manage" ON videos;
CREATE POLICY "Admin videos manage" ON videos FOR ALL USING (true);


-- 2. Table ARTICLES
CREATE TABLE IF NOT EXISTS articles (id text primary key);
ALTER TABLE articles ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS excerpt text;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS content text;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS "imageUrl" text;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS "videoUrl" text;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS "authorId" text;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS "authorName" text;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS "authorAvatar" text;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS views int default 0;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS "createdAt" timestamptz default now();
ALTER TABLE articles ADD COLUMN IF NOT EXISTS "updatedAt" timestamptz default now();
ALTER TABLE articles ADD COLUMN IF NOT EXISTS "submittedBy" text;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS "submittedAt" timestamptz;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS "reviewedBy" text;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS "reviewedAt" timestamptz;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS "reviewComments" text;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS "submissionStatus" text;
-- Permissions
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public articles view" ON articles;
CREATE POLICY "Public articles view" ON articles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin articles manage" ON articles;
CREATE POLICY "Admin articles manage" ON articles FOR ALL USING (true);


-- 3. Table SOCIAL_LINKS
CREATE TABLE IF NOT EXISTS social_links (id text primary key);
ALTER TABLE social_links ADD COLUMN IF NOT EXISTS platform text;
ALTER TABLE social_links ADD COLUMN IF NOT EXISTS url text;
ALTER TABLE social_links ADD COLUMN IF NOT EXISTS "iconClass" text;
ALTER TABLE social_links ADD COLUMN IF NOT EXISTS "bgColor" text;
ALTER TABLE social_links ADD COLUMN IF NOT EXISTS "textColor" text;
-- Permissions
ALTER TABLE social_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin socials manage" ON social_links;
CREATE POLICY "Admin socials manage" ON social_links FOR ALL USING (true);


-- 4. Table ADS
CREATE TABLE IF NOT EXISTS ads (id text primary key);
ALTER TABLE ads ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS type text;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS content text;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS "imageUrl" text;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS "linkUrl" text;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS "targetUrl" text;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS "isActive" boolean;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS active boolean;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS views int default 0;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS clicks int default 0;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS "createdAt" timestamptz default now();
-- Permissions
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin ads manage" ON ads;
CREATE POLICY "Admin ads manage" ON ads FOR ALL USING (true);

-- 5. Table CATEGORIES
CREATE TABLE IF NOT EXISTS categories (id text primary key);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS slug text;
-- Permissions
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin categories manage" ON categories;
CREATE POLICY "Admin categories manage" ON categories FOR ALL USING (true);

-- 6. Table USERS
CREATE TABLE IF NOT EXISTS users (id text primary key);
ALTER TABLE users ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "createdAt" timestamptz default now();
ALTER TABLE users ADD COLUMN IF NOT EXISTS "lastLogin" timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS active boolean;
-- Permissions
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin users manage" ON users;
CREATE POLICY "Admin users manage" ON users FOR ALL USING (true);
