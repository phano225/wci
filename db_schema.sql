-- Initial Schema for WCI (World Canal Info)
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE (Public Profile linked to Auth)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'CONTRIBUTOR', -- 'ADMIN', 'EDITOR', 'CONTRIBUTOR'
  avatar TEXT,
  bio TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "lastLogin" TIMESTAMPTZ,
  active BOOLEAN DEFAULT true
);

-- 2. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ARTICLES TABLE
CREATE TABLE IF NOT EXISTS public.articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT, 
  content TEXT,
  excerpt TEXT,
  "imageUrl" TEXT, 
  category TEXT, 
  "authorId" UUID REFERENCES public.users(id),
  "authorName" TEXT,
  "authorAvatar" TEXT,
  status TEXT DEFAULT 'DRAFT', -- 'DRAFT', 'SUBMITTED', 'PUBLISHED', 'REJECTED'
  views INTEGER DEFAULT 0,
  "videoUrl" TEXT,
  "submissionStatus" TEXT,
  "submittedBy" UUID REFERENCES public.users(id),
  "submittedAt" TIMESTAMPTZ,
  "reviewedBy" UUID REFERENCES public.users(id),
  "reviewedAt" TIMESTAMPTZ,
  "reviewComments" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ADS TABLE
CREATE TABLE IF NOT EXISTS public.ads (
  id TEXT PRIMARY KEY, 
  title TEXT,
  type TEXT, -- 'IMAGE', 'VIDEO', 'SCRIPT'
  location TEXT, 
  content TEXT, 
  "imageUrl" TEXT,
  "linkUrl" TEXT,
  "targetUrl" TEXT,
  active BOOLEAN DEFAULT true,
  views INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 5. MESSAGES TABLE (Contact Form)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'UNREAD', -- 'UNREAD', 'READ', 'ARCHIVED'
  date TIMESTAMPTZ DEFAULT NOW()
);

-- 6. VIDEOS TABLE
CREATE TABLE IF NOT EXISTS public.videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  "youtubeId" TEXT NOT NULL,
  category TEXT,
  duration TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 7. SOCIAL LINKS TABLE
CREATE TABLE IF NOT EXISTS public.social_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform TEXT NOT NULL,
  url TEXT NOT NULL,
  "iconClass" TEXT,
  "bgColor" TEXT,
  "textColor" TEXT
);

-- ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;

-- POLICIES 

-- Users
CREATE POLICY "Public users are viewable by everyone" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Categories
CREATE POLICY "Categories are viewable by everyone" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert categories" ON public.categories FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update categories" ON public.categories FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete categories" ON public.categories FOR DELETE USING (auth.role() = 'authenticated');

-- Articles
CREATE POLICY "Articles are viewable by everyone" ON public.articles FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert articles" ON public.articles FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update articles" ON public.articles FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete articles" ON public.articles FOR DELETE USING (auth.role() = 'authenticated');

-- Ads
CREATE POLICY "Ads are viewable by everyone" ON public.ads FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage ads" ON public.ads FOR ALL USING (auth.role() = 'authenticated');

-- Messages
CREATE POLICY "Anyone can insert messages" ON public.messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can view messages" ON public.messages FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update messages" ON public.messages FOR UPDATE USING (auth.role() = 'authenticated');

-- Videos
CREATE POLICY "Videos are viewable by everyone" ON public.videos FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage videos" ON public.videos FOR ALL USING (auth.role() = 'authenticated');

-- Social Links
CREATE POLICY "Social links are viewable by everyone" ON public.social_links FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage social links" ON public.social_links FOR ALL USING (auth.role() = 'authenticated');

-- FUNCTIONS
CREATE OR REPLACE FUNCTION increment_page_view(page_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.articles
  SET views = views + 1
  WHERE id = page_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
