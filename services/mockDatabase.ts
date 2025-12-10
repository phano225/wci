import { Article, ArticleStatus, Category, User, UserRole, Ad, AdLocation, AdType } from '../types';

// Initial Seed Data
const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Super Admin', email: 'admin@worldcanalinfo.com', password: 'admin', role: UserRole.ADMIN, avatar: 'https://ui-avatars.com/api/?name=Admin&background=random' },
  { id: 'u2', name: 'Jean Editor', email: 'editor@worldcanalinfo.com', password: 'editor', role: UserRole.EDITOR, avatar: 'https://i.pravatar.cc/150?u=jean' },
  { id: 'u3', name: 'Paul Contributor', email: 'contrib@worldcanalinfo.com', password: 'contrib', role: UserRole.CONTRIBUTOR, avatar: 'https://i.pravatar.cc/150?u=paul' },
];

const MOCK_CATEGORIES: Category[] = [
  { id: 'c1', name: 'Politique', slug: 'Politique' },
  { id: 'c2', name: 'Économie', slug: 'Économie' },
  { id: 'c3', name: 'Société', slug: 'Société' },
  { id: 'c4', name: 'Sport', slug: 'Sport' },
  { id: 'c5', name: 'Culture', slug: 'Culture' },
  { id: 'c6', name: 'International', slug: 'International' },
  { id: 'c7', name: 'Tech', slug: 'Tech' },
];

// Seed some initial placeholder ads
const MOCK_ADS: Ad[] = [
    {
        id: 'ad1',
        title: 'Bannière Header Défaut',
        location: AdLocation.HEADER_LEADERBOARD,
        type: AdType.IMAGE,
        content: 'https://placehold.co/728x90?text=Publicité+Header+728x90',
        linkUrl: '#',
        active: true
    },
    {
        id: 'ad2',
        title: 'Sidebar Carré Défaut',
        location: AdLocation.SIDEBAR_SQUARE,
        type: AdType.IMAGE,
        content: 'https://placehold.co/300x250?text=Pub+Carrée',
        linkUrl: '#',
        active: true
    }
];

const LoremIpsum = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. \n\nSed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit.";

