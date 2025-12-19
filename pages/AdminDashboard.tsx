
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
    deleteAd 
} from '../services/mockDatabase';
import { generateSEOMeta } from '../services/aiService';
import { Article, ArticleStatus, Category, Ad, AdType, AdLocation, UserRole } from '../types';
import { useNavigate } from 'react-router-dom';

export const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'articles' | 'categories' | 'ads'>('articles');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Data States
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  
  // Modals States
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);
  
  // Form States
  const [currentArticle, setCurrentArticle] = useState<Partial<Article>>({});
  const [currentCategory, setCurrentCategory] = useState<Partial<Category>>({});
  const [currentAd, setCurrentAd] = useState<Partial<Ad>>({});
  
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    loadData();
  }, [user]);

  const loadData = async () => {
    setIsProcessing(true);
    const [arts, cats, adsList] = await Promise.all([
        getArticles(), getCategories(), getAds()
    ]);
    setArticles(arts);
    setCategories(cats);
    setAds(adsList);
    setIsProcessing(false);
  };

  // --- Article Logic ---
  const handleSaveArticle = async () => {
    if (!currentArticle.title || !user) return;
    setIsProcessing(true);
    const articleToSave: Article = {
        id: currentArticle.id || Date.now().toString(),
        title: currentArticle.title,
        excerpt: currentArticle.excerpt || '',
        content: editorRef.current?.innerHTML || '',
        category: currentArticle.category || categories[0]?.name || 'Général',
        imageUrl: currentArticle.imageUrl || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&q=80&w=800',
        authorId: user.id,
        authorName: user.name,
        status: currentArticle.status || ArticleStatus.DRAFT,
        views: currentArticle.views || 0,
        createdAt: currentArticle.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    await saveArticle(articleToSave);
    setIsEditorOpen(false);
    await loadData();
    setIsProcessing(false);
  };

  // --- Category Logic ---
  const handleSaveCategory = async () => {
      if (!currentCategory.name) return;
      setIsProcessing(true);
      const cat: Category = {
          id: currentCategory.id || Date.now().toString(),
          name: currentCategory.name,
          slug: currentCategory.name.toLowerCase().replace(/ /g, '-')
      };
      await saveCategory(cat);
      setIsCategoryModalOpen(false);
      await loadData();
      setIsProcessing(false);
  };

  // --- Ad Logic ---
  const handleSaveAd = async () => {
      if (!currentAd.title || !currentAd.content) return;
      setIsProcessing(true);
      const ad: Ad = {
          id: currentAd.id || Date.now().toString(),
          title: currentAd.title,
          location: currentAd.location || AdLocation.HEADER_LEADERBOARD,
          type: currentAd.type || AdType.IMAGE,
          content: currentAd.content,
          linkUrl: currentAd.linkUrl,
          active: currentAd.active !== undefined ? currentAd.active : true
      };
      await saveAd(ad);
      setIsAdModalOpen(false);
      await loadData();
      setIsProcessing(false);
  };

  const handleAISummary = async () => {
      if (!editorRef.current?.innerText) return;
      setIsProcessing(true);
      const summary = await generateSEOMeta(currentArticle.title || '', editorRef.current.innerText);
      setCurrentArticle(prev => ({ ...prev, excerpt: summary }));
      setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - Rétablie et Fixée */}
      <aside className="w-64 bg-brand-dark text-white flex flex-col fixed h-full shadow-2xl z-40">
        <div className="p-8 text-center border-b border-white/10">
            <h2 className="text-2xl font-serif font-bold text-brand-yellow">WCI Admin</h2>
            <p className="text-[10px] uppercase tracking-widest mt-1 opacity-50">Gestion de Journal</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
            <button onClick={() => setActiveTab('articles')} className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-all ${activeTab === 'articles' ? 'bg-brand-blue shadow-lg translate-x-1' : 'opacity-60 hover:opacity-100 hover:bg-white/5'}`}>
                <span className="text-xl">📄</span> Articles
            </button>
            <button onClick={() => setActiveTab('categories')} className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-all ${activeTab === 'categories' ? 'bg-brand-blue shadow-lg translate-x-1' : 'opacity-60 hover:opacity-100 hover:bg-white/5'}`}>
                <span className="text-xl">🏷️</span> Catégories
            </button>
            <button onClick={() => setActiveTab('ads')} className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-all ${activeTab === 'ads' ? 'bg-brand-blue shadow-lg translate-x-1' : 'opacity-60 hover:opacity-100 hover:bg-white/5'}`}>
                <span className="text-xl">📢</span> Publicités
            </button>
        </nav>
        <div className="p-6 border-t border-white/10 bg-black/20">
            <div className="flex items-center gap-3 mb-4 p-2 bg-white/5 rounded-lg">
                <img src={user?.avatar} className="w-10 h-10 rounded-full border-2 border-brand-yellow" alt="avatar" />
                <div className="overflow-hidden">
                    <p className="font-bold text-sm truncate">{user?.name}</p>
                    <p className="text-[10px] opacity-50 uppercase font-black">{user?.role}</p>
                </div>
            </div>
            <button onClick={logout} className="w-full py-3 bg-brand-red text-white text-xs font-black rounded-lg hover:brightness-110 transition-all uppercase tracking-widest shadow-lg">DECONNEXION</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 flex-1 p-10">
        <header className="flex justify-between items-center mb-10">
            <div>
                <h1 className="text-4xl font-serif font-black text-brand-dark capitalize">Module {activeTab}</h1>
                <p className="text-gray-400 text-sm mt-1">Gérez vos contenus et votre monétisation en temps réel.</p>
            </div>
            
            {activeTab === 'articles' && (
                <button onClick={() => { setCurrentArticle({}); setIsEditorOpen(true); }} className="bg-brand-blue text-white px-8 py-3 rounded-full font-black shadow-xl hover:-translate-y-1 transition-all flex items-center gap-2">
                    <span className="text-2xl">+</span> CRÉER UN ARTICLE
                </button>
            )}
            {activeTab === 'categories' && (
                <button onClick={() => { setCurrentCategory({}); setIsCategoryModalOpen(true); }} className="bg-brand-blue text-white px-8 py-3 rounded-full font-black shadow-xl hover:-translate-y-1 transition-all flex items-center gap-2">
                    <span className="text-2xl">+</span> NOUVELLE CATÉGORIE
                </button>
            )}
            {activeTab === 'ads' && (
                <button onClick={() => { setCurrentAd({}); setIsAdModalOpen(true); }} className="bg-brand-blue text-white px-8 py-3 rounded-full font-black shadow-xl hover:-translate-y-1 transition-all flex items-center gap-2">
                    <span className="text-2xl">+</span> NOUVELLE PUB
                </button>
            )}
        </header>

        {/* Tab Content - Articles */}
        {activeTab === 'articles' && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50/50 border-b">
                        <tr>
                            <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Contenu</th>
                            <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Rubrique</th>
                            <th className="px-6 py-5 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Stats</th>
                            <th className="px-6 py-5 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Statut</th>
                            <th className="px-6 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {articles.map(art => (
                            <tr key={art.id} className="hover:bg-blue-50/30 transition-colors group">
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-4">
                                        <img src={art.imageUrl} className="w-12 h-12 rounded-xl object-cover shadow-sm" alt="cover" />
                                        <div>
                                            <div className="font-bold text-gray-900 group-hover:text-brand-blue transition-colors line-clamp-1">{art.title}</div>
                                            <div className="text-[10px] text-gray-400 font-bold uppercase mt-1">Publié le {new Date(art.createdAt).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-black uppercase">{art.category}</span>
                                </td>
                                <td className="px-6 py-5 text-center">
                                    <div className="text-lg font-black text-brand-blue leading-none">{art.views}</div>
                                    <div className="text-[9px] text-gray-400 uppercase font-bold">Vues</div>
                                </td>
                                <td className="px-6 py-5 text-center">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${art.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                        {art.status}
                                    </span>
                                </td>
                                <td className="px-6 py-5 text-right space-x-3">
                                    <button onClick={() => { setCurrentArticle(art); setIsEditorOpen(true); }} className="text-brand-blue font-black text-[10px] uppercase hover:underline">Éditer</button>
                                    <button onClick={() => { if(confirm('Supprimer ?')) deleteArticle(art.id).then(loadData); }} className="text-brand-red font-black text-[10px] uppercase hover:underline">Supprimer</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

        {/* Tab Content - Categories */}
        {activeTab === 'categories' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {categories.map(cat => (
                    <div key={cat.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex justify-between items-center group hover:border-brand-blue transition-all">
                        <div>
                            <h3 className="font-black text-lg text-brand-dark uppercase tracking-tight">{cat.name}</h3>
                            <p className="text-xs text-gray-400 font-mono">/{cat.slug}</p>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setCurrentCategory(cat); setIsCategoryModalOpen(true); }} className="w-8 h-8 bg-blue-100 text-brand-blue rounded-full flex items-center justify-center hover:bg-brand-blue hover:text-white transition-colors">✎</button>
                            <button onClick={() => { if(confirm('Supprimer ?')) deleteCategory(cat.id).then(loadData); }} className="w-8 h-8 bg-red-100 text-brand-red rounded-full flex items-center justify-center hover:bg-brand-red hover:text-white transition-colors">×</button>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* Tab Content - Ads */}
        {activeTab === 'ads' && (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {Object.values(AdLocation).map(loc => {
                        const ad = ads.find(a => a.location === loc);
                        return (
                            <div key={loc} className="bg-white rounded-3xl border border-gray-100 p-6 flex flex-col justify-between shadow-sm min-h-[250px] relative overflow-hidden">
                                <div className="absolute top-4 right-4 z-10">
                                    {ad ? (
                                        <div className={`w-3 h-3 rounded-full ${ad.active ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                                    ) : (
                                        <div className="text-[10px] font-black text-gray-300 uppercase">Vide</div>
                                    )}
                                </div>
                                
                                <div>
                                    <label className="text-[10px] font-black text-brand-blue uppercase tracking-widest mb-2 block">Emplacement</label>
                                    <h3 className="font-serif font-black text-lg leading-tight">{loc.replace(/_/g, ' ')}</h3>
                                    {ad && <p className="text-xs text-gray-500 mt-2 font-bold">{ad.title} ({ad.type})</p>}
                                </div>

                                {ad ? (
                                    <div className="mt-6 flex gap-4 border-t pt-4 border-gray-50">
                                        <button onClick={() => { setCurrentAd(ad); setIsAdModalOpen(true); }} className="flex-1 py-2 bg-brand-blue text-white rounded-xl text-xs font-black uppercase shadow-lg">Modifier</button>
                                        <button onClick={() => { if(confirm('Supprimer ?')) deleteAd(ad.id).then(loadData); }} className="px-4 py-2 border border-gray-200 rounded-xl text-brand-red font-black">×</button>
                                    </div>
                                ) : (
                                    <button onClick={() => { setCurrentAd({ location: loc }); setIsAdModalOpen(true); }} className="mt-6 w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 font-black text-xs uppercase hover:bg-gray-50 transition-colors">Assigner une publicité</button>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        )}
      </main>

      {/* --- MODALS --- */}

      {/* Modal Article (Fullscreen) */}
      {isEditorOpen && (
          <div className="fixed inset-0 bg-white z-[100] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-500">
               <header className="px-10 py-6 border-b flex justify-between items-center bg-gray-50">
                  <div className="flex items-center gap-6">
                      <button onClick={() => setIsEditorOpen(false)} className="text-3xl hover:bg-gray-200 w-12 h-12 rounded-full flex items-center justify-center transition-colors">✕</button>
                      <div>
                        <h2 className="text-2xl font-serif font-black text-brand-dark">Studio de Rédaction</h2>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">WCI Newsroom System</p>
                      </div>
                  </div>
                  <div className="flex gap-4">
                      <button onClick={() => { setCurrentArticle(p => ({...p, status: ArticleStatus.DRAFT})); handleSaveArticle(); }} className="px-8 py-3 border-2 border-gray-200 rounded-2xl hover:bg-white font-black text-xs uppercase transition-all shadow-sm">Brouillon</button>
                      <button onClick={() => { setCurrentArticle(p => ({...p, status: ArticleStatus.PUBLISHED})); handleSaveArticle(); }} className="px-10 py-3 bg-brand-blue text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:brightness-110 active:scale-95 transition-all">Publier Immédiatement</button>
                  </div>
              </header>
              <div className="flex-1 overflow-y-auto bg-gray-50/50 py-12">
                  <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12">
                      <div className="lg:col-span-8 space-y-8">
                          <input 
                            type="text" 
                            placeholder="Titre de l'information..." 
                            className="w-full text-6xl font-serif font-black bg-transparent outline-none border-b-4 border-transparent focus:border-brand-blue pb-6 transition-all placeholder:opacity-20"
                            value={currentArticle.title || ''}
                            onChange={e => setCurrentArticle({...currentArticle, title: e.target.value})}
                          />

                          <div className="bg-white p-8 rounded-[40px] shadow-2xl shadow-blue-900/5 border border-gray-100">
                              <div className="flex justify-between items-center mb-6">
                                  <label className="text-[10px] font-black uppercase text-brand-blue tracking-widest">Introduction SEO (IA)</label>
                                  <button onClick={handleAISummary} className="bg-brand-yellow text-brand-dark px-4 py-2 rounded-xl text-[10px] font-black flex items-center gap-2 shadow-lg hover:scale-105 transition-transform active:rotate-2">
                                      ✨ GÉNÉRER LE CHAPEAU
                                  </button>
                              </div>
                              <textarea 
                                className="w-full h-32 bg-gray-50/50 border-none rounded-3xl p-6 text-gray-700 text-xl font-serif italic focus:ring-4 focus:ring-brand-blue/10 outline-none resize-none"
                                placeholder="Un court résumé captivant..."
                                value={currentArticle.excerpt || ''}
                                onChange={e => setCurrentArticle({...currentArticle, excerpt: e.target.value})}
                              />
                          </div>

                          <div className="bg-white rounded-[40px] shadow-2xl shadow-blue-900/5 border border-gray-100 overflow-hidden flex flex-col min-h-[700px]">
                              <div className="bg-gray-100/50 p-3 border-b flex gap-2 overflow-x-auto no-scrollbar">
                                  {['bold', 'italic', 'underline', 'insertUnorderedList', 'justifyLeft', 'justifyCenter'].map(cmd => (
                                      <button key={cmd} onClick={() => document.execCommand(cmd)} className="px-4 py-2 bg-white rounded-xl shadow-sm text-[10px] font-black uppercase text-gray-500 hover:bg-brand-blue hover:text-white transition-all">{cmd === 'insertUnorderedList' ? 'Liste' : cmd}</button>
                                  ))}
                              </div>
                              <div 
                                ref={editorRef}
                                contentEditable 
                                className="flex-1 p-12 outline-none prose prose-2xl max-w-none text-gray-800 font-serif"
                                dangerouslySetInnerHTML={{ __html: currentArticle.content || '' }}
                                onInput={() => setCurrentArticle(p => ({...p, content: editorRef.current?.innerHTML}))}
                              />
                          </div>
                      </div>

                      <aside className="lg:col-span-4 space-y-8">
                          <div className="bg-white p-8 rounded-[35px] shadow-xl shadow-blue-900/5 border border-gray-100">
                              <label className="block text-[10px] font-black uppercase text-brand-blue tracking-widest mb-4">Rubrique</label>
                              <select 
                                className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl font-black text-gray-700 outline-none focus:border-brand-blue transition-all"
                                value={currentArticle.category || ''}
                                onChange={e => setCurrentArticle({...currentArticle, category: e.target.value})}
                              >
                                  <option value="">Sélectionner...</option>
                                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                              </select>
                          </div>

                          <div className="bg-white p-8 rounded-[35px] shadow-xl shadow-blue-900/5 border border-gray-100">
                              <label className="block text-[10px] font-black uppercase text-brand-blue tracking-widest mb-4">Média à la Une (URL)</label>
                              <input 
                                type="text" 
                                className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl text-xs font-bold mb-6 outline-none focus:border-brand-blue"
                                placeholder="Copiez l'adresse de l'image..."
                                value={currentArticle.imageUrl || ''}
                                onChange={e => setCurrentArticle({...currentArticle, imageUrl: e.target.value})}
                              />
                              {currentArticle.imageUrl && (
                                  <div className="relative group">
                                    <img src={currentArticle.imageUrl} className="w-full h-56 object-cover rounded-3xl shadow-inner border-4 border-gray-50" alt="preview" />
                                    <div className="absolute inset-0 bg-brand-blue/20 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                  </div>
                              )}
                          </div>
                      </aside>
                  </div>
              </div>
          </div>
      )}

      {/* Modal Catégorie */}
      {isCategoryModalOpen && (
          <div className="fixed inset-0 bg-brand-dark/90 backdrop-blur-xl z-[150] flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-md rounded-[40px] p-10 shadow-2xl relative animate-in zoom-in duration-300">
                  <button onClick={() => setIsCategoryModalOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:text-brand-red text-2xl">✕</button>
                  <h2 className="text-3xl font-serif font-black mb-8 text-brand-dark">Nouvelle Rubrique</h2>
                  <div className="space-y-6">
                      <div>
                          <label className="block text-[10px] font-black text-brand-blue uppercase mb-2">Nom de la catégorie</label>
                          <input 
                            type="text" 
                            className="w-full p-4 bg-gray-50 border-none rounded-2xl text-lg font-bold outline-none focus:ring-4 focus:ring-brand-blue/10"
                            placeholder="ex: Tech, Sport..."
                            value={currentCategory.name || ''}
                            onChange={e => setCurrentCategory({...currentCategory, name: e.target.value})}
                          />
                      </div>
                      <button onClick={handleSaveCategory} className="w-full py-5 bg-brand-blue text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-500/30 hover:-translate-y-1 transition-all">Enregistrer</button>
                  </div>
              </div>
          </div>
      )}

      {/* Modal Publicité */}
      {isAdModalOpen && (
          <div className="fixed inset-0 bg-brand-dark/90 backdrop-blur-xl z-[150] flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-2xl rounded-[40px] p-12 shadow-2xl relative animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto editor-scroll">
                  <button onClick={() => setIsAdModalOpen(false)} className="absolute top-8 right-8 text-gray-400 hover:text-brand-red text-2xl">✕</button>
                  <h2 className="text-3xl font-serif font-black mb-10 text-brand-dark uppercase tracking-tighter">Gestion de Campagne</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                      <div className="space-y-6">
                          <div>
                              <label className="block text-[10px] font-black text-brand-blue uppercase mb-2">Titre Interne</label>
                              <input 
                                type="text" 
                                className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-brand-blue"
                                placeholder="ex: Campagne Coca-Cola..."
                                value={currentAd.title || ''}
                                onChange={e => setCurrentAd({...currentAd, title: e.target.value})}
                              />
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-brand-blue uppercase mb-2">Format</label>
                              <select 
                                className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-brand-blue"
                                value={currentAd.type || AdType.IMAGE}
                                onChange={e => setCurrentAd({...currentAd, type: e.target.value as AdType})}
                              >
                                  <option value={AdType.IMAGE}>Bannière Image</option>
                                  <option value={AdType.VIDEO}>Publicité Vidéo</option>
                                  <option value={AdType.SCRIPT}>Code JS / Script HTML</option>
                              </select>
                          </div>
                      </div>
                      <div className="space-y-6">
                          <div>
                              <label className="block text-[10px] font-black text-brand-blue uppercase mb-2">Emplacement</label>
                              <select 
                                className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-brand-blue"
                                value={currentAd.location || AdLocation.HEADER_LEADERBOARD}
                                onChange={e => setCurrentAd({...currentAd, location: e.target.value as AdLocation})}
                              >
                                  {Object.values(AdLocation).map(l => <option key={l} value={l}>{l.replace(/_/g, ' ')}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-brand-blue uppercase mb-2">Statut</label>
                              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                                  <input 
                                    type="checkbox" 
                                    className="w-6 h-6 rounded-lg accent-brand-blue"
                                    checked={currentAd.active !== undefined ? currentAd.active : true}
                                    onChange={e => setCurrentAd({...currentAd, active: e.target.checked})}
                                  />
                                  <span className="font-black text-xs uppercase text-gray-500">Campagne Active</span>
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="mb-8">
                      <label className="block text-[10px] font-black text-brand-blue uppercase mb-2">Contenu (URL ou Code HTML)</label>
                      <textarea 
                        className="w-full p-6 bg-gray-50 rounded-3xl font-mono text-xs border-2 border-transparent focus:border-brand-blue outline-none min-h-[150px]"
                        placeholder="https://... OU <script>...</script>"
                        value={currentAd.content || ''}
                        onChange={e => setCurrentAd({...currentAd, content: e.target.value})}
                      />
                  </div>

                  <div>
                      <label className="block text-[10px] font-black text-brand-blue uppercase mb-2">Lien de destination (optionnel)</label>
                      <input 
                        type="text" 
                        className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-brand-blue"
                        placeholder="https://..."
                        value={currentAd.linkUrl || ''}
                        onChange={e => setCurrentAd({...currentAd, linkUrl: e.target.value})}
                      />
                  </div>

                  <button onClick={handleSaveAd} className="mt-10 w-full py-5 bg-brand-blue text-white rounded-3xl font-black uppercase tracking-widest shadow-2xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all">Lancer la campagne</button>
              </div>
          </div>
      )}

      {/* Loading Overlay */}
      {isProcessing && (
          <div className="fixed inset-0 bg-brand-dark/40 backdrop-blur-sm z-[250] flex items-center justify-center">
              <div className="bg-white p-12 rounded-[50px] shadow-2xl flex flex-col items-center">
                  <div className="w-20 h-20 border-8 border-brand-blue border-t-transparent rounded-full animate-spin mb-8"></div>
                  <p className="font-black text-xl text-brand-dark uppercase tracking-widest animate-pulse">Synchronisation...</p>
              </div>
          </div>
      )}
    </div>
  );
};
