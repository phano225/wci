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
import { Article, ArticleStatus, Category, Ad, AdType, AdLocation, UserRole, User, PERMISSIONS, SubmissionStatus } from '../types';
import { useNavigate, Link } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export const AdminDashboard = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'articles' | 'submissions' | 'categories' | 'ads' | 'users'>('articles');
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
  const [isDeleteCategoryModalOpen, setIsDeleteCategoryModalOpen] = useState(false);
  
  const [currentArticle, setCurrentArticle] = useState<Partial<Article>>({});
  const [currentCategory, setCurrentCategory] = useState<Partial<Category>>({});
  const [targetCategoryForReassign, setTargetCategoryForReassign] = useState<string>('');
  const [currentAd, setCurrentAd] = useState<Partial<Ad>>({});
  const [currentEditUser, setCurrentEditUser] = useState<Partial<User>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const modules = React.useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
      ['link', 'image', 'video'],
      ['clean']
    ],
  }), []);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    loadData();
  }, [user, activeTab]);

  const loadData = async () => {
    setIsProcessing(true);
    try {
        console.log('Chargement des données...');
        const [arts, cats, adsList, userList] = await Promise.all([
            getArticles(), getCategories(), getAds(), getUsers()
        ]);
        
        // Filter articles based on role
        let filteredArticles = arts;
        if (user?.role === UserRole.CONTRIBUTOR) {
            // Contributors see their own articles
            filteredArticles = arts.filter(a => a.authorId === user.id);
        }
        
        setArticles(filteredArticles);
        setCategories(cats);
        setAds(adsList);
        setStaff(userList);
    } catch (e) {
        console.error('Erreur lors du chargement des données:', e);
        alert('Erreur de chargement des données. Vérifiez votre connexion.');
    }
    setIsProcessing(false);
  };

  const handleLocalImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const base64 = ev.target?.result as string;
            // Insert image into editor (would need ref to quill instance ideally, but appending to content works for simple case)
            const imgTag = `<img src="${base64}" class="w-full rounded-2xl shadow-xl my-8 border border-gray-100" />`;
            setCurrentArticle(prev => ({ ...prev, content: (prev.content || '') + imgTag }));
        };
        reader.readAsDataURL(file);
    }
  };

  const handleSaveArticle = async (targetStatus: ArticleStatus) => {
    if (!currentArticle.title || !user) { alert("Le titre est requis."); return; }
    
    setIsProcessing(true);
    try {
      // Permission check
      if (targetStatus === ArticleStatus.PUBLISHED && !PERMISSIONS.canPublishArticle(user.role)) {
        alert("Vous n'avez pas la permission de publier directement.");
        setIsProcessing(false);
        return;
      }

      const articleToSave: Article = {
          id: currentArticle.id || Date.now().toString(),
          title: currentArticle.title,
          excerpt: currentArticle.excerpt || '',
          content: currentArticle.content || '',
          category: currentArticle.category || (categories[0]?.name || 'Général'),
          imageUrl: currentArticle.imageUrl || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
          videoUrl: currentArticle.videoUrl || '',
          authorId: currentArticle.authorId || user.id,
          authorName: currentArticle.authorName || user.name,
          authorAvatar: currentArticle.authorAvatar || user.avatar,
          status: targetStatus,
          views: currentArticle.views || 0,
          createdAt: currentArticle.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          // Workflow properties
          submittedBy: targetStatus === ArticleStatus.SUBMITTED ? (currentArticle.submittedBy || user.id) : currentArticle.submittedBy,
          submittedAt: targetStatus === ArticleStatus.SUBMITTED ? new Date().toISOString() : currentArticle.submittedAt,
          submissionStatus: targetStatus === ArticleStatus.SUBMITTED ? SubmissionStatus.PENDING : currentArticle.submissionStatus
      };

      await saveArticle(articleToSave);
      setIsEditorOpen(false);
      await loadData();

      if (targetStatus === ArticleStatus.SUBMITTED) {
        alert('Article soumis pour révision.');
      } else if (targetStatus === ArticleStatus.PUBLISHED) {
        alert('Article publié avec succès !');
      } else {
        alert('Brouillon sauvegardé.');
      }

    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde.');
    } finally {
      setIsProcessing(false);
    }
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

  const handleDeleteCategory = async () => {
    if (!currentCategory.id) return;

    setIsProcessing(true);
    try {
      // Trouver les articles dans cette catégorie
      const articlesInCategory = articles.filter(art => art.category === currentCategory.name);

      // Réaffecter les articles
      if (articlesInCategory.length > 0) {
          if (!targetCategoryForReassign) {
              alert("Veuillez sélectionner une catégorie de destination.");
              setIsProcessing(false);
              return;
          }
          
          let targetCatName = targetCategoryForReassign;
          
          // Si nouvelle catégorie demandée
          if (targetCategoryForReassign === '__new__') {
              const newCatName = prompt("Nom de la nouvelle catégorie :");
              if (!newCatName) { setIsProcessing(false); return; }
              
              const newCat = {
                  id: Date.now().toString(),
                  name: newCatName,
                  slug: newCatName.toLowerCase().replace(/\s+/g, '-')
              };
              await saveCategory(newCat);
              targetCatName = newCatName;
          }

          for (const article of articlesInCategory) {
            const updatedArticle: Article = {
              ...article,
              category: targetCatName,
              updatedAt: new Date().toISOString()
            };
            await saveArticle(updatedArticle);
          }
      }

      await deleteCategory(currentCategory.id);
      setIsDeleteCategoryModalOpen(false);
      await loadData();
      alert('Rubrique supprimée avec succès.');

    } catch (error) {
      console.error('Erreur suppression rubrique:', error);
      alert('Erreur lors de la suppression.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveUser = async () => {
    if (!currentEditUser.name || !currentEditUser.email) return;
    setIsProcessing(true);
    
    // Only Admin can create/edit other users
    if (user?.role !== UserRole.ADMIN && currentEditUser.id !== user?.id) {
        alert("Action non autorisée.");
        setIsProcessing(false);
        return;
    }

    const data: User = {
        id: currentEditUser.id || `u-${Date.now()}`,
        name: currentEditUser.name,
        email: currentEditUser.email,
        password: currentEditUser.password || '1234',
        role: currentEditUser.role as UserRole,
        avatar: currentEditUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentEditUser.name)}`
    };
    
    if (currentEditUser.id === user?.id) updateUser(data);
    else await saveUser(data);
    
    setIsUserModalOpen(false);
    await loadData();
    setIsProcessing(false);
  };
  
  const handleSaveAd = async () => {
      if (!currentAd.title) return;
      setIsProcessing(true);
      await saveAd({
          id: currentAd.id || Date.now().toString(),
          title: currentAd.title,
          location: currentAd.location || AdLocation.HEADER_LEADERBOARD,
          type: currentAd.type || AdType.IMAGE,
          content: currentAd.content || '',
          linkUrl: currentAd.linkUrl || '',
          active: currentAd.active !== undefined ? currentAd.active : true
      });
      setIsAdModalOpen(false);
      await loadData();
      setIsProcessing(false);
  };

  const handleAIFill = async () => {
    if (!currentArticle.title) { alert("Entrez un titre d'abord."); return; }
    setIsProcessing(true);
    try {
        const res = await generateArticleDraft(currentArticle.title, currentArticle.category || 'Information');
        setCurrentArticle(prev => ({ ...prev, content: res }));
    } catch (e) { alert("Erreur IA. Vérifiez votre clé Gemini."); }
    setIsProcessing(false);
  };
  
  const handleAISummary = async () => {
      // Placeholder for AI summary generation
      if (!currentArticle.content) return;
      alert("Fonctionnalité de résumé automatique à venir.");
  };

  const handleReviewSubmission = async (articleId: string, decision: SubmissionStatus) => {
    if (!user) return;

    const comments = decision === SubmissionStatus.REJECTED ?
      prompt('Commentaires pour le contributeur (optionnel):') : '';

    if (decision === SubmissionStatus.REJECTED && comments === null) return; // Cancelled

    setIsProcessing(true);
    try {
      const article = articles.find(a => a.id === articleId);
      if (!article) return;

      const updatedArticle: Article = {
        ...article,
        status: decision === SubmissionStatus.APPROVED ? ArticleStatus.PUBLISHED : ArticleStatus.REJECTED,
        reviewedBy: user.id,
        reviewedAt: new Date().toISOString(),
        reviewComments: comments || undefined,
        submissionStatus: decision,
        updatedAt: new Date().toISOString()
      };

      await saveArticle(updatedArticle);
      await loadData();

      alert(decision === SubmissionStatus.APPROVED ?
        'Article approuvé et publié !' :
        'Article rejeté. Le contributeur recevra vos commentaires.');

    } catch (error) {
      console.error('Erreur lors de la révision:', error);
      alert('Erreur lors de la révision de la soumission.');
    } finally {
      setIsProcessing(false);
    }
  };



  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-72 bg-brand-dark text-white flex flex-col fixed h-full shadow-2xl z-40 overflow-y-auto">
        <div className="p-10 text-center border-b border-white/5">
            <h2 className="text-3xl font-serif font-black text-brand-yellow tracking-tighter">WCI Admin</h2>
        </div>
        
        <div className="p-4 border-b border-white/5">
            <Link to="/" className="flex items-center gap-3 px-5 py-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all text-[10px] font-black uppercase tracking-widest text-brand-yellow">
                <span>🌐</span> VOIR LE SITE
            </Link>
        </div>

        <nav className="flex-1 p-6 space-y-2">
            <button onClick={() => setActiveTab('articles')} className={`w-full text-left px-5 py-4 rounded-2xl flex items-center gap-4 ${activeTab === 'articles' ? 'bg-brand-blue shadow-lg' : 'opacity-40 hover:opacity-100'}`}>📄 Articles</button>
            
            {PERMISSIONS.canReviewSubmissions(user?.role!) && (
                <button onClick={() => setActiveTab('submissions')} className={`w-full text-left px-5 py-4 rounded-2xl flex items-center gap-4 ${activeTab === 'submissions' ? 'bg-brand-blue shadow-lg' : 'opacity-40 hover:opacity-100'}`}>
                    📝 Soumissions
                    {articles.filter(a => a.status === ArticleStatus.SUBMITTED).length > 0 && (
                        <span className="bg-red-500 text-white text-[10px] px-2 rounded-full">{articles.filter(a => a.status === ArticleStatus.SUBMITTED).length}</span>
                    )}
                </button>
            )}
            
            {PERMISSIONS.canManageCategories(user?.role!) && <button onClick={() => setActiveTab('categories')} className={`w-full text-left px-5 py-4 rounded-2xl flex items-center gap-4 ${activeTab === 'categories' ? 'bg-brand-blue shadow-lg' : 'opacity-40 hover:opacity-100'}`}>🏷️ Rubriques</button>}
            
            {PERMISSIONS.canManageAds(user?.role!) && <button onClick={() => setActiveTab('ads')} className={`w-full text-left px-5 py-4 rounded-2xl flex items-center gap-4 ${activeTab === 'ads' ? 'bg-brand-blue shadow-lg' : 'opacity-40 hover:opacity-100'}`}>📢 Publicités</button>}
            
            {PERMISSIONS.canManageUsers(user?.role!) && <button onClick={() => setActiveTab('users')} className={`w-full text-left px-5 py-4 rounded-2xl flex items-center gap-4 ${activeTab === 'users' ? 'bg-brand-blue shadow-lg' : 'opacity-40 hover:opacity-100'}`}>👥 Équipe</button>}
        </nav>
        
        <div className="p-6 border-t border-white/5">
            <div className="mb-6 p-4 bg-white/5 rounded-2xl flex items-center gap-3 cursor-pointer hover:bg-white/10" onClick={() => { setCurrentEditUser(user || {}); setIsUserModalOpen(true); }}>
                <img src={user?.avatar} className="w-8 h-8 rounded-full border border-brand-yellow" alt="" />
                <div className="overflow-hidden">
                    <p className="text-[10px] font-black uppercase truncate">{user?.name}</p>
                    <p className="text-[8px] opacity-40 uppercase">{user?.role}</p>
                </div>
            </div>
            <button onClick={logout} className="w-full py-4 bg-brand-red text-white font-black rounded-xl uppercase text-xs tracking-widest hover:brightness-110 transition-all">Déconnexion</button>
        </div>
      </aside>

      <main className="ml-72 flex-1 p-12 overflow-y-auto">
        <header className="flex justify-between items-end mb-16">
            <h1 className="text-5xl font-serif font-black text-brand-dark uppercase tracking-tighter">
                {activeTab === 'articles' ? 'Mes Articles' : activeTab === 'submissions' ? 'Attente de Validation' : activeTab === 'categories' ? 'Rubriques' : activeTab === 'ads' ? 'Régie Pub' : 'Équipe'}
            </h1>
            <button onClick={() => { 
                if(activeTab === 'articles') { setCurrentArticle({}); setIsEditorOpen(true); } 
                else if(activeTab === 'categories' && PERMISSIONS.canManageCategories(user?.role!)) { setCurrentCategory({}); setIsCategoryModalOpen(true); }
                else if(activeTab === 'ads' && PERMISSIONS.canManageAds(user?.role!)) { setCurrentAd({active: true, location: AdLocation.HEADER_LEADERBOARD, type: AdType.IMAGE}); setIsAdModalOpen(true); }
                else if(activeTab === 'users' && PERMISSIONS.canManageUsers(user?.role!)) { setCurrentEditUser({}); setIsUserModalOpen(true); }
            }} className={`bg-brand-blue text-white px-10 py-4 rounded-2xl font-black shadow-2xl hover:scale-105 transition-all text-xs tracking-widest uppercase ${(
                (activeTab === 'categories' && !PERMISSIONS.canManageCategories(user?.role!)) ||
                (activeTab === 'ads' && !PERMISSIONS.canManageAds(user?.role!)) ||
                (activeTab === 'users' && !PERMISSIONS.canManageUsers(user?.role!)) ||
                (activeTab === 'submissions') // Cannot add submissions manually from this view
            ) ? 'hidden' : ''}`}>+ AJOUTER</button>
        </header>

        {/* --- ARTICLES --- */}
        {activeTab === 'articles' && (
            <div className="space-y-4">
                {articles.map(art => (
                    <div key={art.id} className="bg-white p-6 rounded-[35px] border border-gray-100 flex items-center justify-between group hover:shadow-xl transition-all">
                        <div className="flex items-center gap-8">
                            <img src={art.imageUrl} className="w-20 h-20 rounded-3xl object-cover shadow-sm" alt="" />
                            <div>
                                <h3 className="font-bold text-2xl text-gray-900 group-hover:text-brand-blue transition-colors">{art.title}</h3>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                                        art.status === ArticleStatus.PUBLISHED ? 'bg-green-100 text-green-700' : 
                                        art.status === ArticleStatus.SUBMITTED ? 'bg-yellow-100 text-yellow-700' : 
                                        'bg-gray-100 text-gray-600'
                                    }`}>
                                        {art.status === ArticleStatus.SUBMITTED ? 'EN ATTENTE' : art.status}
                                    </span>
                                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{art.category} • {art.views} vues</p>
                                </div>
                                {art.reviewComments && (
                                    <p className="text-red-500 text-xs mt-1">💬 Note Admin: {art.reviewComments}</p>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => { setCurrentArticle(art); setIsEditorOpen(true); }} className="px-8 py-4 bg-blue-50 text-brand-blue rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-blue hover:text-white transition-all">Éditer</button>
                            <button onClick={() => { if(confirm('Supprimer cet article ?')) deleteArticle(art.id).then(loadData); }} className="text-brand-red font-black p-4 hover:bg-red-50 rounded-2xl">✕</button>
                        </div>
                    </div>
                ))}
                {articles.length === 0 && <div className="text-center p-10 text-gray-400">Aucun article trouvé.</div>}
            </div>
        )}

        {/* --- SOUMISSIONS (Admin/Editor Only) --- */}
        {activeTab === 'submissions' && (
            <div className="space-y-4">
                {articles.filter(art => art.status === ArticleStatus.SUBMITTED).map(art => (
                    <div key={art.id} className="bg-yellow-50 p-6 rounded-[35px] border border-yellow-200 flex items-center justify-between group hover:shadow-xl transition-all">
                        <div className="flex items-center gap-8">
                            <div className="w-12 h-12 bg-yellow-200 rounded-full flex items-center justify-center">
                                <span className="text-yellow-600 text-xl">📝</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-2xl text-gray-900 group-hover:text-brand-blue transition-colors">{art.title}</h3>
                                <p className="text-[10px] font-black uppercase text-gray-400 mt-2 tracking-widest">
                                    {art.category} • Soumis par {art.authorName} • {art.submittedAt ? new Date(art.submittedAt).toLocaleDateString() : ''}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => { setCurrentArticle(art); setIsEditorOpen(true); }} className="px-8 py-4 bg-blue-50 text-brand-blue rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-blue hover:text-white transition-all">Examiner</button>
                            <button onClick={() => handleReviewSubmission(art.id, SubmissionStatus.APPROVED)} className="px-8 py-4 bg-green-50 text-green-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-green-600 hover:text-white transition-all">Approuver</button>
                            <button onClick={() => handleReviewSubmission(art.id, SubmissionStatus.REJECTED)} className="px-8 py-4 bg-red-50 text-red-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all">Rejeter</button>
                        </div>
                    </div>
                ))}
                {articles.filter(art => art.status === ArticleStatus.SUBMITTED).length === 0 && (
                    <div className="bg-white p-12 rounded-[35px] text-center">
                        <p className="text-gray-500 text-lg">Aucune soumission en attente</p>
                    </div>
                )}
            </div>
        )}

        {/* --- RUBRIQUES --- */}
        {activeTab === 'categories' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map(cat => (
                    <div key={cat.id} className="bg-white p-10 rounded-[40px] border border-gray-100 flex flex-col justify-between shadow-sm hover:shadow-xl transition-all group">
                        <div>
                            <h3 className="text-3xl font-black text-brand-dark uppercase tracking-tighter leading-none">{cat.name}</h3>
                            <p className="text-xs font-mono text-gray-400 mt-2">/{cat.slug}</p>
                        </div>
                        <div className="mt-8 flex gap-4">
                            <button onClick={() => { setCurrentCategory(cat); setIsCategoryModalOpen(true); }} className="flex-1 py-4 bg-gray-50 text-brand-blue rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-blue hover:text-white transition-all">Modifier</button>
                            <button onClick={() => { setCurrentCategory(cat); setIsDeleteCategoryModalOpen(true); }} className="px-6 py-4 bg-red-50 text-brand-red rounded-2xl font-black hover:bg-brand-red hover:text-white transition-all">✕</button>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* --- PUBLICITÉS --- */}
        {activeTab === 'ads' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ads.map(ad => (
                    <div key={ad.id} className="bg-white p-10 rounded-[40px] border border-gray-100 flex flex-col justify-between shadow-sm group hover:shadow-xl transition-all">
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${ad.active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>{ad.active ? 'Active' : 'Désactivée'}</span>
                                <span className="text-[9px] font-black text-brand-blue/30 uppercase">{ad.location}</span>
                            </div>
                            <h3 className="text-2xl font-serif font-black mb-6 leading-tight">{ad.title}</h3>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => { setCurrentAd(ad); setIsAdModalOpen(true); }} className="flex-1 py-4 bg-gray-50 text-brand-dark rounded-2xl font-black text-[10px] uppercase hover:bg-brand-blue hover:text-white transition-all">Paramètres</button>
                            <button onClick={() => { if(confirm('Supprimer cette publicité ?')) deleteAd(ad.id).then(loadData); }} className="px-6 py-4 bg-red-50 text-brand-red rounded-2xl font-black hover:bg-brand-red hover:text-white transition-all">✕</button>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* --- ÉQUIPE --- */}
        {activeTab === 'users' && (
            <div className="bg-white rounded-[50px] shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50/50 border-b">
                        <tr><th className="px-12 py-8 text-[11px] font-black uppercase text-gray-400 tracking-widest">Collaborateur</th><th className="px-12 py-8 text-[11px] font-black uppercase text-gray-400 tracking-widest">Rôle</th><th className="px-12 py-8 text-right">Actions</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {staff.map(m => (
                            <tr key={m.id} className="hover:bg-blue-50/20 transition-all">
                                <td className="px-12 py-8 flex items-center gap-6">
                                    <img src={m.avatar} className="w-12 h-12 rounded-full border-2 border-white shadow-md" alt="" />
                                    <div>
                                        <p className="font-bold text-lg text-gray-900">{m.name}</p>
                                        <p className="text-xs text-gray-400 font-medium">{m.email}</p>
                                    </div>
                                </td>
                                <td className="px-12 py-8"><span className="bg-brand-blue/10 text-brand-blue px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">{m.role}</span></td>
                                <td className="px-12 py-8 text-right">
                                    {/* Admin can edit anyone; others can only see or edit themselves if implemented (but requirement says no self edit for profile) */}
                                    {PERMISSIONS.canManageUsers(user?.role!) && (
                                        <button onClick={() => { setCurrentEditUser(m); setIsUserModalOpen(true); }} className="text-brand-blue font-black text-[11px] uppercase tracking-widest mr-8 hover:underline">Modifier</button>
                                    )}
                                    {/* Only Admin can delete users, and not themselves */}
                                    {PERMISSIONS.canManageUsers(user?.role!) && m.id !== user?.id && (
                                        <button onClick={() => { if(confirm('Supprimer ce membre ?')) deleteUser(m.id).then(loadData); }} className="text-brand-red font-black text-[11px] uppercase tracking-widest">Supprimer</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
      </main>

      {/* --- STUDIO RÉDACTION WYSIWYG MODERNE --- */}
      {isEditorOpen && (
        <div className="fixed inset-0 bg-white z-[100] flex flex-col animate-in slide-in-from-bottom duration-500 overflow-hidden">
            <header className="px-12 py-6 border-b flex justify-between items-center bg-white sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-10">
                    <button onClick={() => setIsEditorOpen(false)} className="w-12 h-12 rounded-full hover:bg-gray-100 flex items-center justify-center text-3xl transition-all">✕</button>
                    <div>
                        <h2 className="text-2xl font-serif font-black text-brand-dark uppercase tracking-tighter">Éditeur WCI</h2>
                        {user?.role === UserRole.CONTRIBUTOR && (
                            <span className="text-xs text-orange-500 font-bold">Mode Contributeur (Soumission requise)</span>
                        )}
                    </div>
                </div>
                <div className="flex gap-4">
                    {/* Draft is always available */}
                    <button onClick={() => handleSaveArticle(ArticleStatus.DRAFT)} className="px-8 py-4 border-2 border-gray-100 rounded-2xl font-black text-xs uppercase hover:bg-gray-50">Brouillon</button>
                    
                    {/* Publish only for Admin/Editor */}
                    {PERMISSIONS.canPublishArticle(user?.role!) && (
                        <button onClick={() => handleSaveArticle(ArticleStatus.PUBLISHED)} className="px-12 py-4 bg-brand-blue text-white rounded-2xl font-black text-xs uppercase shadow-2xl hover:scale-105 active:scale-95 transition-all">PUBLIER MAINTENANT</button>
                    )}
                    
                    {/* Submit for Contributor */}
                    {PERMISSIONS.canSubmitForReview(user?.role!) && !PERMISSIONS.canPublishArticle(user?.role!) && (
                        <button onClick={() => handleSaveArticle(ArticleStatus.SUBMITTED)} className="px-12 py-4 bg-brand-yellow text-brand-dark rounded-2xl font-black text-xs uppercase shadow-2xl hover:scale-105 active:scale-95 transition-all">SOUMETTRE À VALIDATION</button>
                    )}
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden bg-gray-100">
                <div className="flex-1 overflow-y-auto py-12 px-8">
                    <div className="max-w-[850px] mx-auto space-y-8">
                        {/* React Quill Editor */}
                        <div className="bg-white rounded-[50px] shadow-2xl border border-gray-50 p-16 md:p-24 min-h-[1100px] relative flex flex-col">
                            <input 
                                type="text" 
                                placeholder="Titre de l'article..." 
                                className="w-full text-5xl font-serif font-black bg-transparent outline-none border-none text-brand-dark mb-10 leading-tight placeholder:text-gray-200"
                                value={currentArticle.title || ''}
                                onChange={e => setCurrentArticle({...currentArticle, title: e.target.value})}
                            />
                            
                            <div className="flex-1">
                                <ReactQuill 
                                    theme="snow"
                                    value={currentArticle.content || ''}
                                    onChange={(content) => setCurrentArticle(prev => ({ ...prev, content }))}
                                    modules={modules}
                                    className="h-[600px] mb-12"
                                    placeholder="Écrivez votre article ici..."
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <aside className="w-[450px] border-l bg-white overflow-y-auto p-12 space-y-12 shadow-2xl z-10">
                    <div className="space-y-4">
                        <label className="block text-[11px] font-black uppercase text-brand-blue tracking-widest">Rubrique</label>
                        <select className="w-full p-6 bg-gray-50 rounded-[25px] font-bold outline-none border-2 border-transparent focus:border-brand-blue/10 transition-all" value={currentArticle.category || ''} onChange={e => setCurrentArticle({...currentArticle, category: e.target.value})}>
                            <option value="">Sélectionner...</option>
                            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-4">
                        <label className="block text-[11px] font-black uppercase text-brand-blue tracking-widest">Image de Une (URL)</label>
                        <input type="text" className="w-full p-6 bg-gray-50 rounded-[25px] text-xs font-mono outline-none" value={currentArticle.imageUrl || ''} onChange={e => setCurrentArticle({...currentArticle, imageUrl: e.target.value})} />
                        {currentArticle.imageUrl && <img src={currentArticle.imageUrl} className="w-full h-48 object-cover rounded-[35px] shadow-xl" alt="Aperçu" />}
                    </div>
                    <div className="bg-blue-50/40 p-10 rounded-[45px] space-y-6">
                        <div className="flex justify-between items-center">
                            <label className="text-[11px] font-black uppercase text-brand-blue tracking-widest">Chapeau (IA)</label>
                            <button onClick={handleAIFill} className="text-[9px] font-black bg-brand-dark text-white px-6 py-2 rounded-full hover:bg-brand-red transition-all">GÉNÉRER CONTENU</button>
                        </div>
                        <textarea className="w-full p-6 bg-white rounded-[35px] text-base italic font-serif border-none outline-none h-40 resize-none shadow-sm" value={currentArticle.excerpt || ''} onChange={e => setCurrentArticle({...currentArticle, excerpt: e.target.value})} placeholder="Court résumé de l'article..." />
                    </div>
                    <div className="space-y-4">
                        <label className="block text-[11px] font-black uppercase text-brand-blue tracking-widest">Vidéo (URL)</label>
                        <input type="text" className="w-full p-6 bg-gray-50 rounded-[25px] text-xs font-mono outline-none" placeholder="Lien vidéo..." value={currentArticle.videoUrl || ''} onChange={e => setCurrentArticle({...currentArticle, videoUrl: e.target.value})} />
                    </div>
                </aside>
            </div>
        </div>
      )}

      {/* --- MODAL RUBRIQUE --- */}
      {isCategoryModalOpen && (
          <div className="fixed inset-0 bg-brand-dark/95 backdrop-blur-3xl z-[200] flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-md rounded-[55px] p-16 shadow-2xl relative">
                  <button onClick={() => setIsCategoryModalOpen(false)} className="absolute top-10 right-10 text-gray-300 text-2xl">✕</button>
                  <h2 className="text-4xl font-serif font-black mb-10 text-brand-dark uppercase tracking-tighter">Rubrique</h2>
                  <div className="space-y-8">
                      <input type="text" className="w-full p-7 bg-gray-50 rounded-[35px] font-bold text-xl outline-none" placeholder="Nom de la rubrique..." value={currentCategory.name || ''} onChange={e => setCurrentCategory({...currentCategory, name: e.target.value})} />
                      <button onClick={handleSaveCategory} className="w-full py-7 bg-brand-blue text-white rounded-[40px] font-black uppercase shadow-2xl">Valider</button>
                  </div>
              </div>
          </div>
      )}

      {/* --- MODAL PUBLICITÉ --- */}
      {isAdModalOpen && (
          <div className="fixed inset-0 bg-brand-dark/95 backdrop-blur-3xl z-[200] flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-2xl rounded-[65px] p-16 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                  <button onClick={() => setIsAdModalOpen(false)} className="absolute top-12 right-12 text-gray-300 text-2xl">✕</button>
                  <h2 className="text-4xl font-serif font-black mb-12 text-brand-dark uppercase tracking-tighter">Publicité</h2>
                  <div className="space-y-8">
                      <input type="text" className="w-full p-6 bg-gray-50 rounded-[25px] font-bold outline-none" placeholder="Titre de la campagne..." value={currentAd.title || ''} onChange={e => setCurrentAd({...currentAd, title: e.target.value})} />
                      <div className="grid grid-cols-2 gap-8">
                          <select className="w-full p-6 bg-gray-50 rounded-[25px] font-bold outline-none" value={currentAd.type || AdType.IMAGE} onChange={e => setCurrentAd({...currentAd, type: e.target.value as AdType})}>
                              <option value={AdType.IMAGE}>Image</option>
                              <option value={AdType.VIDEO}>Vidéo</option>
                              <option value={AdType.SCRIPT}>Script HTML</option>
                          </select>
                          <select className="w-full p-6 bg-gray-50 rounded-[25px] font-bold outline-none" value={currentAd.location || AdLocation.HEADER_LEADERBOARD} onChange={e => setCurrentAd({...currentAd, location: e.target.value as AdLocation})}>
                              <option value={AdLocation.HEADER_LEADERBOARD}>Haut de page</option>
                              <option value={AdLocation.SIDEBAR_SQUARE}>Sidebar (Carré)</option>
                              <option value={AdLocation.SIDEBAR_SKYSCRAPER}>Sidebar (Large)</option>
                          </select>
                      </div>
                      <textarea className="w-full p-8 bg-gray-50 rounded-[35px] font-mono text-xs outline-none h-44" placeholder="URL du média ou Code Script..." value={currentAd.content || ''} onChange={e => setCurrentAd({...currentAd, content: e.target.value})} />
                      <input type="text" className="w-full p-6 bg-gray-50 rounded-[25px] font-bold outline-none" placeholder="Lien de redirection..." value={currentAd.linkUrl || ''} onChange={e => setCurrentAd({...currentAd, linkUrl: e.target.value})} />
                      <label className="flex items-center gap-4 cursor-pointer">
                          <input type="checkbox" checked={currentAd.active} onChange={e => setCurrentAd({...currentAd, active: e.target.checked})} className="w-6 h-6 rounded border-gray-300 text-brand-blue" />
                          <span className="font-bold uppercase text-xs tracking-widest">Activer cette publicité</span>
                      </label>
                      <button onClick={handleSaveAd} className="w-full py-7 bg-brand-blue text-white rounded-[40px] font-black uppercase tracking-widest shadow-2xl">Enregistrer la pub</button>
                  </div>
              </div>
          </div>
      )}

      {/* --- MODAL SUPPRESSION RUBRIQUE --- */}
      {isDeleteCategoryModalOpen && (
        <div className="fixed inset-0 bg-brand-dark/95 backdrop-blur-3xl z-[200] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-2xl rounded-[55px] p-16 shadow-2xl relative">
            <button onClick={() => setIsDeleteCategoryModalOpen(false)} className="absolute top-10 right-10 text-gray-300 text-2xl">✕</button>
            <h2 className="text-4xl font-serif font-black mb-10 text-brand-dark uppercase tracking-tighter">Supprimer la rubrique</h2>

            {(() => {
              const articlesInCategory = articles.filter(art => art.category === currentCategory.name);
              return (
                <div className="space-y-8">
                  <div className="bg-red-50 p-6 rounded-2xl border border-red-200">
                    <p className="text-red-800 font-bold mb-2">⚠️ Attention !</p>
                    <p className="text-red-700">
                      Cette rubrique contient <strong>{articlesInCategory.length} article{articlesInCategory.length > 1 ? 's' : ''}</strong>.
                      {articlesInCategory.length > 0 && " Vous devez les réaffecter avant de supprimer."}
                    </p>
                  </div>

                  {articlesInCategory.length > 0 && (
                    <div className="space-y-4">
                      <label className="block text-[11px] font-black uppercase text-brand-blue tracking-widest">
                        Réaffecter les articles vers :
                      </label>
                      <select
                        className="w-full p-6 bg-gray-50 rounded-[25px] font-bold outline-none border-2 border-transparent focus:border-brand-blue/10 transition-all"
                        onChange={(e) => setTargetCategoryForReassign(e.target.value)}
                        value={targetCategoryForReassign}
                      >
                        <option value="">Sélectionner une rubrique...</option>
                        {categories.filter(c => c.id !== currentCategory.id).map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                        <option value="__new__">Créer une nouvelle rubrique...</option>
                      </select>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <button
                      onClick={() => setIsDeleteCategoryModalOpen(false)}
                      className="flex-1 py-7 bg-gray-100 text-gray-600 rounded-[40px] font-black uppercase"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleDeleteCategory}
                      className="flex-1 py-7 bg-brand-red text-white rounded-[40px] font-black uppercase shadow-2xl"
                    >
                      {articlesInCategory.length > 0 ? "Réaffecter & Supprimer" : "Supprimer"}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* --- MODAL UTILISATEUR / PROFIL --- */}
      {isUserModalOpen && (
          <div className="fixed inset-0 bg-brand-dark/95 backdrop-blur-3xl z-[200] flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-lg rounded-[65px] p-16 shadow-2xl relative">
                  <button onClick={() => setIsUserModalOpen(false)} className="absolute top-12 right-12 text-gray-300 text-2xl">✕</button>
                  <h2 className="text-4xl font-serif font-black mb-12 text-brand-dark uppercase tracking-tighter">Profil Staff</h2>
                  <div className="space-y-8">
                      {/* Name - Editable only if admin or creating new */}
                      <input 
                        type="text" 
                        className="w-full p-7 bg-gray-50 rounded-[35px] font-bold outline-none border-2 border-transparent focus:border-brand-blue/10 transition-all" 
                        placeholder="Nom Complet..." 
                        value={currentEditUser.name || ''} 
                        onChange={e => setCurrentEditUser({...currentEditUser, name: e.target.value})} 
                        disabled={user?.role !== UserRole.ADMIN && currentEditUser.id !== undefined} // Only admin can edit names of existing users
                      />
                      
                      {/* Email - Same rule */}
                      <input 
                        type="email" 
                        className="w-full p-7 bg-gray-50 rounded-[35px] font-bold outline-none border-2 border-transparent focus:border-brand-blue/10 transition-all" 
                        placeholder="Email professionnel..." 
                        value={currentEditUser.email || ''} 
                        onChange={e => setCurrentEditUser({...currentEditUser, email: e.target.value})} 
                        disabled={user?.role !== UserRole.ADMIN && currentEditUser.id !== undefined}
                      />

                      {/* Mot de passe seulement pour admin ou si c'est un nouveau compte */}
                      {(PERMISSIONS.canManageUsers(user?.role!) || !currentEditUser.id) && (
                        <div className="relative">
                          <input type={showPassword ? 'text' : 'password'} className="w-full p-7 bg-gray-50 rounded-[35px] font-bold outline-none pr-20" placeholder="Mot de passe..." value={currentEditUser.password || ''} onChange={e => setCurrentEditUser({...currentEditUser, password: e.target.value})} />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-300">👁️</button>
                        </div>
                      )}

                      {/* Sélection du rôle seulement pour admin */}
                      {PERMISSIONS.canManageUsers(user?.role!) ? (
                        <select className="w-full p-7 bg-gray-50 rounded-[35px] font-bold outline-none appearance-none" value={currentEditUser.role || UserRole.CONTRIBUTOR} onChange={e => setCurrentEditUser({...currentEditUser, role: e.target.value as UserRole})}>
                            <option value={UserRole.ADMIN}>ADMINISTRATEUR</option>
                            <option value={UserRole.EDITOR}>ÉDITEUR</option>
                            <option value={UserRole.CONTRIBUTOR}>CONTRIBUTEUR</option>
                        </select>
                      ) : (
                        <div className="w-full p-7 bg-gray-100 rounded-[35px] font-bold text-gray-500">
                            {currentEditUser.role || user?.role}
                        </div>
                      )}

                      {/* Bouton supprimer seulement pour admin et pas pour soi-même */}
                      {PERMISSIONS.canManageUsers(user?.role!) && currentEditUser.id !== user?.id && currentEditUser.id && (
                        <button
                          onClick={() => {
                            if (confirm('Supprimer cet utilisateur ?')) {
                              deleteUser(currentEditUser.id!).then(() => {
                                setIsUserModalOpen(false);
                                loadData();
                              });
                            }
                          }}
                          className="w-full py-4 bg-red-50 text-red-600 rounded-[40px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all"
                        >
                          Supprimer l'utilisateur
                        </button>
                      )}

                      {/* Save button only if allowed */}
                      {(PERMISSIONS.canManageUsers(user?.role!) || !currentEditUser.id) && (
                          <button onClick={handleSaveUser} className="w-full py-7 bg-brand-blue text-white rounded-[40px] font-black uppercase tracking-widest shadow-2xl hover:scale-105 transition-all">
                            {currentEditUser.id ? 'Mettre à jour' : 'Créer le compte'}
                          </button>
                      )}
                  </div>
              </div>
          </div>
      )}

      {isProcessing && (
          <div className="fixed inset-0 bg-brand-dark/60 backdrop-blur-2xl z-[500] flex items-center justify-center">
              <div className="bg-white p-24 rounded-[90px] shadow-2xl flex flex-col items-center">
                  <div className="w-28 h-28 border-[12px] border-brand-blue border-t-transparent rounded-full animate-spin mb-12"></div>
                  <p className="font-black text-3xl text-brand-dark uppercase tracking-[0.5em] animate-pulse">Traitement...</p>
              </div>
          </div>
      )}
    </div>
  );
};