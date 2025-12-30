import { Article, ArticleStatus, Category, User, UserRole, Ad, AdLocation, AdType, SubmissionStatus, ContactMessage } from '../types';
import { supabase } from '../supabase-config';

// --- CONFIGURATION DU MODE HORS LIGNE ---
// Mettez cette valeur à 'true' pour travailler en local sans toucher à Supabase.
// Mettez 'false' pour que le site se connecte à la vraie base de données.
export const IS_OFFLINE_MODE = true;

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

// Helper to generate dates
const daysAgo = (days: number) => new Date(Date.now() - 86400000 * days).toISOString();

const MOCK_ARTICLES: Article[] = [
  // --- POLITIQUE (Need 5+) ---
  {
    id: '101',
    title: 'Réforme des institutions : Le grand débat national est lancé',
    excerpt: 'Le président de la république a annoncé ce matin le début des consultations pour la nouvelle réforme.',
    content: 'Lorem ipsum dolor sit amet...',
    category: 'Politique',
    imageUrl: 'https://images.unsplash.com/photo-1529101091760-61df6be5d18b?auto=format&fit=crop&q=80&w=1000',
    authorId: 'demo-admin', authorName: 'Administrateur', status: ArticleStatus.PUBLISHED, views: 5000,
    createdAt: daysAgo(0), updatedAt: daysAgo(0)
  },
  {
    id: '102',
    title: 'Assemblée Nationale : Une séance houleuse sur le budget',
    excerpt: 'Les députés se sont affrontés tard dans la nuit concernant les nouvelles mesures fiscales.',
    content: 'Lorem ipsum...',
    category: 'Politique',
    imageUrl: 'https://images.unsplash.com/photo-1555848962-6e79363ec58f?auto=format&fit=crop&q=80&w=1000',
    authorId: 'demo-editor', authorName: 'Éditeur', status: ArticleStatus.PUBLISHED, views: 3200,
    createdAt: daysAgo(1), updatedAt: daysAgo(1)
  },
  {
    id: '103',
    title: 'Élections locales : Les premiers sondages surprennent',
    excerpt: 'Contre toute attente, les candidats indépendants gagnent du terrain dans les zones rurales.',
    content: 'Lorem ipsum...',
    category: 'Politique',
    imageUrl: 'https://images.unsplash.com/photo-1541872703-74c5963631df?auto=format&fit=crop&q=80&w=1000',
    authorId: 'demo-editor', authorName: 'Éditeur', status: ArticleStatus.PUBLISHED, views: 1500,
    createdAt: daysAgo(2), updatedAt: daysAgo(2)
  },
  {
    id: '104',
    title: 'Diplomatie : Visite officielle du chef de l\'État en Chine',
    excerpt: 'Un voyage stratégique pour renforcer les liens économiques entre les deux nations.',
    content: 'Lorem ipsum...',
    category: 'Politique',
    imageUrl: 'https://images.unsplash.com/photo-1596526131083-e8c633c948d2?auto=format&fit=crop&q=80&w=1000',
    authorId: 'demo-admin', authorName: 'Administrateur', status: ArticleStatus.PUBLISHED, views: 4000,
    createdAt: daysAgo(3), updatedAt: daysAgo(3)
  },
  {
    id: '105',
    title: 'Sénat : Adoption de la loi sur la transition énergétique',
    excerpt: 'Le texte a été voté à une large majorité, marquant un tournant écologique.',
    content: 'Lorem ipsum...',
    category: 'Politique',
    imageUrl: 'https://images.unsplash.com/photo-1564998701-d850d9904d9e?auto=format&fit=crop&q=80&w=1000',
    authorId: 'demo-editor', authorName: 'Éditeur', status: ArticleStatus.PUBLISHED, views: 2100,
    createdAt: daysAgo(4), updatedAt: daysAgo(4)
  },

  // --- SOCIÉTÉ (Need 5+) ---
  {
    id: '201',
    title: 'Éducation : Le numérique à l\'école, bilan d\'étape',
    excerpt: 'Deux ans après le lancement du plan numérique, les résultats sont mitigés selon les syndicats.',
    content: 'Lorem ipsum...',
    category: 'Société',
    imageUrl: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=1000',
    authorId: 'demo-contributor', authorName: 'Contributeur', status: ArticleStatus.PUBLISHED, views: 4100,
    createdAt: daysAgo(0), updatedAt: daysAgo(0)
  },
  {
    id: '202',
    title: 'Santé publique : Nouvelle campagne de vaccination',
    excerpt: 'Le ministère de la santé lance une grande campagne pour prévenir la grippe saisonnière.',
    content: 'Lorem ipsum...',
    category: 'Société',
    imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=1000',
    authorId: 'demo-admin', authorName: 'Administrateur', status: ArticleStatus.PUBLISHED, views: 2800,
    createdAt: daysAgo(3), updatedAt: daysAgo(3)
  },
  {
    id: '203',
    title: 'Transports : Grève annoncée pour la semaine prochaine',
    excerpt: 'Les usagers devront prendre leurs précautions, le trafic sera fortement perturbé.',
    content: 'Lorem ipsum...',
    category: 'Société',
    imageUrl: 'https://images.unsplash.com/photo-1530908295418-a12e326966ba?auto=format&fit=crop&q=80&w=1000',
    authorId: 'demo-editor', authorName: 'Éditeur', status: ArticleStatus.PUBLISHED, views: 6000,
    createdAt: daysAgo(1), updatedAt: daysAgo(1)
  },
  {
    id: '204',
    title: 'Logement : La hausse des loyers inquiète les associations',
    excerpt: 'Dans les grandes villes, se loger devient de plus en plus difficile pour les jeunes actifs.',
    content: 'Lorem ipsum...',
    category: 'Société',
    imageUrl: 'https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&q=80&w=1000',
    authorId: 'demo-contributor', authorName: 'Contributeur', status: ArticleStatus.PUBLISHED, views: 3300,
    createdAt: daysAgo(5), updatedAt: daysAgo(5)
  },
  {
    id: '205',
    title: 'Environnement : Les citoyens se mobilisent pour le climat',
    excerpt: 'Des milliers de personnes ont marché dans les rues pour réclamer des actions concrètes.',
    content: 'Lorem ipsum...',
    category: 'Société',
    imageUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb7d5fa5?auto=format&fit=crop&q=80&w=1000',
    authorId: 'demo-editor', authorName: 'Éditeur', status: ArticleStatus.PUBLISHED, views: 4500,
    createdAt: daysAgo(2), updatedAt: daysAgo(2)
  },

  // --- ÉCONOMIE (Need 5+) ---
  {
    id: '301',
    title: 'Bourse : Le CAC 40 atteint un nouveau record historique',
    excerpt: 'L\'optimisme des investisseurs propulse les marchés vers des sommets inédits.',
    content: 'Lorem ipsum...',
    category: 'Économie',
    imageUrl: 'https://images.unsplash.com/photo-1611974765270-ca12586343bb?auto=format&fit=crop&q=80&w=1000',
    authorId: 'demo-admin', authorName: 'Administrateur', status: ArticleStatus.PUBLISHED, views: 5200,
    createdAt: daysAgo(1), updatedAt: daysAgo(1)
  },
  {
    id: '302',
    title: 'Startups : La French Tech lève 1 milliard d\'euros',
    excerpt: 'Un record pour l\'écosystème technologique français qui attire de plus en plus d\'investisseurs.',
    content: 'Lorem ipsum...',
    category: 'Économie',
    imageUrl: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&q=80&w=1000',
    authorId: 'demo-editor', authorName: 'Éditeur', status: ArticleStatus.PUBLISHED, views: 2900,
    createdAt: daysAgo(2), updatedAt: daysAgo(2)
  },
  {
    id: '303',
    title: 'Automobile : Les ventes de voitures électriques explosent',
    excerpt: 'Le bonus écologique et la prise de conscience environnementale boostent le marché.',
    content: 'Lorem ipsum...',
    category: 'Économie',
    imageUrl: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&q=80&w=1000',
    authorId: 'demo-contributor', authorName: 'Contributeur', status: ArticleStatus.PUBLISHED, views: 3600,
    createdAt: daysAgo(4), updatedAt: daysAgo(4)
  },
  {
    id: '304',
    title: 'Inflation : Le pouvoir d\'achat au cœur des préoccupations',
    excerpt: 'La hausse des prix de l\'énergie pèse lourdement sur le budget des ménages.',
    content: 'Lorem ipsum...',
    category: 'Économie',
    imageUrl: 'https://images.unsplash.com/photo-1580519542036-c47de6196ba5?auto=format&fit=crop&q=80&w=1000',
    authorId: 'demo-admin', authorName: 'Administrateur', status: ArticleStatus.PUBLISHED, views: 4800,
    createdAt: daysAgo(0), updatedAt: daysAgo(0)
  },
  {
    id: '305',
    title: 'Tourisme : Une saison estivale exceptionnelle prévue',
    excerpt: 'Les réservations hôtelières sont en hausse de 20% par rapport à l\'année dernière.',
    content: 'Lorem ipsum...',
    category: 'Économie',
    imageUrl: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&q=80&w=1000',
    authorId: 'demo-editor', authorName: 'Éditeur', status: ArticleStatus.PUBLISHED, views: 2500,
    createdAt: daysAgo(5), updatedAt: daysAgo(5)
  },

  // --- INTERNATIONAL (Need 5+) ---
  {
    id: '401',
    title: 'USA : Les élections de mi-mandat approchent',
    excerpt: 'Le pays se prépare à un scrutin décisif pour la suite du mandat présidentiel.',
    content: 'Lorem ipsum...',
    category: 'International',
    imageUrl: 'https://images.unsplash.com/photo-1540910419868-474947ce5ade?auto=format&fit=crop&q=80&w=1000',
    authorId: 'demo-admin', authorName: 'Administrateur', status: ArticleStatus.PUBLISHED, views: 3800,
    createdAt: daysAgo(1), updatedAt: daysAgo(1)
  },
  {
    id: '402',
    title: 'Climat : La COP28 s\'ouvre avec des enjeux majeurs',
    excerpt: 'Les dirigeants du monde entier se réunissent pour tenter de sauver l\'accord de Paris.',
    content: 'Lorem ipsum...',
    category: 'International',
    imageUrl: 'https://images.unsplash.com/photo-1621274790572-7c32596bc67f?auto=format&fit=crop&q=80&w=1000',
    authorId: 'demo-contributor', authorName: 'Contributeur', status: ArticleStatus.PUBLISHED, views: 4200,
    createdAt: daysAgo(2), updatedAt: daysAgo(2)
  },
  {
    id: '403',
    title: 'Espace : La nouvelle mission lunaire est un succès',
    excerpt: 'La fusée a décollé sans encombre et la capsule est en route vers notre satellite.',
    content: 'Lorem ipsum...',
    category: 'International',
    imageUrl: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&q=80&w=1000',
    authorId: 'demo-editor', authorName: 'Éditeur', status: ArticleStatus.PUBLISHED, views: 5500,
    createdAt: daysAgo(3), updatedAt: daysAgo(3)
  },
  {
    id: '404',
    title: 'Europe : Accord trouvé sur la régulation du numérique',
    excerpt: 'Les 27 se sont entendus pour imposer des règles strictes aux géants du web.',
    content: 'Lorem ipsum...',
    category: 'International',
    imageUrl: 'https://images.unsplash.com/photo-1469248612503-0ef66373b984?auto=format&fit=crop&q=80&w=1000',
    authorId: 'demo-admin', authorName: 'Administrateur', status: ArticleStatus.PUBLISHED, views: 2700,
    createdAt: daysAgo(4), updatedAt: daysAgo(4)
  },
  {
    id: '405',
    title: 'Afrique : Un sommet pour le développement durable',
    excerpt: 'Les chefs d\'État africains discutent des priorités pour la croissance du continent.',
    content: 'Lorem ipsum...',
    category: 'International',
    imageUrl: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&q=80&w=1000',
    authorId: 'demo-contributor', authorName: 'Contributeur', status: ArticleStatus.PUBLISHED, views: 3100,
    createdAt: daysAgo(5), updatedAt: daysAgo(5)
  }
];