const MOCK_ARTICLES: Article[] = [
  {
    id: 'a1',
    title: "Le gouvernement annonce un nouveau plan d'infrastructure",
    excerpt: "Le ministre des travaux publics a dévoilé ce matin les grands axes du projet Abidjan 2030.",
    content: LoremIpsum,
    category: "Politique",
    imageUrl: "https://picsum.photos/800/600?random=1",
    authorId: 'u2',
    authorName: 'Jean Editor',
    authorAvatar: 'https://i.pravatar.cc/150?u=jean',
    status: ArticleStatus.PUBLISHED,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'a2',
    title: "CAN 2025 : Les Éléphants en préparation intensive",
    excerpt: "L'équipe nationale a débuté son stage de préparation à Korhogo avec un effectif complet.",
    content: LoremIpsum,
    category: "Sport",
    imageUrl: "https://picsum.photos/800/600?random=2",
    authorId: 'u2',
    authorName: 'Jean Editor',
    authorAvatar: 'https://i.pravatar.cc/150?u=jean',
    status: ArticleStatus.PUBLISHED,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'a3',
    title: "Innovation : Une start-up locale lève 5 millions d'euros",
    excerpt: "La Tech africaine en plein essor avec cette nouvelle levée de fonds historique.",
    content: LoremIpsum,
    category: "Économie",
    imageUrl: "https://picsum.photos/800/600?random=3",
    authorId: 'u3',
    authorName: 'Paul Contributor',
    authorAvatar: 'https://i.pravatar.cc/150?u=paul',
    status: ArticleStatus.PUBLISHED,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'a4',
    title: "Festival des Arts : Une édition record attendue",
    excerpt: "Plus de 50 000 visiteurs sont attendus pour ce week-end culturel.",
    content: LoremIpsum,
    category: "Culture",
    imageUrl: "https://picsum.photos/800/600?random=4",
    authorId: 'u2',
    authorName: 'Jean Editor',
    authorAvatar: 'https://i.pravatar.cc/150?u=jean',
    status: ArticleStatus.PUBLISHED,
    createdAt: new Date(Date.now() - 200000000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'a5',
    title: "Climat : Les nouvelles mesures entrent en vigueur",
    excerpt: "Comprendre l'impact des nouvelles lois environnementales sur votre quotidien.",
    content: LoremIpsum,
    category: "Société",
    imageUrl: "https://picsum.photos/800/600?random=5",
    authorId: 'u3',
    authorName: 'Paul Contributor',
    authorAvatar: 'https://i.pravatar.cc/150?u=paul',
    status: ArticleStatus.PUBLISHED,
    createdAt: new Date(Date.now() - 250000000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'a6',
    title: "Diplomatie : Visite officielle du président en Europe",
    excerpt: "Des accords bilatéraux importants devraient être signés.",
    content: LoremIpsum,
    category: "International",
    imageUrl: "https://picsum.photos/800/600?random=6",
    authorId: 'u2',
    authorName: 'Jean Editor',
    authorAvatar: 'https://i.pravatar.cc/150?u=jean',
    status: ArticleStatus.PUBLISHED,
    createdAt: new Date(Date.now() - 300000000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'a7',
    title: "Nouveau Smartphone : Révolution ou évolution ?",
    excerpt: "Notre test complet du dernier modèle qui fait parler de lui.",
    content: LoremIpsum,
    category: "Tech",
    imageUrl: "https://picsum.photos/800/600?random=7",
    authorId: 'u3',
    authorName: 'Paul Contributor',
    authorAvatar: 'https://i.pravatar.cc/150?u=paul',
    status: ArticleStatus.SUBMITTED,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// LocalStorage Keys
const USERS_KEY = 'wci_users';
const ARTICLES_KEY = 'wci_articles';
const CATEGORIES_KEY = 'wci_categories';
const ADS_KEY = 'wci_ads';

// Initialize DB
export const initDB = () => {
  if (!localStorage.getItem(USERS_KEY)) {
    localStorage.setItem(USERS_KEY, JSON.stringify(MOCK_USERS));
  }
  if (!localStorage.getItem(ARTICLES_KEY)) {
    localStorage.setItem(ARTICLES_KEY, JSON.stringify(MOCK_ARTICLES));
  }
  if (!localStorage.getItem(CATEGORIES_KEY)) {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(MOCK_CATEGORIES));
  }
  if (!localStorage.getItem(ADS_KEY)) {
    localStorage.setItem(ADS_KEY, JSON.stringify(MOCK_ADS));
  }
};

// User Operations
export const getUsers = (): User[] => JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
export const getUserById = (id: string): User | undefined => getUsers().find(u => u.id === id);

export const saveUser = (user: User) => {
  const users = getUsers();
  const index = users.findIndex(u => u.id === user.id);
  if (index >= 0) {
    users[index] = user;
  } else {
    users.push(user);
  }
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const deleteUser = (id: string) => {
  const users = getUsers().filter(u => u.id !== id);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

// Category Operations
export const getCategories = (): Category[] => JSON.parse(localStorage.getItem(CATEGORIES_KEY) || '[]');

export const saveCategory = (category: Category) => {
    const categories = getCategories();
    const index = categories.findIndex(c => c.id === category.id);
    if (index >= 0) {
        categories[index] = category;
    } else {
        categories.push(category);
    }
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
};

export const deleteCategory = (id: string) => {
    const categories = getCategories().filter(c => c.id !== id);
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
};

// Article Operations
export const getArticles = (): Article[] => JSON.parse(localStorage.getItem(ARTICLES_KEY) || '[]');
export const getArticleById = (id: string): Article | undefined => getArticles().find(a => a.id === id);

export const saveArticle = (article: Article) => {
  const articles = getArticles();
  const index = articles.findIndex(a => a.id === article.id);
  if (index >= 0) {
    articles[index] = article;
  } else {
    articles.unshift(article);
  }
  localStorage.setItem(ARTICLES_KEY, JSON.stringify(articles));
};

export const deleteArticle = (id: string) => {
  const articles = getArticles().filter(a => a.id !== id);
  localStorage.setItem(ARTICLES_KEY, JSON.stringify(articles));
};

// Ad Operations
export const getAds = (): Ad[] => JSON.parse(localStorage.getItem(ADS_KEY) || '[]');
export const getActiveAdByLocation = (location: AdLocation): Ad | undefined => {
    // Return the most recently updated active ad for this location
    const ads = getAds().filter(a => a.active && a.location === location);
    // In a real app, you might rotate them or pick random. Here we pick the last one active.
    return ads.length > 0 ? ads[ads.length - 1] : undefined;
};

export const saveAd = (ad: Ad) => {
    const ads = getAds();
    const index = ads.findIndex(a => a.id === ad.id);
    if (index >= 0) {
        ads[index] = ad;
    } else {
        ads.push(ad);
    }
    localStorage.setItem(ADS_KEY, JSON.stringify(ads));
};

export const deleteAd = (id: string) => {
    const ads = getAds().filter(a => a.id !== id);
    localStorage.setItem(ADS_KEY, JSON.stringify(ads));
};