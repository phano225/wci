
import { Article, ArticleStatus, Category, User, UserRole, Ad, AdLocation, AdType } from '../types';

const DB_KEYS = {
    USERS: 'wci_users',
    CATEGORIES: 'wci_categories',
    ARTICLES: 'wci_articles',
    ADS: 'wci_ads'
};

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const getLocal = <T>(key: string, seed: T[]): T[] => {
    const s = localStorage.getItem(key);
    if (!s) {
        localStorage.setItem(key, JSON.stringify(seed));
        return seed;
    }
    return JSON.parse(s);
};

const setLocal = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
};

// --- SEED DATA ---
const SEED_USERS: User[] = [
  { id: 'u1', name: 'Administrateur', email: 'admin@worldcanalinfo.com', password: 'admin', role: UserRole.ADMIN, avatar: 'https://ui-avatars.com/api/?name=Admin&background=0055a4&color=fff' },
  { id: 'u2', name: 'Jean Rédacteur', email: 'editor@worldcanalinfo.com', password: 'editor', role: UserRole.EDITOR, avatar: 'https://ui-avatars.com/api/?name=Jean+Editor&background=10b981&color=fff' },
  { id: 'u3', name: 'Paul Contributeur', email: 'contrib@worldcanalinfo.com', password: 'contrib', role: UserRole.CONTRIBUTOR, avatar: 'https://ui-avatars.com/api/?name=Paul+Contrib&background=8b5cf6&color=fff' },
];

const SEED_CATEGORIES: Category[] = [
  { id: 'c1', name: 'Politique', slug: 'politique' },
  { id: 'c2', name: 'Économie', slug: 'economie' },
  { id: 'c3', name: 'Société', slug: 'societe' },
  { id: 'c4', name: 'Sport', slug: 'sport' },
  { id: 'c5', name: 'Tech', slug: 'tech' },
];

const SEED_ARTICLES: Article[] = [
  {
    id: 'a1',
    title: "World Canal Info : Lancement de la plateforme",
    excerpt: "Découvrez votre nouveau portail d'information en continu.",
    content: "Contenu de l'article de bienvenue...",
    category: "Politique",
    imageUrl: "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&q=80&w=800",
    authorId: 'u1',
    authorName: 'Administrateur',
    authorAvatar: 'https://ui-avatars.com/api/?name=Admin',
    status: ArticleStatus.PUBLISHED,
    views: 1240,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

// --- DATABASE METHODS ---

export const initDB = async () => {
    getLocal(DB_KEYS.USERS, SEED_USERS);
    getLocal(DB_KEYS.CATEGORIES, SEED_CATEGORIES);
    getLocal(DB_KEYS.ARTICLES, SEED_ARTICLES);
    getLocal(DB_KEYS.ADS, []);
};

// --- USERS ---
export const getUsers = async (): Promise<User[]> => {
    return getLocal(DB_KEYS.USERS, SEED_USERS);
};

export const saveUser = async (user: User) => {
    const users = getLocal<User>(DB_KEYS.USERS, SEED_USERS);
    const idx = users.findIndex(u => u.id === user.id);
    if (idx >= 0) users[idx] = { ...users[idx], ...user };
    else users.push(user);
    setLocal(DB_KEYS.USERS, users);
};

export const deleteUser = async (id: string) => {
    const users = getLocal<User>(DB_KEYS.USERS, SEED_USERS);
    setLocal(DB_KEYS.USERS, users.filter(u => u.id !== id));
};

// --- CATEGORIES ---
export const getCategories = async (): Promise<Category[]> => {
    return getLocal(DB_KEYS.CATEGORIES, SEED_CATEGORIES);
};

export const saveCategory = async (category: Category) => {
    const cats = getLocal<Category>(DB_KEYS.CATEGORIES, SEED_CATEGORIES);
    const idx = cats.findIndex(c => c.id === category.id);
    if (idx >= 0) cats[idx] = category;
    else cats.push(category);
    setLocal(DB_KEYS.CATEGORIES, cats);
};

export const deleteCategory = async (id: string) => {
    const cats = getLocal<Category>(DB_KEYS.CATEGORIES, SEED_CATEGORIES);
    setLocal(DB_KEYS.CATEGORIES, cats.filter(c => c.id !== id));
};

// --- ARTICLES ---
export const getArticles = async (): Promise<Article[]> => {
    const articles = getLocal<Article>(DB_KEYS.ARTICLES, SEED_ARTICLES);
    return articles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const getArticleById = async (id: string): Promise<Article | undefined> => {
    const articles = await getArticles();
    return articles.find(a => a.id === id);
};

export const saveArticle = async (article: Article) => {
    const articles = getLocal<Article>(DB_KEYS.ARTICLES, SEED_ARTICLES);
    const idx = articles.findIndex(a => a.id === article.id);
    if (idx >= 0) articles[idx] = article;
    else articles.push(article);
    setLocal(DB_KEYS.ARTICLES, articles);
};

export const deleteArticle = async (id: string) => {
    const articles = getLocal<Article>(DB_KEYS.ARTICLES, SEED_ARTICLES);
    setLocal(DB_KEYS.ARTICLES, articles.filter(a => a.id !== id));
};

export const incrementArticleViews = async (id: string) => {
    const articles = getLocal<Article>(DB_KEYS.ARTICLES, SEED_ARTICLES);
    const idx = articles.findIndex(a => a.id === id);
    if (idx >= 0) {
        articles[idx].views = (articles[idx].views || 0) + 1;
        setLocal(DB_KEYS.ARTICLES, articles);
    }
};

// --- ADS ---
export const getAds = async (): Promise<Ad[]> => {
    return getLocal(DB_KEYS.ADS, []);
};

export const getActiveAdByLocation = async (location: AdLocation): Promise<Ad | undefined> => {
    const all = await getAds();
    return all.find(a => a.active && a.location === location);
};

export const saveAd = async (ad: Ad) => {
    const ads = getLocal<Ad>(DB_KEYS.ADS, []);
    const idx = ads.findIndex(a => a.id === ad.id);
    if (idx >= 0) ads[idx] = ad;
    else ads.push(ad);
    setLocal(DB_KEYS.ADS, ads);
};

export const deleteAd = async (id: string) => {
    const ads = getLocal<Ad>(DB_KEYS.ADS, []);
    setLocal(DB_KEYS.ADS, ads.filter(a => a.id !== id));
};