// --- SIMULATION DES APPELS ASYNCHRONES ---

export const getUsers = async (): Promise<User[]> => {
  if (IS_OFFLINE_MODE) return MOCK_USERS;
  // TODO: Implement Supabase fetch
  return [];
};

export const saveUser = async (user: User): Promise<void> => {
    if (IS_OFFLINE_MODE) {
        const index = MOCK_USERS.findIndex(u => u.id === user.id);
        if (index >= 0) {
            MOCK_USERS[index] = user;
        } else {
            MOCK_USERS.push(user);
        }
        return;
    }
    // TODO: Supabase
};

export const getCategories = async (): Promise<Category[]> => {
  if (IS_OFFLINE_MODE) return MOCK_CATEGORIES;
  const { data, error } = await supabase.from('categories').select('*');
  if (error) throw error;
  return data;
};

export const saveCategory = async (category: Category): Promise<void> => {
    if (IS_OFFLINE_MODE) {
        const index = MOCK_CATEGORIES.findIndex(c => c.id === category.id);
        if (index >= 0) {
            MOCK_CATEGORIES[index] = category;
        } else {
            MOCK_CATEGORIES.push({ ...category, id: Math.random().toString(36).substr(2, 9) });
        }
        return;
    }
    // TODO: Supabase
};

