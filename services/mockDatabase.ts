import { Article, ArticleStatus, Category, User, UserRole, Ad, AdLocation, AdType, SubmissionStatus, ContactMessage, Video, SocialLink } from '../types';
import { supabase } from '../supabase-config';

// --- CONFIGURATION DU MODE HORS LIGNE ---
// Mettez cette valeur à 'false' pour que le site se connecte à la vraie base de données.
export const IS_OFFLINE_MODE = false;

// --- DONNÉES DE FALLBACK (MODE HORS LIGNE / DÉMO) ---

const MOCK_USERS: User[] = [
  { id: 'demo-admin', name: 'Administrateur', email: 'admin@example.com', role: UserRole.ADMIN, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin' },
  { id: 'demo-editor', name: 'Éditeur', email: 'editor@example.com', role: UserRole.EDITOR, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=editor' },
  { id: 'demo-contributor', name: 'Contributeur', email: 'contrib@example.com', role: UserRole.CONTRIBUTOR, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=contrib' }
];

const MOCK_CATEGORIES: Category[] = [
  { id: '1', name: 'Politique', slug: 'politique' },
  { id: '2', name: 'Société', slug: 'societe' },
  { id: '3', name: 'Économie', slug: 'economie' },
  { id: '4', name: 'International', slug: 'international' },
  { id: '5', name: 'Sport', slug: 'sport' },
  { id: '6', name: 'Culture', slug: 'culture' },
  { id: '7', name: 'Faits Divers', slug: 'faits-divers' }
];

const MOCK_ARTICLES: Article[] = [];

const MOCK_VIDEOS: Video[] = [
  { id: 'demo-new', title: '🔴 DÉMO LIVE : Cette vidéo a été ajoutée pour le test', youtubeId: 'LXb3EKWsInQ', category: 'Technologie', duration: '01:00', createdAt: new Date().toISOString() },
  { id: 'v1', title: 'Déclaration exclusive : Les nouvelles mesures du gouvernement pour 2024', youtubeId: 'ScMzIvxBSi4', category: 'Politique', duration: '02:30', createdAt: new Date().toISOString() },
  { id: 'v2', title: 'Analyse économique : L\'impact de l\'inflation', youtubeId: 'C0DPdy98e4c', category: 'Économie', duration: '05:45', createdAt: new Date().toISOString() },
  { id: 'v3', title: 'Reportage : La culture ivoirienne à l\'honneur', youtubeId: 'LXb3EKWsInQ', category: 'Culture', duration: '03:15', createdAt: new Date().toISOString() },
  { id: 'v4', title: 'Sport : Les éléphants se préparent', youtubeId: '7Pq-S557XQU', category: 'Sport', duration: '04:20', createdAt: new Date().toISOString() }
];

const MOCK_SOCIAL_LINKS: SocialLink[] = [
  { id: '1', platform: 'Facebook', url: 'https://facebook.com', iconClass: 'fab fa-facebook-f', bgColor: 'bg-blue-600', textColor: 'text-white' },
  { id: '2', platform: 'Twitter', url: 'https://twitter.com', iconClass: 'fab fa-twitter', bgColor: 'bg-black', textColor: 'text-white' },
  { id: '3', platform: 'YouTube', url: 'https://youtube.com', iconClass: 'fab fa-youtube', bgColor: 'bg-red-600', textColor: 'text-white' },
  { id: '4', platform: 'WhatsApp', url: 'https://whatsapp.com', iconClass: 'fab fa-whatsapp', bgColor: 'bg-green-500', textColor: 'text-white' }
];

const MOCK_ADS: Ad[] = [
    { id: 'ad1', title: 'Pub Header', imageUrl: 'https://via.placeholder.com/728x90.png?text=Publicité+728x90', content: 'https://via.placeholder.com/728x90.png?text=Publicité+728x90', targetUrl: '#', linkUrl: '#', location: AdLocation.HEADER_LEADERBOARD, type: AdType.IMAGE, isActive: true, views: 1000, clicks: 50, createdAt: new Date().toISOString() },
    { id: 'ad2', title: 'Pub Sidebar', imageUrl: 'https://via.placeholder.com/300x250.png?text=Publicité+Carrée', content: 'https://via.placeholder.com/300x250.png?text=Publicité+Carrée', targetUrl: '#', linkUrl: '#', location: AdLocation.SIDEBAR_SQUARE, type: AdType.IMAGE, isActive: true, views: 800, clicks: 20, createdAt: new Date().toISOString() },
];

const MOCK_MESSAGES: ContactMessage[] = [];

// --- IMPLEMENTATION SUPABASE ---

export const getSocialLinks = async (): Promise<SocialLink[]> => {
    if (IS_OFFLINE_MODE) return MOCK_SOCIAL_LINKS;
    const { data, error } = await supabase.from('social_links').select('*');
    if (error) { console.error('Supabase error:', error); return []; }
    return data || [];
};

export const saveSocialLink = async (link: SocialLink): Promise<void> => {
    if (IS_OFFLINE_MODE) {
        const index = MOCK_SOCIAL_LINKS.findIndex(l => l.id === link.id);
        if (index >= 0) MOCK_SOCIAL_LINKS[index] = link;
        else MOCK_SOCIAL_LINKS.push({ ...link, id: Math.random().toString(36).substr(2, 9) });
        return;
    }
    const { error } = await supabase.from('social_links').upsert(link);
    if (error) throw error;
};

export const deleteSocialLink = async (id: string): Promise<void> => {
    if (IS_OFFLINE_MODE) {
        const index = MOCK_SOCIAL_LINKS.findIndex(l => l.id === id);
        if (index >= 0) MOCK_SOCIAL_LINKS.splice(index, 1);
        return;
    }
    const { error } = await supabase.from('social_links').delete().eq('id', id);
    if (error) throw error;
};

export const getVideos = async (): Promise<Video[]> => {
  if (IS_OFFLINE_MODE) return MOCK_VIDEOS;
  const { data, error } = await supabase.from('videos').select('*').order('createdAt', { ascending: false });
  if (error) { console.error('Supabase error:', error); return []; }
  return data || [];
};

export const saveVideo = async (video: Video): Promise<void> => {
  if (IS_OFFLINE_MODE) {
    const index = MOCK_VIDEOS.findIndex(v => v.id === video.id);
    if (index >= 0) MOCK_VIDEOS[index] = video;
    else MOCK_VIDEOS.push({ ...video, id: Math.random().toString(36).substr(2, 9) });
    return;
  }
  const { error } = await supabase.from('videos').upsert(video);
  if (error) throw error;
};

export const deleteVideo = async (id: string): Promise<void> => {
  if (IS_OFFLINE_MODE) {
    const index = MOCK_VIDEOS.findIndex(v => v.id === id);
    if (index >= 0) MOCK_VIDEOS.splice(index, 1);
    return;
  }
  const { error } = await supabase.from('videos').delete().eq('id', id);
  if (error) throw error;
};

export const getUsers = async (): Promise<User[]> => {
  if (IS_OFFLINE_MODE) return MOCK_USERS;
  // Note: For security, accessing 'users' usually requires admin rights or specific RLS policies
  const { data, error } = await supabase.from('users').select('*');
  if (error) { console.error('Supabase error:', error); return []; }
  return data || [];
};

export const saveUser = async (user: User): Promise<void> => {
    if (IS_OFFLINE_MODE) {
        const index = MOCK_USERS.findIndex(u => u.id === user.id);
        if (index >= 0) MOCK_USERS[index] = user;
        else MOCK_USERS.push(user);
        return;
    }
    const { error } = await supabase.from('users').upsert(user);
    if (error) throw error;
};

export const deleteUser = async (id: string): Promise<void> => {
    if (IS_OFFLINE_MODE) {
        const index = MOCK_USERS.findIndex(u => u.id === id);
        if (index >= 0) MOCK_USERS.splice(index, 1);
        return;
    }
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw error;
};

export const getCategories = async (): Promise<Category[]> => {
  if (IS_OFFLINE_MODE) return MOCK_CATEGORIES;
  const { data, error } = await supabase.from('categories').select('*');
  if (error) throw error;
  return data || [];
};

export const saveCategory = async (category: Category): Promise<void> => {
    if (IS_OFFLINE_MODE) {
        const index = MOCK_CATEGORIES.findIndex(c => c.id === category.id);
        if (index >= 0) MOCK_CATEGORIES[index] = category;
        else MOCK_CATEGORIES.push({ ...category, id: Math.random().toString(36).substr(2, 9) });
        return;
    }
    const { error } = await supabase.from('categories').upsert(category);
    if (error) throw error;
};

export const deleteCategory = async (id: string): Promise<void> => {
    if (IS_OFFLINE_MODE) {
        const index = MOCK_CATEGORIES.findIndex(c => c.id === id);
        if (index >= 0) MOCK_CATEGORIES.splice(index, 1);
        return;
    }
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
};

export const getArticles = async (): Promise<Article[]> => {
  if (IS_OFFLINE_MODE) return MOCK_ARTICLES;
  const { data, error } = await supabase.from('articles').select('*').order('createdAt', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const getArticleById = async (id: string): Promise<Article | undefined> => {
  if (IS_OFFLINE_MODE) return MOCK_ARTICLES.find(a => a.id === id);
  const { data, error } = await supabase.from('articles').select('*').eq('id', id).single();
  if (error) return undefined;
  return data;
};

export const saveArticle = async (article: Article): Promise<void> => {
    if (IS_OFFLINE_MODE) {
        const index = MOCK_ARTICLES.findIndex(a => a.id === article.id);
        if (index >= 0) {
            MOCK_ARTICLES[index] = { ...article, updatedAt: new Date().toISOString() };
        } else {
            MOCK_ARTICLES.push({ 
                ...article, 
                id: Math.random().toString(36).substr(2, 9),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                views: 0
            });
        }
        return;
    }
    const { error } = await supabase.from('articles').upsert(article);
    if (error) throw error;
};

export const deleteArticle = async (id: string): Promise<void> => {
    if (IS_OFFLINE_MODE) {
        const index = MOCK_ARTICLES.findIndex(a => a.id === id);
        if (index >= 0) MOCK_ARTICLES.splice(index, 1);
        return;
    }
    const { error } = await supabase.from('articles').delete().eq('id', id);
    if (error) throw error;
};

export const incrementArticleViews = async (id: string): Promise<void> => {
    if (IS_OFFLINE_MODE) {
        const article = MOCK_ARTICLES.find(a => a.id === id);
        if (article) article.views = (article.views || 0) + 1;
        return;
    }
    const { error } = await supabase.rpc('increment_page_view', { page_id: id });
    if (error) console.error('Error incrementing views:', error);
};

export const getAds = async (): Promise<Ad[]> => {
    if (IS_OFFLINE_MODE) return MOCK_ADS;
    const { data, error } = await supabase.from('ads').select('*');
    if (error) { console.error('Supabase error:', error); return []; }
    return data || [];
};

export const getActiveAdByLocation = async (location: AdLocation): Promise<Ad | undefined> => {
    if (IS_OFFLINE_MODE) {
        const eligibleAds = MOCK_ADS.filter(ad => ad.location === location && (ad.isActive || ad.active));
        if (eligibleAds.length === 0) return undefined;
        return eligibleAds[Math.floor(Math.random() * eligibleAds.length)];
    }
    const { data, error } = await supabase
        .from('ads')
        .select('*')
        .eq('location', location)
        .eq('isActive', true);
        
    if (error || !data || data.length === 0) return undefined;
    return data[Math.floor(Math.random() * data.length)];
};

export const saveAd = async (ad: Ad): Promise<void> => {
    if (IS_OFFLINE_MODE) {
        const index = MOCK_ADS.findIndex(a => a.id === ad.id);
        if (index >= 0) MOCK_ADS[index] = ad;
        else MOCK_ADS.push({ ...ad, id: Math.random().toString(36).substr(2, 9) });
        return;
    }
    const { error } = await supabase.from('ads').upsert(ad);
    if (error) throw error;
};

export const deleteAd = async (id: string): Promise<void> => {
    if (IS_OFFLINE_MODE) {
        const index = MOCK_ADS.findIndex(a => a.id === id);
        if (index >= 0) MOCK_ADS.splice(index, 1);
        return;
    }
    const { error } = await supabase.from('ads').delete().eq('id', id);
    if (error) throw error;
};

export const getMessages = async (): Promise<ContactMessage[]> => {
    if (IS_OFFLINE_MODE) return MOCK_MESSAGES;
    const { data, error } = await supabase.from('messages').select('*').order('date', { ascending: false });
    if (error) { console.error('Supabase error:', error); return []; }
    return data || [];
};

export const updateMessageStatus = async (id: string, status: 'READ' | 'ARCHIVED'): Promise<void> => {
    if (IS_OFFLINE_MODE) {
        const msg = MOCK_MESSAGES.find(m => m.id === id);
        if (msg) msg.status = status;
        return;
    }
    const { error } = await supabase.from('messages').update({ status }).eq('id', id);
    if (error) throw error;
};

export const saveMessage = async (message: { name: string; email: string; subject: string; message: string }): Promise<void> => {
    if (IS_OFFLINE_MODE) {
        MOCK_MESSAGES.push({
            ...message,
            id: Math.random().toString(36).substr(2, 9),
            date: new Date().toISOString(),
            status: 'UNREAD'
        });
        return;
    }
    const { error } = await supabase.from('messages').insert([{
        ...message,
        date: new Date().toISOString(),
        status: 'UNREAD'
    }]);
    if (error) throw error;
};
