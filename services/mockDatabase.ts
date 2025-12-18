import { db, storage } from '../firebase-config';
import { 
    collection, 
    getDocs, 
    doc, 
    setDoc, 
    deleteDoc, 
    updateDoc, 
    query 
} from 'firebase/firestore';
import { 
    ref, 
    uploadString, 
    getDownloadURL 
} from 'firebase/storage';
import { Article, ArticleStatus, Category, User, UserRole, Ad, AdLocation, AdType } from '../types';

// --- HELPERS FOR HYBRID MODE ---
const isFirebaseActive = () => !!db; 

// Local Storage Helper
const getLocal = <T>(key: string, seed: T[]): T[] => {
    try {
        const s = localStorage.getItem(key);
        if (!s) {
            localStorage.setItem(key, JSON.stringify(seed));
            return seed;
        }
        return JSON.parse(s);
    } catch (e) {
        return seed;
    }
};
const setLocal = (key: string, data: any) => localStorage.setItem(key, JSON.stringify(data));

// --- SEED DATA ---
const SEED_USERS: User[] = [
  { id: 'u1', name: 'Super Admin', email: 'admin@worldcanalinfo.com', password: 'admin', role: UserRole.ADMIN, avatar: 'https://ui-avatars.com/api/?name=Admin&background=random' },
  { id: 'u2', name: 'Jean Editor', email: 'editor@worldcanalinfo.com', password: 'editor', role: UserRole.EDITOR, avatar: 'https://i.pravatar.cc/150?u=jean' },
];

const SEED_CATEGORIES: Category[] = [
  { id: 'c1', name: 'Politique', slug: 'Politique' },
  { id: 'c2', name: 'Économie', slug: 'Économie' },
  { id: 'c3', name: 'Société', slug: 'Société' },
  { id: 'c4', name: 'Sport', slug: 'Sport' },
  { id: 'c5', name: 'Culture', slug: 'Culture' },
  { id: 'c6', name: 'International', slug: 'International' },
  { id: 'c7', name: 'Tech', slug: 'Tech' },
];

const SEED_ADS: Ad[] = [
    { id: 'ad1', title: 'Bannière Header', location: AdLocation.HEADER_LEADERBOARD, type: AdType.IMAGE, content: 'https://placehold.co/728x90?text=Espace+Pub+Demo', linkUrl: '#', active: true },
    { id: 'ad2', title: 'Sidebar Carré', location: AdLocation.SIDEBAR_SQUARE, type: AdType.IMAGE, content: 'https://placehold.co/300x250?text=Pub+Carree', linkUrl: '#', active: true }
];