export const deleteCategory = async (id: string): Promise<void> => {
    if (IS_OFFLINE_MODE) {
        const index = MOCK_CATEGORIES.findIndex(c => c.id === id);
        if (index >= 0) MOCK_CATEGORIES.splice(index, 1);
        return;
    }
};

export const getArticles = async (): Promise<Article[]> => {
  if (IS_OFFLINE_MODE) return MOCK_ARTICLES;
  const { data, error } = await supabase.from('articles').select('*');
  if (error) throw error;
  return data;
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
};

export const deleteArticle = async (id: string): Promise<void> => {
    if (IS_OFFLINE_MODE) {
        const index = MOCK_ARTICLES.findIndex(a => a.id === id);
        if (index >= 0) MOCK_ARTICLES.splice(index, 1);
        return;
    }
};

export const incrementArticleViews = async (id: string): Promise<void> => {
    if (IS_OFFLINE_MODE) {
        const article = MOCK_ARTICLES.find(a => a.id === id);
        if (article) {
            article.views = (article.views || 0) + 1;
        }
        return;
    }
    // TODO: Supabase implementation
    const { error } = await supabase.rpc('increment_page_view', { page_id: id });
    if (error) console.error('Error incrementing views:', error);
};

// --- MOCK ADS ---
const MOCK_ADS: Ad[] = [
    { id: 'ad1', title: 'Pub Header', imageUrl: 'https://via.placeholder.com/728x90.png?text=Publicité+728x90', content: 'https://via.placeholder.com/728x90.png?text=Publicité+728x90', targetUrl: '#', linkUrl: '#', location: AdLocation.HEADER_LEADERBOARD, type: AdType.IMAGE, isActive: true, views: 1000, clicks: 50, createdAt: new Date().toISOString() },
    { id: 'ad2', title: 'Pub Sidebar', imageUrl: 'https://via.placeholder.com/300x250.png?text=Publicité+Carrée', content: 'https://via.placeholder.com/300x250.png?text=Publicité+Carrée', targetUrl: '#', linkUrl: '#', location: AdLocation.SIDEBAR_SQUARE, type: AdType.IMAGE, isActive: true, views: 800, clicks: 20, createdAt: new Date().toISOString() },
];

