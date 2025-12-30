-- Script SQL pour configurer Supabase avec les colonnes exactes utilisées par le code (camelCase)
-- Exécutez ce script dans l'éditeur SQL de Supabase.

-- 1. Table Videos
create table if not exists videos (
  id text primary key,
  title text,
  "youtubeId" text,
  category text,
  duration text,
  "createdAt" timestamptz default now()
);
alter table videos enable row level security;
create policy "Public videos view" on videos for select using (true);
create policy "Admin videos manage" on videos for all using (true); -- Simplifié pour éviter les problèmes de permissions au début

-- 2. Table Social Links
create table if not exists social_links (
  id text primary key,
  platform text,
  url text,
  "iconClass" text,
  "bgColor" text,
  "textColor" text
);
alter table social_links enable row level security;
create policy "Public socials view" on social_links for select using (true);
create policy "Admin socials manage" on social_links for all using (true);

-- 3. Table Articles
create table if not exists articles (
  id text primary key,
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
  views int default 0,
  "createdAt" timestamptz default now(),
  "updatedAt" timestamptz default now(),
  "submittedBy" text,
  "submittedAt" timestamptz,
  "reviewedBy" text,
  "reviewedAt" timestamptz,
  "reviewComments" text,
  "submissionStatus" text
);
alter table articles enable row level security;
create policy "Public articles view" on articles for select using (true);
create policy "Admin articles manage" on articles for all using (true);

-- 4. Table Categories
create table if not exists categories (
  id text primary key,
  name text,
  slug text
);
alter table categories enable row level security;
create policy "Public categories view" on categories for select using (true);
create policy "Admin categories manage" on categories for all using (true);

-- 5. Table Users
create table if not exists users (
  id text primary key,
  name text,
  email text,
  role text,
  avatar text,
  "createdAt" timestamptz default now(),
  "lastLogin" timestamptz,
  active boolean
);
alter table users enable row level security;
create policy "Public users view" on users for select using (true);
create policy "Admin users manage" on users for all using (true);

-- 6. Table Ads
create table if not exists ads (
  id text primary key,
  title text,
  location text,
  type text,
  content text,
  "imageUrl" text,
  "linkUrl" text,
  "targetUrl" text,
  "isActive" boolean,
  active boolean,
  views int default 0,
  clicks int default 0,
  "createdAt" timestamptz default now()
);
alter table ads enable row level security;
create policy "Public ads view" on ads for select using (true);
create policy "Admin ads manage" on ads for all using (true);

-- 7. Table Messages
create table if not exists messages (
  id text primary key,
  name text,
  email text,
  subject text,
  message text,
  date timestamptz default now(),
  status text
);
alter table messages enable row level security;
create policy "Admin messages manage" on messages for all using (true);
create policy "Public send messages" on messages for insert with check (true);

-- 8. Fonction RPC pour incrémenter les vues
create or replace function increment_page_view(page_id text)
returns void as $$
begin
  update articles set views = views + 1 where id = page_id;
end;
$$ language plpgsql;
