import { Article, ArticleStatus, Category, User, UserRole, Ad, AdLocation, AdType } from '../types';

const DB_KEYS = {
    USERS: 'wci_users',
    CATEGORIES: 'wci_categories',
    ARTICLES: 'wci_articles',
    ADS: 'wci_ads'
};

const apiRequest = async (key: string, data?: any) => {
    // Dans un environnement local (XAMPP), on pointe vers le script api.php à la racine
    const API_URL = 'api.php';
    
    try {
        if (data) {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, data })
            });
            if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
            return await res.json();
        } else {
            const res = await fetch(`${API_URL}?action=${key}`);
            if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
            return await res.json();
        }
    } catch (e) {
        console.warn("Backend PHP inaccessible ou erreur. Fallback LocalStorage.", e);
        if (data) {
            localStorage.setItem(key, JSON.stringify(data));
            return { status: 'success' };
        } else {
            const s = localStorage.getItem(key);
            return s ? JSON.parse(s) : [];
        }
    }
};

export const initDB = async () => {
    // On tente de récupérer les utilisateurs depuis l'API PHP
    try {
        const users = await getUsers();
        // Si l'API est vide ou inaccessible, api.php s'auto-initialise normalement.
        // Si on est en mode LocalStorage fallback :
        if (users.length === 0) {
             const defaultUsers: User[] = [
                { id: 'u-admin', name: 'Administrateur', email: 'admin@worldcanalinfo.com', password: 'admin', role: UserRole.ADMIN, avatar: 'https://ui-avatars.com/api/?name=Admin' },
                { id: 'u-editor', name: 'Éditeur', email: 'editor@worldcanalinfo.com', password: 'editor', role: UserRole.EDITOR, avatar: 'https://ui-avatars.com/api/?name=Editor' },
                { id: 'u-contrib', name: 'Contributeur', email: 'contrib@worldcanalinfo.com', password: 'contrib', role: UserRole.CONTRIBUTOR, avatar: 'https://ui-avatars.com/api/?name=Contrib' }
            ];
            const cats = [
                { id: '1', name: 'Politique', slug: 'politique' },
                { id: '2', name: 'Économie', slug: 'economie' },
                { id: '3', name: 'Société', slug: 'societe' },
                { id: '4', name: 'Sport', slug: 'sport' }
            ];
            await apiRequest(DB_KEYS.USERS, defaultUsers);
            await apiRequest(DB_KEYS.CATEGORIES, cats);
        }
    } catch (e) {
        console.error("DB Init Error:", e);
    }
};

export const getUsers = async (): Promise<User[]> => {
    const res = await apiRequest(DB_KEYS.USERS);
    return Array.isArray(res) ? res : [];
};

export const saveUser = async (user: User) => {
    const users = await getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx >= 0) users[idx] = user;
    else users.push(user);
    await apiRequest(DB_KEYS.USERS, users);
};

export const deleteUser = async (id: string) => {
    const users = await getUsers();
    await apiRequest(DB_KEYS.USERS, users.filter(u => u.id !== id));
};

export const getCategories = async (): Promise<Category[]> => {
    const res = await apiRequest(DB_KEYS.CATEGORIES);
    return Array.isArray(res) ? res : [];
};

export const saveCategory = async (category: Category) => {
    const cats = await getCategories();
    const idx = cats.findIndex(c => c.id === category.id);
    if (idx >= 0) cats[idx] = category;
    else cats.push(category);
    await apiRequest(DB_KEYS.CATEGORIES, cats);
};

export const deleteCategory = async (id: string) => {
    const cats = await getCategories();
    await apiRequest(DB_KEYS.CATEGORIES, cats.filter(c => c.id !== id));
};

export const getArticles = async (): Promise<Article[]> => {
    const articles = await apiRequest(DB_KEYS.ARTICLES);
    if (!Array.isArray(articles)) return [];
    return articles.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const getArticleById = async (id: string): Promise<Article | undefined> => {
    const articles = await getArticles();
    return articles.find(a => a.id === id);
};

export const saveArticle = async (article: Article) => {
    const articles = await getArticles();
    const idx = articles.findIndex(a => a.id === article.id);
    if (idx >= 0) articles[idx] = article;
    else articles.push(article);
    await apiRequest(DB_KEYS.ARTICLES, articles);
};

export const deleteArticle = async (id: string) => {
    const articles = await getArticles();
    await apiRequest(DB_KEYS.ARTICLES, articles.filter(a => a.id !== id));
};

export const incrementArticleViews = async (id: string) => {
    const articles = await getArticles();
    const idx = articles.findIndex(a => a.id === id);
    if (idx >= 0) {
        articles[idx].views = (articles[idx].views || 0) + 1;
        await apiRequest(DB_KEYS.ARTICLES, articles);
    }
};

export const getAds = async (): Promise<Ad[]> => {
    const res = await apiRequest(DB_KEYS.ADS);
    return Array.isArray(res) ? res : [];
};

export const getActiveAdByLocation = async (location: AdLocation): Promise<Ad | undefined> => {
    const all = await getAds();
    return all.find(a => a.active && a.location === location);
};

export const saveAd = async (ad: Ad) => {
    const ads = await getAds();
    const idx = ads.findIndex(a => a.id === ad.id);
    if (idx >= 0) ads[idx] = ad;
    else ads.push(ad);
    await apiRequest(DB_KEYS.ADS, ads);
};

export const deleteAd = async (id: string) => {
    const ads = await getAds();
    await apiRequest(DB_KEYS.ADS, ads.filter(a => a.id !== id));
};