export const getAds = async (): Promise<Ad[]> => {
    if (IS_OFFLINE_MODE) return MOCK_ADS;
    return [];
};

export const getActiveAdByLocation = async (location: AdLocation): Promise<Ad | undefined> => {
    if (IS_OFFLINE_MODE) {
        const eligibleAds = MOCK_ADS.filter(ad => ad.location === location && (ad.isActive || ad.active));
        if (eligibleAds.length === 0) return undefined;
        // Return a random one if multiple exist
        return eligibleAds[Math.floor(Math.random() * eligibleAds.length)];
    }
    // TODO: Supabase implementation
    return undefined;
};

export const saveAd = async (ad: Ad): Promise<void> => {
    if (IS_OFFLINE_MODE) {
        const index = MOCK_ADS.findIndex(a => a.id === ad.id);
        if (index >= 0) {
            MOCK_ADS[index] = ad;
        } else {
            MOCK_ADS.push({ ...ad, id: Math.random().toString(36).substr(2, 9) });
        }
        return;
    }
};

export const deleteAd = async (id: string): Promise<void> => {
    if (IS_OFFLINE_MODE) {
        const index = MOCK_ADS.findIndex(a => a.id === id);
        if (index >= 0) MOCK_ADS.splice(index, 1);
        return;
    }
};

export const deleteUser = async (id: string): Promise<void> => {
    if (IS_OFFLINE_MODE) {
        const index = MOCK_USERS.findIndex(u => u.id === id);
        if (index >= 0) MOCK_USERS.splice(index, 1);
        return;
    }
};

const MOCK_MESSAGES: ContactMessage[] = [];

export const getMessages = async (): Promise<ContactMessage[]> => {
    if (IS_OFFLINE_MODE) return MOCK_MESSAGES;
    return [];
};

export const updateMessageStatus = async (id: string, status: 'READ' | 'ARCHIVED'): Promise<void> => {
    if (IS_OFFLINE_MODE) {
        const msg = MOCK_MESSAGES.find(m => m.id === id);
        if (msg) msg.status = status;
        return;
    }
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
    // TODO: Supabase implementation
};
