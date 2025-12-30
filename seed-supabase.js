import { createClient } from '@supabase/supabase-js';

// Configuration hardcodée pour ce script (ou importée si possible, mais plus simple ici)
const SUPABASE_URL = 'https://aqbsagaifmtxrrsngbme.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxYnNhZ2FpZm10eHJyc25nYm1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyMjM3NTQsImV4cCI6MjA4MTc5OTc1NH0.7L1Fv3_qk0pQUMyLtshuChZ-mY-R3NGQGvB6gpyCDzc';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const seedData = async () => {
  console.log('--- SEEDING SUPABASE ---');

  // 1. USERS
  console.log('Seeding Users...');
  const users = [
    { id: 'admin-001', name: 'Administrateur', email: 'admin@example.com', password: 'admin', role: 'ADMIN', avatar: 'https://ui-avatars.com/api/?name=Admin&background=3B82F6&color=fff' },
    { id: 'editor-001', name: 'Éditeur', email: 'editor@example.com', password: 'editor', role: 'EDITOR', avatar: 'https://ui-avatars.com/api/?name=Editor&background=10B981&color=fff' },
    { id: 'contrib-001', name: 'Contributeur', email: 'contrib@example.com', password: 'contrib', role: 'CONTRIBUTOR', avatar: 'https://ui-avatars.com/api/?name=Contrib&background=F59E0B&color=fff' }
  ];
  
  const { error: usersError } = await supabase.from('users').upsert(users, { onConflict: 'id' });
  if (usersError) console.error('Error seeding users:', usersError);
  else console.log('Users seeded.');

  // 2. CATEGORIES
  console.log('Seeding Categories...');
  const categories = [
    { id: 'cat-001', name: 'Actualités', slug: 'actualites' },
    { id: 'cat-002', name: 'Économie', slug: 'economie' },
    { id: 'cat-003', name: 'Politique', slug: 'politique' },
    { id: 'cat-004', name: 'Culture', slug: 'culture' }
  ];
  
  const { error: catError } = await supabase.from('categories').upsert(categories, { onConflict: 'id' });
  if (catError) console.error('Error seeding categories:', catError);
  else console.log('Categories seeded.');

  // 3. ARTICLES
  console.log('Seeding Articles...');
  const articles = [
    {
      id: 'article-001',
      title: 'Bienvenue',
      excerpt: 'Découvrez notre nouveau site d\'information dédié à l\'actualité internationale.',
      content: '<p>Votre source d\'information de référence sur les événements mondiaux qui impactent le commerce maritime international.</p><p>Notre équipe de journalistes professionnels vous tient informé 24/7 des dernières actualités.</p>',
      category: 'Actualités',
      imageurl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
      authorid: 'admin-001',
      authorname: 'Administrateur',
      authoravatar: 'https://ui-avatars.com/api/?name=Admin&background=3B82F6&color=fff',
      status: 'PUBLISHED',
      views: 150,
      createdat: new Date().toISOString(),
      updatedat: new Date().toISOString()
    },
    {
      id: 'article-002',
      title: 'Expansion du Canal de Panama',
      excerpt: 'Les travaux d\'agrandissement du canal de Panama touchent à leur fin. Découvrez les impacts économiques de ce projet majeur.',
      content: '<h2>Un projet historique</h2><p>Les travaux d\'agrandissement du canal de Panama, commencés en 2007, représentent l\'un des plus grands projets d\'infrastructure du XXIe siècle.</p><h3>Impacts économiques</h3><p>Cette expansion permettra d\'accueillir des navires de plus grande capacité, augmentant ainsi les revenus du canal de manière significative.</p>',
      category: 'Économie',
      imageurl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
      authorid: 'editor-001',
      authorname: 'Éditeur',
      authoravatar: 'https://ui-avatars.com/api/?name=Editor&background=10B981&color=fff',
      status: 'PUBLISHED',
      views: 89,
      createdat: new Date().toISOString(),
      updatedat: new Date().toISOString()
    }
  ];

  const { error: artError } = await supabase.from('articles').upsert(articles, { onConflict: 'id' });
  if (artError) console.error('Error seeding articles:', artError);
  else console.log('Articles seeded.');

  // 4. ADS
  console.log('Seeding Ads...');
  const ads = [
    {
      id: 'ad-001',
      title: 'Publicité Header',
      location: 'HEADER_LEADERBOARD',
      type: 'IMAGE',
      content: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=1200&h=200&fit=crop',
      linkurl: 'https://example.com',
      active: true
    },
    {
      id: 'ad-002',
      title: 'Sidebar Carré',
      location: 'SIDEBAR_SQUARE',
      type: 'IMAGE',
      content: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=300&fit=crop',
      linkurl: 'https://example.com',
      active: true
    }
  ];

  const { error: adError } = await supabase.from('ads').upsert(ads, { onConflict: 'id' });
  if (adError) console.error('Error seeding ads:', adError);
  else console.log('Ads seeded.');

  console.log('--- SEEDING COMPLETE ---');
};

seedData();