const SEED_ARTICLES: Article[] = [
  {
    id: 'a1',
    title: "Bienvenue sur World Canal Info",
    excerpt: "Votre site est prêt. Configurez Firebase pour sauvegarder vos données dans le Cloud.",
    content: "Ceci est un article de démonstration. Vous pouvez le modifier ou en créer de nouveaux depuis l'espace administration.",
    category: "Politique",
    imageUrl: "https://picsum.photos/800/600?random=1",
    authorId: 'u1',
    authorName: 'Super Admin',
    authorAvatar: 'https://ui-avatars.com/api/?name=Admin',
    status: ArticleStatus.PUBLISHED,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

// --- INITIALISATION DU DB ---
export const initDB = async () => {
    if (isFirebaseActive()) {
        try {
            const cats = await getCategories();
            if (cats.length === 0) {
                console.log("Firebase vide détecté, injection des données initiales...");
                for (const u of SEED_USERS) await setDoc(doc(db, "users", u.id), u);
                for (const c of SEED_CATEGORIES) await setDoc(doc(db, "categories", c.id), c);
                for (const a of SEED_ARTICLES) await setDoc(doc(db, "articles", a.id), a);
                for (const ad of SEED_ADS) await setDoc(doc(db, "ads", ad.id), ad);
            }
        } catch (error) {
            console.error("Erreur init Firebase:", error);
        }
    } else {
        if (!localStorage.getItem('wci_users')) setLocal('wci_users', SEED_USERS);
        if (!localStorage.getItem('wci_categories')) setLocal('wci_categories', SEED_CATEGORIES);
        if (!localStorage.getItem('wci_articles')) setLocal('wci_articles', SEED_ARTICLES);
        if (!localStorage.getItem('wci_ads')) setLocal('wci_ads', SEED_ADS);
    }
};

// --- USERS ---
export const getUsers = async (): Promise<User[]> => {
    if (isFirebaseActive()) {
        try {
            const snap = await getDocs(collection(db, "users"));
            return snap.docs.map(d => ({ ...d.data(), id: d.id } as User));
        } catch (e) { console.error(e); }
    }
    return getLocal('wci_users', SEED_USERS);
};

export const saveUser = async (user: User) => {
    if (isFirebaseActive()) {
        await setDoc(doc(db, "users", user.id), user);
    } else {
        const users = getLocal('wci_users', SEED_USERS);
        const idx = users.findIndex(u => u.id === user.id);
        if (idx >= 0) users[idx] = user;
        else users.push(user);
        setLocal('wci_users', users);
    }
};

export const deleteUser = async (id: string) => {
    if (isFirebaseActive()) {
        await deleteDoc(doc(db, "users", id));
    } else {
        const users = getLocal('wci_users', SEED_USERS);
        setLocal('wci_users', users.filter(u => u.id !== id));
    }
};

// --- CATEGORIES ---
export const getCategories = async (): Promise<Category[]> => {
    if (isFirebaseActive()) {
        try {
            const snap = await getDocs(collection(db, "categories"));
            return snap.docs.map(d => ({ ...d.data(), id: d.id } as Category));
        } catch (e) { console.error(e); }
    }
    return getLocal('wci_categories', SEED_CATEGORIES);
};

export const saveCategory = async (category: Category) => {
    if (isFirebaseActive()) {
        await setDoc(doc(db, "categories", category.id), category);
    } else {
        const cats = getLocal('wci_categories', SEED_CATEGORIES);
        const idx = cats.findIndex(c => c.id === category.id);
        if (idx >= 0) cats[idx] = category;
        else cats.push(category);
        setLocal('wci_categories', cats);
    }
};

export const deleteCategory = async (id: string) => {
    if (isFirebaseActive()) {
        await deleteDoc(doc(db, "categories", id));
    } else {
        const cats = getLocal('wci_categories', SEED_CATEGORIES);
        setLocal('wci_categories', cats.filter(c => c.id !== id));
    }
};

export const updateCategory = async (id: string, newName: string) => {
    if (isFirebaseActive()) {
        const catRef = doc(db, "categories", id);
        const allCats = await getCategories();
        const oldCat = allCats.find(c => c.id === id);
        await updateDoc(catRef, { name: newName, slug: newName });
        if (oldCat) await bulkUpdateArticleCategory(oldCat.name, newName);
    } else {
        const cats = getLocal('wci_categories', SEED_CATEGORIES);
        const cat = cats.find(c => c.id === id);
        if (cat) {
            const oldName = cat.name;
            cat.name = newName;
            cat.slug = newName;
            setLocal('wci_categories', cats);
            await bulkUpdateArticleCategory(oldName, newName);
        }
    }
};

// --- ARTICLES ---
export const getArticles = async (): Promise<Article[]> => {
    if (isFirebaseActive()) {
        try {
            const snap = await getDocs(collection(db, "articles"));
            const list = snap.docs.map(d => ({ ...d.data(), id: d.id } as Article));
            return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        } catch (e) { console.error(e); }
    }
    const articles = getLocal('wci_articles', SEED_ARTICLES) as Article[];
    return articles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const getArticleById = async (id: string): Promise<Article | undefined> => {
    const all = await getArticles();
    return all.find(a => a.id === id);
};

export const saveArticle = async (article: Article) => {
    if (article.imageUrl && article.imageUrl.startsWith('data:')) {
        article.imageUrl = await uploadImageToStorage(article.imageUrl);
    }

    if (isFirebaseActive()) {
        await setDoc(doc(db, "articles", article.id), article);
    } else {
        const articles = getLocal('wci_articles', SEED_ARTICLES) as Article[];
        const idx = articles.findIndex(a => a.id === article.id);
        if (idx >= 0) articles[idx] = article;
        else articles.push(article);
        setLocal('wci_articles', articles);
    }
};

export const deleteArticle = async (id: string) => {
    if (isFirebaseActive()) {
        await deleteDoc(doc(db, "articles", id));
    } else {
        const articles = getLocal('wci_articles', SEED_ARTICLES) as Article[];
        setLocal('wci_articles', articles.filter(a => a.id !== id));
    }
};

export const bulkUpdateArticleCategory = async (oldCategory: string, newCategory: string) => {
    if (isFirebaseActive()) {
        const articles = await getArticles();
        const toUpdate = articles.filter(a => a.category === oldCategory);
        const updatePromises = toUpdate.map(a => 
            updateDoc(doc(db, "articles", a.id), { category: newCategory })
        );
        await Promise.all(updatePromises);
    } else {
        const articles = getLocal('wci_articles', SEED_ARTICLES) as Article[];
        articles.forEach(a => {
            if (a.category === oldCategory) a.category = newCategory;
        });
        setLocal('wci_articles', articles);
    }
};

// --- ADS ---
export const getAds = async (): Promise<Ad[]> => {
    if (isFirebaseActive()) {
        try {
            const snap = await getDocs(collection(db, "ads"));
            return snap.docs.map(d => ({ ...d.data(), id: d.id } as Ad));
        } catch (e) { console.error(e); }
    }
    return getLocal('wci_ads', SEED_ADS);
};

export const getActiveAdByLocation = async (location: AdLocation): Promise<Ad | undefined> => {
    const all = await getAds();
    const active = all.filter(a => a.active && a.location === location);
    return active.length > 0 ? active[active.length - 1] : undefined;
};

export const saveAd = async (ad: Ad) => {
    if (ad.content && ad.content.startsWith('data:') && ad.type !== AdType.SCRIPT) {
        ad.content = await uploadImageToStorage(ad.content);
    }

    if (isFirebaseActive()) {
        await setDoc(doc(db, "ads", ad.id), ad);
    } else {
        const ads = getLocal('wci_ads', SEED_ADS);
        const idx = ads.findIndex(a => a.id === ad.id);
        if (idx >= 0) ads[idx] = ad;
        else ads.push(ad);
        setLocal('wci_ads', ads);
    }
};

export const deleteAd = async (id: string) => {
    if (isFirebaseActive()) {
        await deleteDoc(doc(db, "ads", id));
    } else {
        const ads = getLocal('wci_ads', SEED_ADS);
        setLocal('wci_ads', ads.filter(a => a.id !== id));
    }
};

// --- HELPER STORAGE ---
export const uploadImageToStorage = async (base64String: string): Promise<string> => {
    if (isFirebaseActive() && storage) {
        try {
            const fileName = `uploads/${Date.now()}_img`;
            const storageRef = ref(storage, fileName);
            await uploadString(storageRef, base64String, 'data_url');
            return await getDownloadURL(storageRef);
        } catch (error) {
            console.error("Erreur upload image", error);
            return base64String;
        }
    }
    return base64String;
};
