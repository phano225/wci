import { Article, ArticleStatus, Category, User, UserRole, Ad, AdLocation, AdType, SubmissionStatus } from '../types';
import { supabase } from '../supabase-config';

// --- DONNÉES DE FALLBACK (MODE HORS LIGNE / DÉMO) ---

const MOCK_USERS: User[] = [
  { id: 'demo-admin', name: 'Administrateur', email: 'admin@worldcanalinfo.com', role: UserRole.ADMIN, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin' },
  { id: 'demo-editor', name: 'Éditeur', email: 'editor@worldcanalinfo.com', role: UserRole.EDITOR, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=editor' },
  { id: 'demo-contributor', name: 'Contributeur', email: 'contrib@worldcanalinfo.com', role: UserRole.CONTRIBUTOR, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=contrib' }
];

const MOCK_CATEGORIES: Category[] = [
  { id: '1', name: 'Canaux de France', slug: 'canaux-france' },
  { id: '2', name: 'Canaux d\'Europe', slug: 'canaux-europe' },
  { id: '3', name: 'Tourisme Fluvial', slug: 'tourisme-fluvial' },
  { id: '4', name: 'Histoire', slug: 'histoire' },
  { id: '5', name: 'Écologie', slug: 'ecologie' }
];

const MOCK_ARTICLES: Article[] = [
  {
    id: '1',
    title: 'Découverte du Canal du Midi',
    excerpt: 'Un voyage inoubliable au fil de l\'eau sur l\'un des plus beaux canaux du monde.',
    content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
    category: 'canaux-france',
    imageUrl: 'https://images.unsplash.com/photo-1594322436404-5a0526db4d13?auto=format&fit=crop&q=80&w=1000',
    authorId: 'demo-admin',
    authorName: 'Administrateur',
    status: ArticleStatus.PUBLISHED,
    views: 1250,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: '2',
    title: 'Les écluses de Fonseranes',
    excerpt: 'Zoom sur cet ouvrage d\'art exceptionnel composé de 9 écluses en enfilade.',
    content: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
    category: 'histoire',
    imageUrl: 'https://images.unsplash.com/photo-1626084478832-7201335952c4?auto=format&fit=crop&q=80&w=1000',
    authorId: 'demo-editor',
    authorName: 'Éditeur',
    status: ArticleStatus.PUBLISHED,
    views: 890,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 5).toISOString()
  },
  {
    id: '3',
    title: 'Naviguer en Bourgogne',
    excerpt: 'Conseils et itinéraires pour une croisière réussie en Bourgogne.',
    content: 'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.',
    category: 'tourisme-fluvial',
    imageUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=1000',
    authorId: 'demo-contributor',
    authorName: 'Contributeur',
    status: ArticleStatus.DRAFT,
    views: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const MOCK_ADS: Ad[] = [
  {
    id: '1',
    title: 'Publicité Location Bateau',
    location: AdLocation.SIDEBAR_SQUARE,
    type: AdType.IMAGE,
    content: 'https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?auto=format&fit=crop&q=80&w=500',
    linkUrl: '#',
    active: true
  }
];

// --- HELPER MAPPING FUNCTIONS ---

const mapArticleFromDB = (data: any): Article => ({
    ...data,
    imageUrl: data.imageurl || data.imageUrl,
    videoUrl: data.videourl || data.videoUrl,
    authorId: data.authorid || data.authorId,
    authorName: data.authorname || data.authorName,
    authorAvatar: data.authoravatar || data.authorAvatar,
    createdAt: data.createdat || data.createdAt,
    updatedAt: data.updatedat || data.updatedAt,
    // Workflow mapping (DB snake_case to TS camelCase)
    submittedBy: data.submitted_by || data.submittedBy,
    submittedAt: data.submitted_at || data.submittedAt,
    submissionStatus: data.submission_status || data.submissionStatus,
    reviewedBy: data.reviewed_by || data.reviewedBy,
    reviewedAt: data.reviewed_at || data.reviewedAt,
    reviewComments: data.review_comments || data.reviewComments
});

const mapArticleToDB = (article: Article) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { 
        imageUrl, videoUrl, authorId, authorName, authorAvatar, createdAt, updatedAt,
        submittedBy, submittedAt, submissionStatus, reviewedBy, reviewedAt, reviewComments,
        ...rest 
    } = article;
    
    return {
        ...rest,
        imageurl: imageUrl,
        videourl: videoUrl,
        authorid: authorId,
        authorname: authorName,
        authoravatar: authorAvatar,
        createdat: createdAt,
        updatedat: updatedAt,
        // Workflow mapping
        submitted_by: submittedBy,
        submitted_at: submittedAt,
        submission_status: submissionStatus,
        reviewed_by: reviewedBy,
        reviewed_at: reviewedAt,
        review_comments: reviewComments
    };
};

const mapAdFromDB = (data: any): Ad => ({
    ...data,
    linkUrl: data.linkurl || data.linkUrl
});

const mapAdToDB = (ad: Ad) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { linkUrl, ...rest } = ad;
    return {
        ...rest,
        linkurl: linkUrl
    };
};

// --- FONCTIONS WRAPPER AVEC FALLBACK ET MAPPING ---

export const getUsers = async (): Promise<User[]> => {
  try {
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('Pas de données');
    return data;
  } catch (error) {
    console.warn('Fallback Mock (getUsers): Utilisation des données fictives.', error);
    return MOCK_USERS;
  }
};

export const saveUser = async (user: User) => {
  try {
    const { error } = await supabase.from('users').upsert(user);
    if (error) throw error;
  } catch (error) {
    console.warn('Fallback Mock (saveUser): Action simulée.', error);
    const index = MOCK_USERS.findIndex(u => u.id === user.id);
    if (index >= 0) MOCK_USERS[index] = user;
    else MOCK_USERS.push(user);
  }
};

export const deleteUser = async (id: string) => {
  try {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw error;
  } catch (error) {
    console.warn('Fallback Mock (deleteUser): Action simulée.', error);
  }
};

export const getCategories = async (): Promise<Category[]> => {
  try {
    const { data, error } = await supabase.from('categories').select('*');
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('Pas de données');
    return data;
  } catch (error) {
    console.warn('Fallback Mock (getCategories): Utilisation des données fictives.', error);
    return MOCK_CATEGORIES;
  }
};

export const saveCategory = async (category: Category) => {
  try {
    const { error } = await supabase.from('categories').upsert(category);
    if (error) throw error;
  } catch (error) {
    console.warn('Fallback Mock (saveCategory): Action simulée.', error);
  }
};

export const deleteCategory = async (id: string) => {
  try {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
  } catch (error) {
    console.warn('Fallback Mock (deleteCategory): Action simulée.', error);
  }
};

export const getArticles = async (): Promise<Article[]> => {
  try {
    const { data, error } = await supabase.from('articles').select('*').order('createdat', { ascending: false });
    
    if (error) {
        // Retry with camelCase if order failed
        console.warn('Erreur tri createdat, tentative sans tri ou avec createdAt', error);
        const retry = await supabase.from('articles').select('*');
        if (retry.error) throw retry.error;
        return (retry.data || []).map(mapArticleFromDB);
    }
    
    if (!data || data.length === 0) throw new Error('Pas de données');
    return data.map(mapArticleFromDB);
  } catch (error) {
    console.warn('Fallback Mock (getArticles): Utilisation des données fictives.', error);
    return MOCK_ARTICLES;
  }
};

export const getArticleById = async (id: string): Promise<Article | undefined> => {
  try {
    const { data, error } = await supabase.from('articles').select('*').eq('id', id).single();
    if (error) throw error;
    return mapArticleFromDB(data);
  } catch (error) {
    console.warn('Fallback Mock (getArticleById): Utilisation des données fictives.', error);
    return MOCK_ARTICLES.find(a => a.id === id);
  }
};

export const saveArticle = async (article: Article) => {
  try {
    const dbArticle = mapArticleToDB(article);
    const { error } = await supabase.from('articles').upsert(dbArticle);
    if (error) throw error;
  } catch (error) {
    console.warn('Fallback Mock (saveArticle): Action simulée.', error);
  }
};

export const deleteArticle = async (id: string) => {
  try {
    const { error } = await supabase.from('articles').delete().eq('id', id);
    if (error) throw error;
  } catch (error) {
    console.warn('Fallback Mock (deleteArticle): Action simulée.', error);
  }
};

export const incrementArticleViews = async (id: string) => {
  try {
    const { error } = await supabase.rpc('increment_views', { article_id: id });
    if (error) throw error;
  } catch (error) {
    console.warn('Fallback Mock (incrementArticleViews): Action simulée.', error);
  }
};

export const getAds = async (): Promise<Ad[]> => {
  try {
    const { data, error } = await supabase.from('ads').select('*');
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('Pas de données');
    return data.map(mapAdFromDB);
  } catch (error) {
    console.warn('Fallback Mock (getAds): Utilisation des données fictives.', error);
    return MOCK_ADS;
  }
};

export const getActiveAdByLocation = async (location: AdLocation): Promise<Ad | undefined> => {
  try {
    const { data, error } = await supabase.from('ads').select('*').eq('active', true).eq('location', location).single();
    if (error) throw error;
    return mapAdFromDB(data);
  } catch (error) {
    console.warn('Fallback Mock (getActiveAdByLocation): Utilisation des données fictives.', error);
    return MOCK_ADS.find(ad => ad.location === location && ad.active);
  }
};

export const saveAd = async (ad: Ad) => {
  try {
    const dbAd = mapAdToDB(ad);
    const { error } = await supabase.from('ads').upsert(dbAd);
    if (error) throw error;
  } catch (error) {
    console.warn('Fallback Mock (saveAd): Action simulée.', error);
  }
};

export const deleteAd = async (id: string) => {
  try {
    const { error } = await supabase.from('ads').delete().eq('id', id);
    if (error) throw error;
  } catch (error) {
    console.warn('Fallback Mock (deleteAd): Action simulée.', error);
  }
};
