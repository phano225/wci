
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
    getArticles, 
    saveArticle, 
    deleteArticle, 
    getCategories, 
    saveCategory, 
    deleteCategory,
    getAds, 
    saveAd, 
    deleteAd,
    getUsers,
    saveUser,
    deleteUser
} from '../services/mockDatabase';
import { generateSEOMeta, generateArticleDraft } from '../services/aiService';
import { Article, ArticleStatus, Category, Ad, AdType, AdLocation, UserRole, User, PERMISSIONS } from '../types';
import { useNavigate } from 'react-router-dom';

export const AdminDashboard = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'articles' | 'categories' | 'ads' | 'users'>('articles');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  
  const [currentArticle, setCurrentArticle] = useState<Partial<Article>>({});
  const [currentCategory, setCurrentCategory] = useState<Partial<Category>>({});
  const [currentAd, setCurrentAd] = useState<Partial<Ad>>({});
  const [currentEditUser, setCurrentEditUser] = useState<Partial<User>>({});
  
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    loadData();
  }, [user, activeTab]);

  const loadData = async () => {
    setIsProcessing(true);
    try {
        const [arts, cats, adsList, userList] = await Promise.all([
            getArticles(), getCategories(), getAds(), getUsers()
        ]);
        setArticles(user?.role === UserRole.CONTRIBUTOR ? arts.filter(a => a.authorId === user.id) : arts);
        setCategories(cats);
        setAds(adsList);
        setStaff(userList);
    } catch (e) { console.error(e); }
    setIsProcessing(false);
  };

  // --- WYSIWYG COMMANDS ---
  const execCommand = (command: string, value: string = '') => {
    if (command === 'createLink') {
        const url = prompt('Entrez l\'URL du lien (ex: https://google.fr) :');
        if (url) document.execCommand(command, false, url);
    } else {
        document.execCommand(command, false, value);
    }
    if (editorRef.current) editorRef.current.focus();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target?.result as string;
            // Insérer l'image dans l'éditeur à la position du curseur
            const img = `<img src="${base64}" class="max-w-full rounded-2xl shadow-lg my-6" />`;
            document.execCommand('insertHTML', false, img);
        };
        reader.readAsDataURL(file);
    }
  };

  // --- ACTIONS HANDLERS ---
  const handleSaveArticle = async (statusOverride?: ArticleStatus) => {
    if (!currentArticle.title || !user) { alert("Le titre est requis."); return; }
    setIsProcessing(true);
    const content = editorRef.current?.innerHTML || '';
    const articleToSave: Article = {
        id: currentArticle.id || Date.now().toString(),
        title: currentArticle.title,
        excerpt: currentArticle.excerpt || '',
        content: content,
        category: currentArticle.category || categories[0]?.name || 'Général',
        imageUrl: currentArticle.imageUrl || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&q=80&w=800',
        videoUrl: currentArticle.videoUrl || '',
        authorId: currentArticle.authorId || user.id,
        authorName: currentArticle.authorName || user.name,
        authorAvatar: currentArticle.authorAvatar || user.avatar,
        status: statusOverride || currentArticle.status || ArticleStatus.DRAFT,
        views: currentArticle.views || 0,
        createdAt: currentArticle.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    await saveArticle(articleToSave);
    setIsEditorOpen(false);
    await loadData();
    setIsProcessing(false);
  };

  const handleSaveCategory = async () => {
    if (!currentCategory.name) return;
    setIsProcessing(true);
    await saveCategory({
        id: currentCategory.id || Date.now().toString(),
        name: currentCategory.name,
        slug: currentCategory.name.toLowerCase().replace(/\s+/g, '-')
    });
    setIsCategoryModalOpen(false);
    await loadData();
    setIsProcessing(false);
  };

  const handleSaveAd = async () => {
    if (!currentAd.title || !currentAd.content) return;
    setIsProcessing(true);
    await saveAd({
        id: currentAd.id || Date.now().toString(),
        title: currentAd.title,
        location: currentAd.location as AdLocation,
        type: currentAd.type as AdType,
        content: currentAd.content,
        linkUrl: currentAd.linkUrl,
        active: currentAd.active !== undefined ? currentAd.active : true
    });
    setIsAdModalOpen(false);
    await loadData();
    setIsProcessing(false);
  };

  const handleSaveUser = async () => {
    if (!currentEditUser.name || !currentEditUser.email) return;
    setIsProcessing(true);
    const data: User = {
        id: currentEditUser.id || `u-${Date.now()}`,
        name: currentEditUser.name,
        email: currentEditUser.email,
        password: currentEditUser.password || 'password',
        role: currentEditUser.role as UserRole,
        avatar: currentEditUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentEditUser.name)}`
    };
    if (currentEditUser.id === user?.id) updateUser(data);
    else await saveUser(data);
    setIsUserModalOpen(false);
    await loadData();
    setIsProcessing(false);
  };

  // --- AI FEATURES ---
  const handleAIFill = async () => {
    if (!currentArticle.title) { alert("Entrez un titre d'abord"); return; }
    setIsProcessing(true);
    try {
        const res = await generateArticleDraft(currentArticle.title, currentArticle.category || 'Information');
        if (editorRef.current) {
            editorRef.current.innerHTML = res.replace(/\n/g, '<br/>');
            setCurrentArticle(prev => ({ ...prev, content: editorRef.current?.innerHTML }));
        }
    } catch (e) {
        alert("L'IA n'a pas pu répondre. Vérifiez votre clé API.");
    }
    setIsProcessing(false);
  };

  const handleAISummary = async () => {
    const content = editorRef.current?.innerText || '';
    if (content.length < 20) { alert("Veuillez d'abord rédiger du contenu."); return; }
    setIsProcessing(true);
    const summary = await generateSEOMeta(currentArticle.title || '', content);
    setCurrentArticle(prev => ({ ...prev, excerpt: summary }));
    setIsProcessing(false);
  };

  const canAds = user ? PERMISSIONS.canManageAds(user.role) : false;
  const canStaff = user ? PERMISSIONS.canManageUsers(user.role) : false;
  const canCats = user ? PERMISSIONS.canManageCategories(user.role) : false;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-72 bg-brand-dark text-white flex flex-col fixed h-full shadow-2xl z-40">
        <div className="p-10 text-center border-b border-white/5">
            <h2 className="text-3xl font-serif font-black text-brand-yellow tracking-tighter leading-none">WCI <span className="text-white">Admin</span></h2>
            <p className="text-[10px] uppercase tracking-widest mt-2 text-gray-500 font-bold">Système Central</p>
        </div>
        <nav className="flex-1 p-6 space-y-2">
            <button onClick={() => setActiveTab('articles')} className={`w-full text-left px-5 py-4 rounded-2xl flex items-center gap-4 transition-all ${activeTab === 'articles' ? 'bg-brand-blue shadow-lg shadow-blue-500/20' : 'opacity-40 hover:opacity-100'}`}>
                <span className="text-xl">📄</span> <span className="font-bold">Articles</span>
            </button>
            {canCats && (
                <button onClick={() => setActiveTab('categories')} className={`w-full text-left px-5 py-4 rounded-2xl flex items-center gap-4 transition-all ${activeTab === 'categories' ? 'bg-brand-blue shadow-lg shadow-blue-500/20' : 'opacity-40 hover:opacity-100'}`}>
                    <span className="text-xl">🏷️</span> <span className="font-bold">Rubriques</span>
                </button>
            )}
            {canAds && (
                <button onClick={() => setActiveTab('ads')} className={`w-full text-left px-5 py-4 rounded-2xl flex items-center gap-4 transition-all ${activeTab === 'ads' ? 'bg-brand-blue shadow-lg shadow-blue-500/20' : 'opacity-40 hover:opacity-100'}`}>
                    <span className="text-xl">📢</span> <span className="font-bold">Publicités</span>
                </button>
            )}
            {canStaff && (
                <button onClick={() => setActiveTab('users')} className={`w-full text-left px-5 py-4 rounded-2xl flex items-center gap-4 transition-all ${activeTab === 'users' ? 'bg-brand-blue shadow-lg shadow-blue-500/20' : 'opacity-40 hover:opacity-100'}`}>
                    <span className="text-xl">👥</span> <span className="font-bold">Équipe</span>
                </button>
            )}
        </nav>
        <div className="p-6 border-t border-white/5">
            <div className="flex items-center gap-4 mb-6 p-3 bg-white/5 rounded-2xl cursor-pointer hover:bg-white/10 transition-all" onClick={() => { setCurrentEditUser(user || {}); setIsUserModalOpen(true); }}>
                <img src={user?.avatar} className="w-10 h-10 rounded-full border-2 border-brand-yellow" alt="" />
                <div className="flex-1 overflow-hidden">
                    <p className="font-black text-xs truncate">{user?.name}</p>
                    <p className="text-[8px] opacity-40 uppercase font-black tracking-widest">{user?.role}</p>
                </div>
            </div>
            <button onClick={logout} className="w-full py-4 bg-brand-red text-white text-[10px] font-black rounded-xl uppercase tracking-widest hover:brightness-110 transition-all shadow-xl">Déconnexion</button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="ml-72 flex-1 p-12 overflow-y-auto">
        <header className="flex justify-between items-end mb-16">
            <div>
                <h1 className="text-5xl font-serif font-black text-brand-dark uppercase tracking-tighter">
                    {activeTab === 'articles' ? 'Articles' : activeTab === 'categories' ? 'Rubriques' : activeTab === 'ads' ? 'Régie Pub' : 'Rédaction'}
                </h1>
                <div className="h-1.5 w-20 bg-brand-red mt-3 rounded-full"></div>
            </div>
            <div className="flex gap-4">
                {activeTab === 'articles' && (
                    <button onClick={() => { setCurrentArticle({}); setIsEditorOpen(true); }} className="bg-brand-blue text-white px-10 py-4 rounded-2xl font-black shadow-2xl hover:scale-105 transition-all">+ NOUVEL ARTICLE</button>
                )}
                {activeTab === 'categories' && (
                    <button onClick={() => { setCurrentCategory({}); setIsCategoryModalOpen(true); }} className="bg-brand-blue text-white px-10 py-4 rounded-2xl font-black shadow-2xl hover:scale-105 transition-all">+ NOUVELLE RUBRIQUE</button>
                )}
                {activeTab === 'ads' && (
                    <button onClick={() => { setCurrentAd({location: AdLocation.HEADER_LEADERBOARD, type: AdType.IMAGE, active: true}); setIsAdModalOpen(true); }} className="bg-brand-blue text-white px-10 py-4 rounded-2xl font-black shadow-2xl hover:scale-105 transition-all">+ CRÉER UNE PUB</button>
                )}
                {activeTab === 'users' && (
                    <button onClick={() => { setCurrentEditUser({role: UserRole.CONTRIBUTOR, password: ''}); setIsUserModalOpen(true); }} className="bg-brand-blue text-white px-10 py-4 rounded-2xl font-black shadow-2xl hover:scale-105 transition-all">+ AJOUTER STAFF</button>
                )}
            </div>
        </header>

        {/* Tab Lists */}
        {activeTab === 'articles' && (
            <div className="space-y-6">
                {articles.map(art => (
                    <div key={art.id} className="bg-white p-6 rounded-[40px] border border-gray-100 flex items-center justify-between group hover:shadow-2xl transition-all shadow-sm">
                        <div className="flex items-center gap-8">
                            <div className="w-20 h-20 rounded-3xl overflow-hidden bg-gray-100 shadow-inner">
                                <img src={art.imageUrl} className="w-full h-full object-cover" alt="" />
                            </div>
                            <div>
                                <h3 className="font-bold text-2xl text-gray-900 group-hover:text-brand-blue transition-colors">{art.title}</h3>
                                <p className="text-[11px] font-black uppercase text-gray-400 mt-2 tracking-widest">
                                    <span className="text-brand-red">{art.category}</span> • <span className={art.status === ArticleStatus.PUBLISHED ? 'text-green-500' : 'text-orange-400'}>{art.status}</span> • {art.views} lectures
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => { setCurrentArticle(art); setIsEditorOpen(true); }} className="text-brand-blue font-black text-[10px] uppercase tracking-widest px-8 py-4 bg-blue-50 rounded-2xl hover:bg-brand-blue hover:text-white transition-all shadow-sm">Éditer</button>
                            <button onClick={() => { if(confirm('Supprimer cet article ?')) deleteArticle(art.id).then(loadData); }} className="text-brand-red font-black text-xl px-5 py-4 hover:bg-red-50 rounded-2xl transition-all">✕</button>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {activeTab === 'categories' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {categories.map(cat => (
                    <div key={cat.id} className="bg-white p-12 rounded-[50px] shadow-sm border border-gray-100 group hover:bg-brand-blue transition-all relative overflow-hidden">
                        <h3 className="text-4xl font-black text-brand-dark group-hover:text-white uppercase tracking-tighter leading-none">{cat.name}</h3>
                        <p className="text-xs font-mono opacity-40 mt-3 group-hover:text-white group-hover:opacity-70">/{cat.slug}</p>
                        <div className="mt-12 flex gap-4 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => { setCurrentCategory(cat); setIsCategoryModalOpen(true); }} className="px-8 py-3 bg-white text-brand-blue rounded-2xl font-black text-[10px] uppercase shadow-lg">Modifier</button>
                            <button onClick={() => { if(confirm('Supprimer cette rubrique ?')) deleteCategory(cat.id).then(loadData); }} className="px-8 py-3 bg-brand-red text-white rounded-2xl font-black text-[10px] uppercase shadow-lg">Supprimer</button>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {activeTab === 'ads' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {ads.map(ad => (
                    <div key={ad.id} className="bg-white p-12 rounded-[50px] shadow-sm border border-gray-100 flex flex-col justify-between group hover:shadow-2xl transition-all">
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <div className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${ad.active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                    {ad.active ? 'Active' : 'Inactive'}
                                </div>
                                <span className="text-[10px] font-black text-brand-blue/50">{ad.type}</span>
                            </div>
                            <h4 className="text-[10px] font-black uppercase text-brand-blue tracking-widest mb-1">{ad.location.replace(/_/g, ' ')}</h4>
                            <h3 className="text-3xl font-serif font-black text-brand-dark mb-6 leading-tight">{ad.title}</h3>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => { setCurrentAd(ad); setIsAdModalOpen(true); }} className="flex-1 py-5 bg-gray-50 text-brand-dark rounded-[25px] font-black text-[10px] uppercase hover:bg-brand-blue hover:text-white transition-all shadow-sm">Modifier</button>
                            <button onClick={() => { if(confirm('Supprimer cette pub ?')) deleteAd(ad.id).then(loadData); }} className="px-6 py-5 bg-red-50 text-brand-red rounded-[25px] font-black text-[10px] hover:bg-brand-red hover:text-white transition-all">✕</button>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {activeTab === 'users' && (
            <div className="bg-white rounded-[50px] shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50/50 border-b">
                        <tr>
                            <th className="px-12 py-8 text-[11px] font-black uppercase text-gray-400 tracking-widest">Collaborateur</th>
                            <th className="px-12 py-8 text-[11px] font-black uppercase text-gray-400 tracking-widest">Rôle</th>
                            <th className="px-12 py-8 text-[11px] font-black uppercase text-gray-400 tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {staff.map(m => (
                            <tr key={m.id} className="hover:bg-blue-50/20 transition-all group">
                                <td className="px-12 py-8 flex items-center gap-6">
                                    <img src={m.avatar} className="w-14 h-14 rounded-full border-2 border-white shadow-md" alt="" />
                                    <div>
                                        <p className="font-bold text-lg text-gray-900">{m.name}</p>
                                        <p className="text-xs text-gray-400 font-medium">{m.email}</p>
                                    </div>
                                </td>
                                <td className="px-12 py-8">
                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${m.role === UserRole.ADMIN ? 'bg-brand-red/10 text-brand-red' : 'bg-brand-blue/10 text-brand-blue'}`}>
                                        {m.role}
                                    </span>
                                </td>
                                <td className="px-12 py-8 text-right">
                                    <button onClick={() => { setCurrentEditUser(m); setShowPassword(false); setIsUserModalOpen(true); }} className="text-brand-blue font-black text-[11px] uppercase tracking-widest mr-8 hover:underline">Éditer</button>
                                    {m.id !== user?.id && (
                                        <button onClick={() => { if(confirm('Révoquer ce membre ?')) deleteUser(m.id).then(loadData); }} className="text-brand-red font-black text-[11px] uppercase tracking-widest">Révoquer</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
      </main>

      {/* --- STUDIO DE RÉDACTION WYSIWYG --- */}
      {isEditorOpen && (
        <div className="fixed inset-0 bg-white z-[100] flex flex-col animate-in slide-in-from-bottom duration-500 overflow-hidden">
            <header className="px-12 py-6 border-b flex justify-between items-center bg-white sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-10">
                    <button onClick={() => setIsEditorOpen(false)} className="w-12 h-12 rounded-full hover:bg-gray-100 flex items-center justify-center text-2xl transition-all">✕</button>
                    <div>
                        <h2 className="text-2xl font-serif font-black text-brand-dark uppercase tracking-tighter leading-none">Studio d'Édition</h2>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Expérience WordPress Pro</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <button onClick={() => handleSaveArticle(ArticleStatus.DRAFT)} className="px-8 py-4 border-2 border-gray-100 rounded-[20px] font-black text-xs uppercase hover:bg-gray-50 transition-all">Brouillon</button>
                    <button onClick={() => handleSaveArticle(ArticleStatus.PUBLISHED)} className="px-12 py-4 bg-brand-blue text-white rounded-[20px] font-black text-xs uppercase shadow-2xl hover:scale-105 active:scale-95 transition-all">PUBLIER L'ARTICLE</button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Zone Centrale */}
                <div className="flex-1 overflow-y-auto bg-gray-100 py-12 px-8 scroll-smooth">
                    <div className="max-w-[850px] mx-auto space-y-8">
                        {/* Barre d'outils WYSIWYG */}
                        <div className="sticky top-0 z-20 bg-white p-5 rounded-[28px] shadow-2xl border border-gray-100 flex flex-wrap gap-2 items-center justify-center">
                            <button onClick={() => execCommand('bold')} className="w-12 h-12 rounded-xl hover:bg-gray-100 font-bold flex items-center justify-center transition-all" title="Gras">B</button>
                            <button onClick={() => execCommand('italic')} className="w-12 h-12 rounded-xl hover:bg-gray-100 italic flex items-center justify-center transition-all" title="Italique">I</button>
                            <button onClick={() => execCommand('underline')} className="w-12 h-12 rounded-xl hover:bg-gray-100 underline flex items-center justify-center transition-all" title="Souligné">U</button>
                            <div className="w-px h-8 bg-gray-100 mx-2"></div>
                            <button onClick={() => execCommand('formatBlock', 'h1')} className="px-4 h-12 rounded-xl hover:bg-gray-100 font-black flex items-center justify-center text-xs transition-all" title="Titre 1">H1</button>
                            <button onClick={() => execCommand('formatBlock', 'h2')} className="px-4 h-12 rounded-xl hover:bg-gray-100 font-black flex items-center justify-center text-xs transition-all" title="Titre 2">H2</button>
                            <button onClick={() => execCommand('formatBlock', 'p')} className="px-4 h-12 rounded-xl hover:bg-gray-100 font-black flex items-center justify-center text-xs transition-all" title="Paragraphe">¶</button>
                            <div className="w-px h-8 bg-gray-100 mx-2"></div>
                            <button onClick={() => execCommand('insertUnorderedList')} className="w-12 h-12 rounded-xl hover:bg-gray-100 flex items-center justify-center text-xl transition-all" title="Liste">•</button>
                            <button onClick={() => execCommand('createLink')} className="w-12 h-12 rounded-xl hover:bg-gray-100 flex items-center justify-center text-xl transition-all" title="Lien">🔗</button>
                            <button onClick={() => fileInputRef.current?.click()} className="w-12 h-12 rounded-xl hover:bg-gray-100 flex items-center justify-center text-xl transition-all" title="Ajouter une image locale">🖼️</button>
                            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                            <div className="w-px h-8 bg-gray-100 mx-2"></div>
                            <button onClick={handleAIFill} className="bg-brand-yellow text-brand-dark px-8 h-12 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-yellow-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                                <span className="text-lg">✨</span> RÉDIGER PAR IA
                            </button>
                        </div>

                        {/* Titre */}
                        <div className="relative group bg-white p-10 rounded-[40px] shadow-sm border border-gray-100">
                            <input 
                                type="text" 
                                placeholder="Titre de l'actualité..." 
                                className="w-full text-6xl font-serif font-black bg-transparent outline-none border-none text-brand-dark placeholder:text-gray-200"
                                value={currentArticle.title || ''}
                                onChange={e => setCurrentArticle({...currentArticle, title: e.target.value})}
                            />
                        </div>
                        
                        {/* Éditeur central */}
                        <div className="bg-white rounded-[50px] shadow-2xl p-16 md:p-24 border border-gray-50 relative group min-h-[1000px]">
                            <div 
                                ref={editorRef}
                                contentEditable 
                                className="outline-none prose prose-2xl prose-serif max-w-none text-gray-900 leading-[1.8] min-h-[900px]"
                                dangerouslySetInnerHTML={{ __html: currentArticle.content || '' }}
                                onBlur={() => setCurrentArticle(prev => ({ ...prev, content: editorRef.current?.innerHTML }))}
                            />
                            {(!currentArticle.content || currentArticle.content === '') && (
                                <div className="absolute top-24 left-24 pointer-events-none text-gray-200 text-4xl font-serif italic">Racontez votre histoire ici...</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Barre Latérale */}
                <aside className="w-[480px] border-l bg-white overflow-y-auto p-12 space-y-12 shadow-2xl z-10">
                    <div className="space-y-4">
                        <label className="block text-[11px] font-black uppercase text-brand-blue tracking-widest">Rubrique</label>
                        <select 
                            className="w-full p-6 bg-gray-50 rounded-[25px] font-bold outline-none border-2 border-transparent focus:border-brand-blue/20 transition-all"
                            value={currentArticle.category || ''}
                            onChange={e => setCurrentArticle({...currentArticle, category: e.target.value})}
                        >
                            <option value="" disabled>Sélectionner...</option>
                            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                    </div>

                    <div className="space-y-4">
                        <label className="block text-[11px] font-black uppercase text-brand-blue tracking-widest">Image de Une (URL)</label>
                        <div className="space-y-4">
                            <input 
                                type="text" 
                                className="w-full p-6 bg-gray-50 rounded-[25px] text-xs font-mono outline-none border-2 border-transparent focus:border-brand-blue/20 transition-all" 
                                placeholder="Coller l'URL d'une image..."
                                value={currentArticle.imageUrl || ''}
                                onChange={e => setCurrentArticle({...currentArticle, imageUrl: e.target.value})}
                            />
                            {currentArticle.imageUrl && (
                                <div className="relative h-64 rounded-[35px] overflow-hidden shadow-2xl">
                                    <img src={currentArticle.imageUrl} className="w-full h-full object-cover" alt="Aperçu" />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-6 bg-blue-50/40 p-10 rounded-[45px] border border-blue-100/50">
                        <div className="flex justify-between items-center">
                            <label className="text-[11px] font-black uppercase text-brand-blue tracking-widest">Le Chapeau (IA)</label>
                            <button onClick={handleAISummary} className="text-[9px] font-black bg-brand-dark text-white px-6 py-2.5 rounded-full hover:bg-brand-red transition-all shadow-md">GÉNÉRER</button>
                        </div>
                        <textarea 
                            className="w-full p-8 bg-white rounded-[35px] text-base italic font-serif border-none outline-none h-48 resize-none shadow-sm text-gray-700 leading-relaxed" 
                            placeholder="Un court texte percutant pour introduire l'article..."
                            value={currentArticle.excerpt || ''}
                            onChange={e => setCurrentArticle({...currentArticle, excerpt: e.target.value})}
                        />
                    </div>

                    <div className="space-y-4">
                        <label className="block text-[11px] font-black uppercase text-brand-blue tracking-widest">Vidéo YouTube (Optionnel)</label>
                        <input 
                            type="text" 
                            className="w-full p-6 bg-gray-50 rounded-[25px] text-xs font-mono outline-none border-2 border-transparent focus:border-brand-blue/20 transition-all" 
                            placeholder="Lien de la vidéo..."
                            value={currentArticle.videoUrl || ''}
                            onChange={e => setCurrentArticle({...currentArticle, videoUrl: e.target.value})}
                        />
                    </div>
                </aside>
            </div>
        </div>
      )}

      {/* --- MODALS --- */}
      {isUserModalOpen && (
          <div className="fixed inset-0 bg-brand-dark/95 backdrop-blur-3xl z-[200] flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-lg rounded-[65px] p-16 shadow-2xl relative animate-in zoom-in duration-300">
                  <button onClick={() => setIsUserModalOpen(false)} className="absolute top-12 right-12 text-gray-400 hover:text-brand-red text-2xl transition-all">✕</button>
                  <h2 className="text-4xl font-serif font-black mb-12 text-brand-dark uppercase tracking-tighter">Profil Staff</h2>
                  <div className="space-y-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-brand-blue uppercase ml-6">Nom & Prénom</label>
                        <input type="text" className="w-full p-7 bg-gray-50 rounded-[35px] font-bold outline-none border-2 border-transparent focus:border-brand-blue/10 transition-all" value={currentEditUser.name || ''} onChange={e => setCurrentEditUser({...currentEditUser, name: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-brand-blue uppercase ml-6">Email</label>
                        <input type="email" className="w-full p-7 bg-gray-50 rounded-[35px] font-bold outline-none border-2 border-transparent focus:border-brand-blue/10 transition-all" value={currentEditUser.email || ''} onChange={e => setCurrentEditUser({...currentEditUser, email: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-brand-blue uppercase ml-6">Mot de Passe</label>
                        <div className="relative">
                            <input 
                                type={showPassword ? 'text' : 'password'} 
                                className="w-full p-7 bg-gray-50 rounded-[35px] font-bold outline-none pr-20" 
                                value={currentEditUser.password || ''} 
                                onChange={e => setCurrentEditUser({...currentEditUser, password: e.target.value})} 
                            />
                            <button 
                                type="button" 
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-300 hover:text-brand-blue transition-all"
                            >
                                {showPassword ? '👁️' : '🔒'}
                            </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-brand-blue uppercase ml-6">Rôle</label>
                        <select className="w-full p-7 bg-gray-50 rounded-[35px] font-bold outline-none appearance-none" value={currentEditUser.role || UserRole.CONTRIBUTOR} onChange={e => setCurrentEditUser({...currentEditUser, role: e.target.value as UserRole})}>
                            <option value={UserRole.ADMIN}>ADMINISTRATEUR</option>
                            <option value={UserRole.EDITOR}>ÉDITEUR</option>
                            <option value={UserRole.CONTRIBUTOR}>CONTRIBUTEUR</option>
                        </select>
                      </div>
                      <button onClick={handleSaveUser} className="w-full py-7 bg-brand-blue text-white rounded-[40px] font-black uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all">Enregistrer les accès</button>
                  </div>
              </div>
          </div>
      )}

      {isCategoryModalOpen && (
          <div className="fixed inset-0 bg-brand-dark/95 backdrop-blur-3xl z-[200] flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-md rounded-[55px] p-16 shadow-2xl relative">
                  <button onClick={() => setIsCategoryModalOpen(false)} className="absolute top-10 right-10 text-gray-400 hover:text-brand-red text-2xl transition-all">✕</button>
                  <h2 className="text-4xl font-serif font-black mb-10 text-brand-dark uppercase tracking-tighter">Rubrique</h2>
                  <div className="space-y-8">
                      <input type="text" className="w-full p-7 bg-gray-50 rounded-[35px] font-bold text-xl outline-none" placeholder="Nom..." value={currentCategory.name || ''} onChange={e => setCurrentCategory({...currentCategory, name: e.target.value})} />
                      <button onClick={handleSaveCategory} className="w-full py-7 bg-brand-blue text-white rounded-[40px] font-black uppercase tracking-widest shadow-2xl hover:scale-105 transition-all">Valider</button>
                  </div>
              </div>
          </div>
      )}

      {isAdModalOpen && (
          <div className="fixed inset-0 bg-brand-dark/95 backdrop-blur-3xl z-[200] flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-2xl rounded-[65px] p-16 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                  <button onClick={() => setIsAdModalOpen(false)} className="absolute top-12 right-12 text-gray-400 hover:text-brand-red text-2xl transition-all">✕</button>
                  <h2 className="text-5xl font-serif font-black mb-12 text-brand-dark uppercase tracking-tighter">Publicité</h2>
                  <div className="space-y-8">
                      <input type="text" className="w-full p-6 bg-gray-50 rounded-[25px] font-bold outline-none" placeholder="Titre de la campagne..." value={currentAd.title || ''} onChange={e => setCurrentAd({...currentAd, title: e.target.value})} />
                      <div className="grid grid-cols-2 gap-8">
                          <select className="w-full p-6 bg-gray-50 rounded-[25px] font-bold outline-none" value={currentAd.type || AdType.IMAGE} onChange={e => setCurrentAd({...currentAd, type: e.target.value as AdType})}>
                              <option value={AdType.IMAGE}>Format Image</option>
                              <option value={AdType.VIDEO}>Format Vidéo</option>
                              <option value={AdType.SCRIPT}>Format Script/HTML</option>
                          </select>
                          <select className="w-full p-6 bg-gray-50 rounded-[25px] font-bold outline-none" value={currentAd.location || AdLocation.HEADER_LEADERBOARD} onChange={e => setCurrentAd({...currentAd, location: e.target.value as AdLocation})}>
                              <option value={AdLocation.HEADER_LEADERBOARD}>Haut de page</option>
                              <option value={AdLocation.SIDEBAR_SQUARE}>Barre latérale (Carré)</option>
                              <option value={AdLocation.SIDEBAR_SKYSCRAPER}>Barre latérale (Vertical)</option>
                          </select>
                      </div>
                      <textarea className="w-full p-8 bg-gray-50 rounded-[35px] font-mono text-xs outline-none h-44" placeholder="URL du média ou Code HTML..." value={currentAd.content || ''} onChange={e => setCurrentAd({...currentAd, content: e.target.value})} />
                      <button onClick={handleSaveAd} className="w-full py-7 bg-brand-blue text-white rounded-[40px] font-black uppercase tracking-widest shadow-2xl hover:scale-105 transition-all">Lancer la Campagne</button>
                  </div>
              </div>
          </div>
      )}

      {isProcessing && (
          <div className="fixed inset-0 bg-brand-dark/60 backdrop-blur-xl z-[500] flex items-center justify-center">
              <div className="bg-white p-24 rounded-[90px] shadow-2xl flex flex-col items-center">
                  <div className="w-28 h-28 border-[12px] border-brand-blue border-t-transparent rounded-full animate-spin mb-12"></div>
                  <p className="font-black text-3xl text-brand-dark uppercase tracking-[0.5em] animate-pulse">Synchronisation...</p>
              </div>
          </div>
      )}
    </div>
  );
};
