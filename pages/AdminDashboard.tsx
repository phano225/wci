
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getArticles, getUsers, saveArticle, deleteArticle, saveUser, deleteUser, getCategories, saveCategory, deleteCategory, updateCategory, bulkUpdateArticleCategory, getAds, saveAd, deleteAd } from '../services/mockDatabase';
import { Article, User, UserRole, ArticleStatus, PERMISSIONS, Category, Ad, AdType, AdLocation } from '../types';
import { useNavigate, Link } from 'react-router-dom';

export const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'articles' | 'users' | 'categories' | 'ads' | 'profile'>('articles');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Data State
  const [articles, setArticles] = useState<Article[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [adsList, setAdsList] = useState<Ad[]>([]);
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);

  // Modals State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);

  // Category Management State
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<{id: string, name: string} | null>(null);
  const [categoryDeleteData, setCategoryDeleteData] = useState<{category: Category, articleCount: number} | null>(null);
  const [targetCategoryForMove, setTargetCategoryForMove] = useState<string>('');

  // Rich Editor Refs & State
  const editorRef = useRef<HTMLDivElement>(null);
  const lastSelection = useRef<Range | null>(null);
  
  const [activeTool, setActiveTool] = useState<'link' | 'image' | 'video' | null>(null);
  const [toolInputValue, setToolInputValue] = useState('');
  const [toolInputText, setToolInputText] = useState('');

  // Forms State
  const [currentArticle, setCurrentArticle] = useState<Partial<Article>>({
      title: '', excerpt: '', content: '', category: '', imageUrl: '', videoUrl: '', status: ArticleStatus.DRAFT
  });
  const [currentUserData, setCurrentUserData] = useState<Partial<User>>({
      name: '', email: '', role: UserRole.CONTRIBUTOR, avatar: ''
  });
  const [newUserPassword, setNewUserPassword] = useState(''); 
  const [currentAd, setCurrentAd] = useState<Partial<Ad>>({
      title: '', location: AdLocation.HEADER_LEADERBOARD, type: AdType.IMAGE, content: '', linkUrl: '', active: true
  });

  const [mediaTab, setMediaTab] = useState<'image' | 'video'>('image');
  const [uploadType, setUploadType] = useState<'url' | 'file'>('url');
  
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    // Petit délai pour laisser le temps à initDB de se terminer si c'est le premier lancement
    const timer = setTimeout(() => {
        refreshData();
    }, 100);
    return () => clearTimeout(timer);
  }, [user, navigate]);

  useEffect(() => {
    if (isEditorOpen && editorRef.current) {
        if (editorRef.current.innerHTML !== (currentArticle.content || '')) {
             editorRef.current.innerHTML = currentArticle.content || '';
        }
    }
  }, [isEditorOpen, currentArticle.id]); 

  const refreshData = async () => {
    setIsProcessing(true);
    try {
        const [arts, usrs, cats, ads] = await Promise.all([
            getArticles(),
            getUsers(),
            getCategories(),
            getAds()
        ]);
        setArticles(arts);
        setUsersList(usrs);
        setCategoriesList(cats);
        setAvailableCategories(cats);
        setAdsList(ads);
    } catch(e) {
        console.error("Erreur chargement données:", e);
    }
    setIsProcessing(false);
  };

  // --- Rich Editor Functions ---
  const saveSelectionState = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current && editorRef.current.contains(sel.anchorNode)) {
        lastSelection.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    if (editorRef.current) {
        editorRef.current.focus();
        const range = lastSelection.current;
        if (range) {
            const sel = window.getSelection();
            if (sel) {
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
    }
  };

  const execCmd = (command: string, value: string | undefined = undefined) => {
    restoreSelection();
    document.execCommand(command, false, value);
    if(editorRef.current) editorRef.current.focus();
    handleEditorInput();
  };

  const handleEditorInput = () => {
      saveSelectionState();
      if (editorRef.current) {
          setCurrentArticle(prev => ({ ...prev, content: editorRef.current!.innerHTML }));
      }
  };

  const initTool = (tool: 'link' | 'image' | 'video') => {
      if (!lastSelection.current) {
          if(editorRef.current) editorRef.current.focus();
          saveSelectionState();
      }
      const sel = window.getSelection();
      if (tool === 'link' && sel && !sel.isCollapsed) {
          setToolInputText(sel.toString());
      } else {
          setToolInputText('');
      }
      setActiveTool(tool);
      setToolInputValue('');
  };

  const cancelTool = () => {
      setActiveTool(null);
      setToolInputValue('');
      setToolInputText('');
      restoreSelection();
  };

  const applyTool = () => {
      if (!toolInputValue) {
          cancelTool();
          return;
      }
      restoreSelection();
      if (activeTool === 'link') {
          const textToShow = toolInputText || toolInputValue;
          const linkHtml = `<a href="${toolInputValue}" target="_blank" style="color: #0055a4; text-decoration: underline; font-weight: 500;">${textToShow}</a>`;
          document.execCommand('insertHTML', false, linkHtml);
      } else if (activeTool === 'image') {
          document.execCommand('insertImage', false, toolInputValue);
      } else if (activeTool === 'video') {
           let html = '';
           const url = toolInputValue.trim();
           const ytRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
           const match = url.match(ytRegExp);

           if (match && match[2].length === 11) {
              const videoId = match[2];
              html = `<iframe width="100%" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="margin: 10px 0;"></iframe><br/>`;
           } else if (url.startsWith('<iframe')) {
               html = url + '<br/>';
           } else {
               html = `<video controls width="100%" src="${url}" style="margin: 10px 0;"></video><br/>`;
           }
           if (html) document.execCommand('insertHTML', false, html);
      }
      handleEditorInput();
      setActiveTool(null);
      setToolInputValue('');
      setToolInputText('');
  };

  // --- Article Logic ---
  const handleCreateNew = () => {
    setCurrentArticle({
        title: '', excerpt: '', content: '',
        category: availableCategories[0]?.name || 'Politique',
        imageUrl: 'https://picsum.photos/800/600', videoUrl: '',
        status: ArticleStatus.DRAFT
    });
    setMediaTab('image');
    setUploadType('url');
    setIsEditorOpen(true);
    lastSelection.current = null;
    setActiveTool(null);
  };

  const handleEdit = (article: Article) => {
    if (user?.role === UserRole.ADMIN || article.authorId === user?.id) {
        if (user?.role === UserRole.CONTRIBUTOR && article.status !== ArticleStatus.DRAFT) {
            alert("Vous ne pouvez plus modifier un article soumis.");
            return;
        }
        setCurrentArticle({ ...article });
        setMediaTab('image');
        setUploadType(article.imageUrl && article.imageUrl.startsWith('data:') ? 'file' : 'url');
        setIsEditorOpen(true);
        lastSelection.current = null;
        setActiveTool(null);
    } else {
        alert("Action non autorisée.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'imageUrl' | 'videoUrl') => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.size > 10 * 1024 * 1024) {
            alert("Fichier trop volumineux (Max 10MB).");
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setCurrentArticle({ ...currentArticle, [field]: reader.result as string });
        };
        reader.readAsDataURL(file);
    }
  };

  const handleSaveArticle = async () => {
    if (!user || !currentArticle.title) return;
    setIsProcessing(true);
    const finalContent = editorRef.current ? editorRef.current.innerHTML : currentArticle.content || '';

    let status = currentArticle.status || ArticleStatus.DRAFT;
    if (user.role === UserRole.CONTRIBUTOR) {
        if (status === ArticleStatus.PUBLISHED) status = ArticleStatus.SUBMITTED;
    }

    const newArticle: Article = {
        id: currentArticle.id || Date.now().toString(),
        title: currentArticle.title!,
        excerpt: currentArticle.excerpt || '',
        content: finalContent,
        category: currentArticle.category || 'Général',
        imageUrl: currentArticle.imageUrl || 'https://picsum.photos/800/600',
        videoUrl: currentArticle.videoUrl || '',
        authorId: currentArticle.authorId || user.id,
        authorName: currentArticle.authorName || user.name,
        authorAvatar: currentArticle.authorAvatar || user.avatar,
        status: status,
        createdAt: currentArticle.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    await saveArticle(newArticle);
    setIsEditorOpen(false);
    await refreshData();
    setIsProcessing(false);
  };

  const handleDelete = async (id: string) => {
    if (user && PERMISSIONS.canDeleteArticle(user.role)) {
        if (window.confirm("Êtes-vous sûr de vouloir supprimer définitivement cet article ?")) {
            setIsProcessing(true);
            await deleteArticle(id);
            await refreshData();
            setIsProcessing(false);
        }
    } else {
        alert("Seul l'Administrateur peut supprimer des articles.");
    }
  };

  const handleStatusChange = async (article: Article, newStatus: ArticleStatus) => {
    if (!user) return;
    if (newStatus === ArticleStatus.PUBLISHED && !PERMISSIONS.canPublish(user.role)) {
        alert("Vous n'avez pas les droits de publication.");
        return;
    }
    setIsProcessing(true);
    const updated = { ...article, status: newStatus, updatedAt: new Date().toISOString() };
    await saveArticle(updated);
    await refreshData();
    setIsProcessing(false);
  };

  // --- User Logic ---
  const handleOpenUserModal = (userData?: User) => {
    setNewUserPassword('');
    if (userData && userData.id) {
        setCurrentUserData({...userData});
    } else {
        setCurrentUserData({
            name: '', email: '', role: UserRole.CONTRIBUTOR,
            avatar: 'https://ui-avatars.com/api/?name=User', id: ''
        });
    }
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async () => {
    if (!currentUserData.name || !currentUserData.email || !currentUserData.role) {
        alert("Veuillez remplir les champs obligatoires");
        return;
    }
    setIsProcessing(true);
    const newUser: User = {
        id: currentUserData.id || 'u' + Date.now(),
        name: currentUserData.name,
        email: currentUserData.email,
        role: currentUserData.role,
        avatar: currentUserData.avatar || `https://ui-avatars.com/api/?name=${currentUserData.name}`,
        password: newUserPassword ? newUserPassword : (currentUserData.password || '123456')
    };
    await saveUser(newUser);
    setIsUserModalOpen(false);
    await refreshData();
    setIsProcessing(false);
  };

  const handleDeleteUser = async (id: string) => {
      if(window.confirm("Supprimer cet utilisateur ?")) {
          setIsProcessing(true);
          await deleteUser(id);
          await refreshData();
          setIsProcessing(false);
      }
  };

  // --- Category Logic ---
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    setIsProcessing(true);
    const newCat: Category = {
        id: 'c' + Date.now(),
        name: newCategoryName.trim(),
        slug: newCategoryName.trim()
    };
    await saveCategory(newCat);
    setNewCategoryName('');
    await refreshData();
    setIsProcessing(false);
  };

  const initiateDeleteCategory = (category: Category) => {
      const count = articles.filter(a => a.category === category.name).length;
      if (count > 0) {
          setCategoryDeleteData({ category, articleCount: count });
          const firstAvailable = categoriesList.find(c => c.id !== category.id);
          if (firstAvailable) setTargetCategoryForMove(firstAvailable.name);
      } else {
          if (window.confirm(`Supprimer la catégorie "${category.name}" ?`)) {
              deleteCategoryDirectly(category.id);
          }
      }
  };

  const deleteCategoryDirectly = async (id: string) => {
      setIsProcessing(true);
      await deleteCategory(id);
      await refreshData();
      setIsProcessing(false);
  };

  const confirmCategoryDeleteWithMove = async () => {
      if (!categoryDeleteData || !targetCategoryForMove) return;
      setIsProcessing(true);
      await bulkUpdateArticleCategory(categoryDeleteData.category.name, targetCategoryForMove);
      await deleteCategory(categoryDeleteData.category.id);
      setCategoryDeleteData(null);
      await refreshData();
      setIsProcessing(false);
  };

  const saveEditingCategory = async () => {
      if (!editingCategory || !editingCategory.name.trim()) return;
      setIsProcessing(true);
      await updateCategory(editingCategory.id, editingCategory.name.trim());
      setEditingCategory(null);
      await refreshData();
      setIsProcessing(false);
  };

  // --- AD MANAGEMENT LOGIC ---
  const handleOpenAdModal = (ad?: Ad) => {
      if (ad && ad.id) { setCurrentAd({...ad}); } 
      else {
          setCurrentAd({
              title: '', location: AdLocation.HEADER_LEADERBOARD, type: AdType.IMAGE, content: '', linkUrl: '', active: true
          });
      }
      setIsAdModalOpen(true);
  };

  const handleAdContentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setCurrentAd({ ...currentAd, content: reader.result as string });
        };
        reader.readAsDataURL(file);
    }
  };

  const handleSaveAd = async () => {
      if (!currentAd.title || !currentAd.content) {
          alert("Veuillez remplir les champs obligatoires");
          return;
      }
      setIsProcessing(true);
      const newAd: Ad = {
          id: currentAd.id || 'ad' + Date.now(),
          title: currentAd.title,
          location: currentAd.location || AdLocation.HEADER_LEADERBOARD,
          type: currentAd.type || AdType.IMAGE,
          content: currentAd.content,
          linkUrl: currentAd.linkUrl || '',
          active: currentAd.active !== undefined ? currentAd.active : true
      };
      await saveAd(newAd);
      setIsAdModalOpen(false);
      await refreshData();
      setIsProcessing(false);
  };

  const handleDeleteAd = async (id: string) => {
      if(window.confirm("Supprimer cette publicité ?")) {
          setIsProcessing(true);
          await deleteAd(id);
          await refreshData();
          setIsProcessing(false);
      }
  };

  if (!user) return null;

  return (
    <>
      <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row relative z-0">
        {isProcessing && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-[10000] flex items-center justify-center text-white">
                <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-2"></div>
                    <div>Traitement en cours...</div>
                </div>
            </div>
        )}
        
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-64 bg-brand-dark text-white flex flex-col md:fixed md:h-full z-10 overflow-y-auto shadow-xl">
          <div className="p-6 border-b border-gray-700 flex flex-col items-center text-center">
              <img src={user.avatar || "https://placehold.co/150x150/0055a4/ffffff?text=WCI"} alt="Logo" className="w-20 h-20 rounded-full mb-3 border-2 border-brand-yellow object-cover" />
              <h1 className="font-serif text-lg font-bold leading-none">{user.name}</h1>
              <span className="text-brand-red font-bold uppercase tracking-wider text-[10px] mt-1">{user.role} - WCI ADMIN</span>
          </div>
          
          <nav className="flex-1 p-4 space-y-2 text-sm">
              <button onClick={() => setActiveTab('articles')} className={`w-full text-left px-4 py-3 rounded transition-colors ${activeTab === 'articles' ? 'bg-brand-blue text-white font-bold' : 'text-gray-300 hover:bg-gray-800'}`}>📄 Tous les Articles</button>
              {PERMISSIONS.canManageCategories(user.role) && <button onClick={() => setActiveTab('categories')} className={`w-full text-left px-4 py-3 rounded transition-colors ${activeTab === 'categories' ? 'bg-brand-blue text-white font-bold' : 'text-gray-300 hover:bg-gray-800'}`}>🏷️ Gestion Catégories</button>}
              {PERMISSIONS.canManageAds(user.role) && <button onClick={() => setActiveTab('ads')} className={`w-full text-left px-4 py-3 rounded transition-colors ${activeTab === 'ads' ? 'bg-brand-blue text-white font-bold' : 'text-gray-300 hover:bg-gray-800'}`}>📢 Gestion Publicités</button>}
              {PERMISSIONS.canManageUsers(user.role) && <button onClick={() => setActiveTab('users')} className={`w-full text-left px-4 py-3 rounded transition-colors ${activeTab === 'users' ? 'bg-brand-blue text-white font-bold' : 'text-gray-300 hover:bg-gray-800'}`}>👥 Gestion Utilisateurs</button>}
              <button onClick={() => setActiveTab('profile')} className={`w-full text-left px-4 py-3 rounded transition-colors ${activeTab === 'profile' ? 'bg-brand-blue text-white font-bold' : 'text-gray-300 hover:bg-gray-800'}`}>👤 Mon Profil</button>
          </nav>
          <div className="p-4 border-t border-gray-700">
              <Link to="/" className="block text-center w-full py-2 mb-2 text-gray-400 text-xs hover:text-white">Retour au Site</Link>
              <button onClick={logout} className="w-full py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-bold shadow-md">Déconnexion</button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="md:ml-64 flex-1 p-4 md:p-8 overflow-y-auto z-0">
          
          {/* ARTICLES TAB */}
          {activeTab === 'articles' && (
              <div>
                  <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                      <div>
                          <h2 className="text-3xl font-serif font-bold text-gray-800">Articles</h2>
                          <p className="text-gray-500 text-sm">Gérez le contenu éditorial du journal.</p>
                      </div>
                      <button onClick={handleCreateNew} className="bg-brand-blue text-white px-6 py-3 rounded-full hover:bg-blue-700 shadow-lg font-bold text-sm flex items-center gap-2"><span>✏️</span> Rédiger un Article</button>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100">
                      <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                          <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold tracking-wider">
                              <tr><th className="p-4">Titre</th><th className="p-4">Auteur</th><th className="p-4">Catégorie</th><th className="p-4">Statut</th><th className="p-4 text-right">Actions</th></tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-sm">
                              {articles.map(article => (
                                  <tr key={article.id} className="hover:bg-blue-50 transition-colors">
                                      <td className="p-4 font-bold text-gray-800 max-w-xs truncate">{article.title}</td>
                                      <td className="p-4 text-gray-600 flex items-center gap-2">{article.authorAvatar && <img src={article.authorAvatar} className="w-6 h-6 rounded-full"/>}{article.authorName}</td>
                                      <td className="p-4"><span className="inline-block bg-brand-blue text-white px-2 py-1 rounded text-xs font-bold shadow-sm">{article.category}</span></td>
                                      <td className="p-4"><span className={`px-3 py-1 rounded-full text-xs font-bold border ${article.status === ArticleStatus.PUBLISHED ? 'bg-green-50 text-green-700 border-green-200' : article.status === ArticleStatus.SUBMITTED ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>{article.status}</span></td>
                                      <td className="p-4 text-right space-x-2">
                                          {(user.role === UserRole.ADMIN || article.authorId === user.id) && <button onClick={() => handleEdit(article)} className="text-blue-600 hover:text-blue-800 font-medium">Éditer</button>}
                                          {PERMISSIONS.canPublish(user.role) && article.status === ArticleStatus.SUBMITTED && <button onClick={() => handleStatusChange(article, ArticleStatus.PUBLISHED)} className="text-green-600 font-bold hover:underline">Valider</button>}
                                          {PERMISSIONS.canPublish(user.role) && article.status === ArticleStatus.PUBLISHED && <button onClick={() => handleStatusChange(article, ArticleStatus.DRAFT)} className="text-orange-600 hover:underline">Dépublier</button>}
                                          {PERMISSIONS.canDeleteArticle(user.role) && <button onClick={() => handleDelete(article.id)} className="text-red-600 hover:text-red-800 ml-2">Supprimer</button>}
                                      </td>
                                  </tr>
                              ))}
                              {articles.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-400 italic">Aucun article trouvé.</td></tr>}
                          </tbody>
                      </table>
                      </div>
                  </div>
              </div>
          )}

          {/* ADS TAB */}
          {activeTab === 'ads' && PERMISSIONS.canManageAds(user.role) && (
              <div>
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-3xl font-serif font-bold text-gray-800">Gestion Publicités</h2>
                      <button onClick={() => handleOpenAdModal()} className="bg-brand-blue text-white px-6 py-3 rounded-full hover:bg-blue-700 font-bold text-sm">+ Nouvelle Pub</button>
                  </div>
                  <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100">
                      <table className="w-full text-left border-collapse">
                          <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold tracking-wider">
                              <tr><th className="p-4">Titre</th><th className="p-4">Emplacement</th><th className="p-4">Type</th><th className="p-4">Statut</th><th className="p-4 text-right">Actions</th></tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-sm">
                              {adsList.map(ad => (
                                  <tr key={ad.id} className="hover:bg-gray-50">
                                      <td className="p-4 font-bold text-gray-800">{ad.title}</td>
                                      <td className="p-4 text-xs"><span className="bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200">{ad.location}</span></td>
                                      <td className="p-4 text-gray-600">{ad.type}</td>
                                      <td className="p-4">{ad.active ? <span className="text-green-600 font-bold text-xs bg-green-50 px-2 py-1 rounded">Actif</span> : <span className="text-gray-500 font-bold text-xs bg-gray-100 px-2 py-1 rounded">Inactif</span>}</td>
                                      <td className="p-4 text-right space-x-2"><button onClick={() => handleOpenAdModal(ad)} className="text-blue-600 font-medium">Modifier</button><button onClick={() => handleDeleteAd(ad.id)} className="text-red-600 font-medium">Supprimer</button></td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          )}

          {/* CATEGORIES TAB */}
          {activeTab === 'categories' && PERMISSIONS.canManageCategories(user.role) && (
              <div>
                  <h2 className="text-3xl font-serif font-bold text-gray-800 mb-2">Gestion des Catégories</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      <div className="bg-white p-6 rounded-lg shadow-md h-fit border border-gray-100">
                          <h3 className="font-bold text-lg mb-4 text-gray-800">Nouvelle Catégorie</h3>
                          <div className="flex flex-col gap-3">
                              <input 
                                type="text" 
                                placeholder="Nom de la catégorie..." 
                                className="border border-gray-300 p-3 rounded outline-none bg-white text-gray-900 focus:ring-2 focus:ring-brand-blue" 
                                value={newCategoryName} 
                                onChange={(e) => setNewCategoryName(e.target.value)} 
                                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()} 
                              />
                              <button onClick={handleAddCategory} className="bg-brand-blue text-white py-2 rounded font-bold hover:bg-blue-700 shadow">Ajouter</button>
                          </div>
                      </div>
                      <div className="lg:col-span-2 bg-white rounded-lg shadow-md overflow-hidden border border-gray-100">
                          <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b text-gray-500 text-xs uppercase font-bold">
                                <tr><th className="p-4">Nom</th><th className="p-4 text-right">Actions</th></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {categoriesList.map(cat => (
                                    <tr key={cat.id} className="hover:bg-gray-50">
                                        <td className="p-4 font-bold text-gray-900">
                                            {editingCategory && editingCategory.id === cat.id ? 
                                                <input 
                                                    type="text" 
                                                    autoFocus 
                                                    className="border border-brand-blue p-2 rounded outline-none bg-white text-gray-900" 
                                                    value={editingCategory.name} 
                                                    onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })} 
                                                /> : 
                                                cat.name
                                            }
                                        </td>
                                        <td className="p-4 text-right space-x-4">
                                            {editingCategory && editingCategory.id === cat.id ? (
                                                <><button onClick={saveEditingCategory} className="text-green-600 font-bold hover:underline">OK</button><button onClick={() => setEditingCategory(null)} className="text-gray-500 hover:underline">X</button></>
                                            ) : (
                                                <><button onClick={() => setEditingCategory({id: cat.id, name: cat.name})} className="text-brand-blue font-bold hover:underline">Modifier</button><button onClick={() => initiateDeleteCategory(cat)} className="text-brand-red font-bold hover:underline">Supprimer</button></>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {categoriesList.length === 0 && <tr><td colSpan={2} className="p-8 text-center text-gray-400">Aucune catégorie.</td></tr>}
                            </tbody>
                          </table>
                      </div>
                  </div>
              </div>
          )}

          {/* USERS TAB */}
          {activeTab === 'users' && PERMISSIONS.canManageUsers(user.role) && (
              <div>
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-3xl font-serif font-bold text-gray-800">Utilisateurs</h2>
                      <button onClick={() => handleOpenUserModal()} className="bg-brand-blue text-white px-6 py-3 rounded-full hover:bg-blue-700 font-bold text-sm shadow-lg">+ Nouvel Utilisateur</button>
                  </div>
                  <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100">
                      <table className="w-full text-left">
                          <thead className="bg-gray-50 border-b text-gray-500 text-xs uppercase font-bold">
                              <tr><th className="p-4">Utilisateur</th><th className="p-4">Rôle</th><th className="p-4 text-right">Actions</th></tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                              {usersList.map(u => (
                                  <tr key={u.id} className="hover:bg-gray-50">
                                      <td className="p-4 flex items-center gap-3">
                                          <img src={u.avatar} className="w-10 h-10 rounded-full object-cover border border-gray-200" alt={u.name} />
                                          <div>
                                              <div className="font-bold text-gray-900">{u.name}</div>
                                              <div className="text-xs text-gray-500">{u.email}</div>
                                          </div>
                                      </td>
                                      <td className="p-4"><span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">{u.role}</span></td>
                                      <td className="p-4 text-right space-x-3">
                                          <button onClick={() => handleOpenUserModal(u)} className="text-blue-600 font-medium hover:underline">Modifier</button>
                                          {u.id !== user.id && <button onClick={() => handleDeleteUser(u.id)} className="text-red-600 font-medium hover:underline">Supprimer</button>}
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          )}

          {/* PROFILE TAB (CORRIGÉ) */}
          {activeTab === 'profile' && (
              <div className="max-w-4xl mx-auto">
                  <h2 className="text-3xl font-serif font-bold text-gray-800 mb-6">Mon Profil</h2>
                  <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                      <div className="bg-brand-blue h-32 w-full"></div>
                      <div className="px-8 pb-8 -mt-16 relative">
                          <div className="flex flex-col md:flex-row items-end gap-6 mb-8">
                              <img src={user.avatar || "https://ui-avatars.com/api/?name=" + user.name} className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-white object-cover" alt={user.name} />
                              <div className="flex-1 pb-2">
                                  <h3 className="text-2xl font-bold text-gray-900">{user.name}</h3>
                                  <p className="text-brand-blue font-medium">{user.role}</p>
                              </div>
                              <button onClick={() => alert("Fonctionnalité de mise à jour en démo.")} className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg font-bold hover:bg-gray-200 border border-gray-200 transition-colors">Modifier mes infos</button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-gray-100">
                              <div className="space-y-4">
                                  <h4 className="font-bold text-gray-500 uppercase text-xs tracking-widest">Informations Générales</h4>
                                  <div className="space-y-2">
                                      <div className="flex justify-between border-b border-gray-50 pb-2">
                                          <span className="text-gray-500">Nom Complet</span>
                                          <span className="font-bold text-gray-800">{user.name}</span>
                                      </div>
                                      <div className="flex justify-between border-b border-gray-50 pb-2">
                                          <span className="text-gray-500">Adresse Email</span>
                                          <span className="font-bold text-gray-800">{user.email}</span>
                                      </div>
                                      <div className="flex justify-between border-b border-gray-50 pb-2">
                                          <span className="text-gray-500">Rôle Principal</span>
                                          <span className="font-bold text-brand-red">{user.role}</span>
                                      </div>
                                  </div>
                              </div>
                              <div className="space-y-4">
                                  <h4 className="font-bold text-gray-500 uppercase text-xs tracking-widest">Sécurité</h4>
                                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                      <p className="text-sm text-gray-600 mb-4">Votre mot de passe est géré de manière sécurisée. Vous pouvez le réinitialiser en contactant l'administrateur principal.</p>
                                      <button className="text-brand-blue text-sm font-bold hover:underline">Changer mon mot de passe →</button>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          )}
        </main>
      </div>

      {/* Editor Modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex flex-col overflow-hidden" style={{ zIndex: 9999 }}>
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <button onClick={() => setIsEditorOpen(false)} className="text-gray-500 hover:text-gray-800 text-xl font-bold">✕</button>
                    <div><h3 className="text-lg font-bold text-gray-800">{currentArticle.id ? 'Éditer' : 'Nouvel Article'}</h3><p className="text-xs text-gray-500">Statut: <span className="font-bold">{currentArticle.status}</span></p></div>
                </div>
                <div className="flex gap-3">
                     <button onClick={() => { setCurrentArticle({...currentArticle, status: ArticleStatus.DRAFT}); handleSaveArticle(); }} className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50">Brouillon</button>
                     {user.role === UserRole.CONTRIBUTOR ? <button onClick={() => { setCurrentArticle({...currentArticle, status: ArticleStatus.SUBMITTED}); handleSaveArticle(); }} className="px-6 py-2 bg-brand-yellow rounded font-bold">Soumettre</button> : <button onClick={() => { setCurrentArticle({...currentArticle, status: ArticleStatus.PUBLISHED}); handleSaveArticle(); }} className="px-6 py-2 bg-brand-blue text-white rounded font-bold">Publier</button>}
                </div>
            </div>
            <div className="flex-1 overflow-y-auto bg-gray-100 p-4 flex justify-center editor-scroll">
                <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-3 gap-6 h-fit">
                    <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-8 min-h-[500px] border border-gray-200 flex flex-col">
                        <input type="text" placeholder="Titre..." className="w-full text-4xl font-serif font-bold mb-6 outline-none bg-white text-gray-900" value={currentArticle.title} onChange={(e) => setCurrentArticle({...currentArticle, title: e.target.value})} />
                        <textarea placeholder="Chapeau..." className="w-full text-lg text-gray-700 italic border-l-4 border-gray-300 outline-none resize-none mb-6 h-24 bg-gray-50 p-4" value={currentArticle.excerpt} onChange={(e) => setCurrentArticle({...currentArticle, excerpt: e.target.value})} ></textarea>
                        <div className="flex-1 flex flex-col border border-gray-300 rounded overflow-hidden">
                            <div className="bg-gray-50 border-b border-gray-300 p-2 select-none">
                                <div className="flex gap-2 flex-wrap mb-2">
                                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => execCmd('bold')} className="p-2 hover:bg-gray-200 rounded font-bold">B</button>
                                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => execCmd('italic')} className="p-2 hover:bg-gray-200 rounded italic">I</button>
                                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => initTool('link')} className="p-2 hover:bg-gray-200 rounded">🔗</button>
                                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => initTool('image')} className="p-2 hover:bg-gray-200 rounded">🖼️</button>
                                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => initTool('video')} className="p-2 hover:bg-gray-200 rounded">🎥</button>
                                </div>
                                {activeTool && <div className="flex flex-col gap-2 bg-gray-100 p-2 rounded border"><input type="text" autoFocus className="border p-1 bg-white text-gray-900" placeholder="URL..." value={toolInputValue} onChange={(e) => setToolInputValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && applyTool()} /><div className="flex justify-end gap-2"><button onClick={cancelTool}>Annuler</button><button onClick={applyTool} className="bg-green-600 text-white px-2 rounded">OK</button></div></div>}
                            </div>
                            <div ref={editorRef} contentEditable suppressContentEditableWarning className="flex-1 p-4 bg-white outline-none prose max-w-none cursor-text text-gray-900" onInput={handleEditorInput} onKeyUp={saveSelectionState} onMouseUp={saveSelectionState}></div>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
                            <h4 className="font-bold mb-4 text-gray-800">Paramètres</h4>
                            <select className="w-full border p-2 rounded mb-4 bg-white text-gray-900" value={currentArticle.category} onChange={(e) => setCurrentArticle({...currentArticle, category: e.target.value})}>
                                {availableCategories.map(cat => (<option key={cat.id} value={cat.name}>{cat.name}</option>))}
                            </select>
                        </div>
                        <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
                             <h4 className="font-bold mb-4 text-gray-800">Média Principal</h4>
                             <div className="flex bg-gray-100 p-1 rounded mb-4">
                                <button onClick={() => setMediaTab('image')} className={`flex-1 py-1 text-sm font-bold rounded ${mediaTab === 'image' ? 'bg-white shadow text-brand-blue' : 'text-gray-500'}`}>Image</button>
                                <button onClick={() => setMediaTab('video')} className={`flex-1 py-1 text-sm font-bold rounded ${mediaTab === 'video' ? 'bg-white shadow text-brand-blue' : 'text-gray-500'}`}>Vidéo</button>
                             </div>
                             {mediaTab === 'image' && <div>
                                <div className="flex gap-4 mb-2 text-xs"><label className="cursor-pointer"><input type="radio" checked={uploadType === 'url'} onChange={() => setUploadType('url')} /> URL</label><label className="cursor-pointer"><input type="radio" checked={uploadType === 'file'} onChange={() => setUploadType('file')} /> Upload</label></div>
                                {uploadType === 'url' ? <input type="text" className="w-full border p-2 rounded text-sm bg-white text-gray-900" value={currentArticle.imageUrl} onChange={(e) => setCurrentArticle({...currentArticle, imageUrl: e.target.value})} /> : <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'imageUrl')} className="text-xs" />}
                                {currentArticle.imageUrl && <img src={currentArticle.imageUrl} className="w-full h-32 object-cover mt-2 rounded border border-gray-100 shadow-inner" />}
                             </div>}
                             {mediaTab === 'video' && <div><input type="text" className="w-full border p-2 rounded text-sm bg-white text-gray-900" placeholder="Youtube URL..." value={currentArticle.videoUrl} onChange={(e) => setCurrentArticle({...currentArticle, videoUrl: e.target.value})} /></div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
      
      {/* User Modal */}
      {isUserModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                <h3 className="text-lg font-bold mb-4 text-gray-900">{currentUserData.id ? 'Modifier' : 'Créer'} Utilisateur</h3>
                <div className="space-y-4">
                    <input type="text" placeholder="Nom complet" className="w-full border p-3 rounded bg-white text-gray-900" value={currentUserData.name} onChange={(e) => setCurrentUserData({...currentUserData, name: e.target.value})} />
                    <input type="email" placeholder="Email" className="w-full border p-3 rounded bg-white text-gray-900" value={currentUserData.email} onChange={(e) => setCurrentUserData({...currentUserData, email: e.target.value})} />
                    <input type="text" placeholder="Définir un mot de passe" className="w-full border p-3 rounded bg-white text-gray-900" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} />
                    <select className="w-full border p-3 rounded bg-white text-gray-900" value={currentUserData.role} onChange={(e) => setCurrentUserData({...currentUserData, role: e.target.value as UserRole})}><option value={UserRole.CONTRIBUTOR}>Contributeur</option><option value={UserRole.EDITOR}>Éditeur</option><option value={UserRole.ADMIN}>Admin</option></select>
                </div>
                <div className="flex justify-end gap-3 mt-6"><button onClick={() => setIsUserModalOpen(false)} className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Annuler</button><button onClick={handleSaveUser} className="px-6 py-2 bg-brand-blue text-white rounded-lg font-bold shadow hover:bg-blue-700">Enregistrer</button></div>
            </div>
          </div>
      )}

      {/* Ad Modal */}
      {isAdModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
             <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                 <h3 className="text-lg font-bold mb-4 text-gray-900">{currentAd.id ? 'Modifier' : 'Créer'} Publicité</h3>
                 <div className="space-y-4">
                     <input type="text" placeholder="Titre de la campagne" className="w-full border p-3 rounded bg-white text-gray-900" value={currentAd.title} onChange={(e) => setCurrentAd({...currentAd, title: e.target.value})} />
                     <select className="w-full border p-3 rounded bg-white text-gray-900" value={currentAd.location} onChange={(e) => setCurrentAd({...currentAd, location: e.target.value as AdLocation})}><option value={AdLocation.HEADER_LEADERBOARD}>En-tête (728x90)</option><option value={AdLocation.SIDEBAR_SQUARE}>Barre latérale haut (300x250)</option><option value={AdLocation.SIDEBAR_SKYSCRAPER}>Barre latérale bas (300x600)</option></select>
                     <div className="flex gap-4 p-2 bg-gray-50 rounded"><label className="cursor-pointer"><input type="radio" checked={currentAd.type === AdType.IMAGE} onChange={() => setCurrentAd({...currentAd, type: AdType.IMAGE})} /> Image</label><label className="cursor-pointer"><input type="radio" checked={currentAd.type === AdType.SCRIPT} onChange={() => setCurrentAd({...currentAd, type: AdType.SCRIPT})} /> Script / Code HTML</label></div>
                     {currentAd.type === AdType.IMAGE ? (
                        <div className="space-y-3">
                            <input type="file" onChange={handleAdContentUpload} className="w-full text-xs" />
                            <input type="text" placeholder="Lien de redirection (https://...)" className="w-full border p-3 rounded bg-white text-gray-900" value={currentAd.linkUrl} onChange={(e) => setCurrentAd({...currentAd, linkUrl: e.target.value})} />
                            {currentAd.content && <img src={currentAd.content} className="w-full h-24 object-contain bg-gray-100 rounded border p-1" alt="Aperçu Pub" />}
                        </div>
                     ) : (
                        <textarea className="w-full border p-3 h-32 rounded bg-white text-gray-900 font-mono text-sm" placeholder="Collez votre code iframe ou script ici..." value={currentAd.content} onChange={(e) => setCurrentAd({...currentAd, content: e.target.value})}></textarea>
                     )}
                     <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700 bg-gray-50 p-3 rounded border border-gray-100 shadow-sm"><input type="checkbox" className="w-4 h-4" checked={currentAd.active} onChange={(e) => setCurrentAd({...currentAd, active: e.target.checked})} /> Activer cette campagne</label>
                 </div>
                 <div className="flex justify-end gap-3 mt-6"><button onClick={() => setIsAdModalOpen(false)} className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Annuler</button><button onClick={handleSaveAd} className="px-6 py-2 bg-brand-blue text-white rounded-lg font-bold shadow hover:bg-blue-700">Enregistrer</button></div>
             </div>
          </div>
      )}
      
      {/* Category Delete Modal */}
      {categoryDeleteData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 99999 }}>
              <div className="bg-white rounded-xl p-8 max-w-md shadow-2xl">
                  <h3 className="text-xl font-bold text-brand-red mb-4">Attention : Catégorie non vide</h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">Cette catégorie contient <strong>{categoryDeleteData.articleCount} articles</strong>. Pour la supprimer, vous devez déplacer ces articles vers une autre catégorie :</p>
                  <select className="w-full border p-3 rounded-lg bg-white text-gray-900 font-bold mb-6" value={targetCategoryForMove} onChange={(e) => setTargetCategoryForMove(e.target.value)}>
                      {categoriesList.filter(c => c.id !== categoryDeleteData.category.id).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                  <div className="flex justify-end gap-3"><button onClick={() => setCategoryDeleteData(null)} className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Annuler</button><button onClick={confirmCategoryDeleteWithMove} className="px-6 py-2 bg-brand-red text-white rounded-lg font-bold shadow hover:bg-red-700">Déplacer et Supprimer</button></div>
              </div>
          </div>
      )}
    </>
  );
};
