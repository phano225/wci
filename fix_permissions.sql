-- Script de réparation des permissions et des colonnes WCI
-- À exécuter dans Supabase > SQL Editor

-- 1. ARTICLES
alter table articles enable row level security;
-- Nettoyage des anciennes politiques
drop policy if exists "Public Access Articles" on articles;
drop policy if exists "Admin articles manage" on articles;
drop policy if exists "Public articles view" on articles;
drop policy if exists "Admins and Editors can insert articles" on articles;
drop policy if exists "Admins and Editors can update articles" on articles;
drop policy if exists "Public can view published articles" on articles;
-- Nouvelle politique permissive
create policy "Public Access Articles" on articles for all using (true) with check (true);

-- Colonnes manquantes potentielles
alter table articles add column if not exists "imageUrl" text;
alter table articles add column if not exists "videoUrl" text;
alter table articles add column if not exists "authorId" text;
alter table articles add column if not exists "authorName" text;
alter table articles add column if not exists "authorAvatar" text;
alter table articles add column if not exists "createdAt" timestamptz default now();
alter table articles add column if not exists "updatedAt" timestamptz default now();
alter table articles add column if not exists "submittedBy" text;
alter table articles add column if not exists "submittedAt" timestamptz;
alter table articles add column if not exists "reviewedBy" text;
alter table articles add column if not exists "reviewedAt" timestamptz;
alter table articles add column if not exists "reviewComments" text;
alter table articles add column if not exists "submissionStatus" text;

-- 2. CATEGORIES
alter table categories enable row level security;
drop policy if exists "Public Access Categories" on categories;
drop policy if exists "Admin categories manage" on categories;
drop policy if exists "Public categories view" on categories;
drop policy if exists "Admins and Editors can insert categories" on categories;
drop policy if exists "Admins and Editors can update categories" on categories;
create policy "Public Access Categories" on categories for all using (true) with check (true);

-- 3. VIDEOS
alter table videos enable row level security;
drop policy if exists "Public Access Videos" on videos;
drop policy if exists "Admin videos manage" on videos;
drop policy if exists "Public videos view" on videos;
create policy "Public Access Videos" on videos for all using (true) with check (true);

alter table videos add column if not exists "youtubeId" text;
alter table videos add column if not exists "createdAt" timestamptz default now();

-- 4. SOCIAL LINKS
alter table social_links enable row level security;
drop policy if exists "Public Access Socials" on social_links;
drop policy if exists "Admin socials manage" on social_links;
drop policy if exists "Public socials view" on social_links;
create policy "Public Access Socials" on social_links for all using (true) with check (true);

alter table social_links add column if not exists "iconClass" text;
alter table social_links add column if not exists "bgColor" text;
alter table social_links add column if not exists "textColor" text;

-- 5. ADS
alter table ads enable row level security;
drop policy if exists "Public Access Ads" on ads;
drop policy if exists "Admin ads manage" on ads;
drop policy if exists "Public ads view" on ads;
create policy "Public Access Ads" on ads for all using (true) with check (true);

alter table ads add column if not exists "imageUrl" text;
alter table ads add column if not exists "linkUrl" text;
alter table ads add column if not exists "targetUrl" text;
alter table ads add column if not exists "isActive" boolean;
alter table ads add column if not exists "createdAt" timestamptz default now();

-- 6. MESSAGES
alter table messages enable row level security;
drop policy if exists "Public Access Messages" on messages;
drop policy if exists "Admin messages manage" on messages;
drop policy if exists "Public send messages" on messages;
create policy "Public Access Messages" on messages for all using (true) with check (true);
