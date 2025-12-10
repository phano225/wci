import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getArticles, getUsers, saveArticle, deleteArticle, saveUser, deleteUser, getCategories, saveCategory, deleteCategory, updateCategory, bulkUpdateArticleCategory, getAds, saveAd, deleteAd } from '../services/mockDatabase';
import { Article, User, UserRole, ArticleStatus, PERMISSIONS, Category, Ad, AdType, AdLocation } from '../types';
import { useNavigate, Link } from 'react-router-dom';

export const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'articles' | 'users' | 'categories' | 'ads' | 'profile'>('articles');
  
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
  
  // New State for Inline Toolbar Tools (replacing prompts)
  const [activeTool, setActiveTool] = useState<'link' | 'image' | 'video' | null>(null);
  const [toolInputValue, setToolInputValue] = useState('');
  const [toolInputText, setToolInputText] = useState(''); // New state for Link Text display

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

  // UI State
  const [mediaTab, setMediaTab] = useState<'image' | 'video'>('image');
  const [uploadType, setUploadType] = useState<'url' | 'file'>('url');
  
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    refreshData();
  }, [user, navigate]);

  // Sync content for editor ONLY when modal opens or article ID changes.
  useEffect(() => {
    if (isEditorOpen && editorRef.current) {
        if (editorRef.current.innerHTML !== (currentArticle.content || '')) {
             editorRef.current.innerHTML = currentArticle.content || '';
        }
    }
  }, [isEditorOpen, currentArticle.id]); 

  const refreshData = () => {
    setArticles(getArticles());
    setUsersList(getUsers());
    const cats = getCategories();
    setCategoriesList(cats);
    setAvailableCategories(cats);
    setAdsList(getAds());
  };

  // --- Rich Editor Functions ---
  
  // Track selection whenever it changes in the editor
  const saveSelectionState = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current && editorRef.current.contains(sel.anchorNode)) {
        lastSelection.current = sel.getRangeAt(0).cloneRange();
    }
  };

  // Helper: Restore the cursor position from the stored ref
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

  // Initialize tool usage (opens the input field in toolbar)
  const initTool = (tool: 'link' | 'image' | 'video') => {
      // Ensure we have a selection saved or create one at end
      if (!lastSelection.current) {
          if(editorRef.current) editorRef.current.focus();
          saveSelectionState();
      }

      // If text is selected for a link, pre-fill the Text Input
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
          // Use the custom text if provided, otherwise use the URL itself
          const textToShow = toolInputText || toolInputValue;
          
          // Create HTML with specific styling for the link (Brand Blue + Underline)
          const linkHtml = `<a href="${toolInputValue}" target="_blank" style="color: #0055a4; text-decoration: underline; font-weight: 500;">${textToShow}</a>`;
          
          // Using insertHTML allows us to inject the full anchor tag with style
          document.execCommand('insertHTML', false, linkHtml);

      } else if (activeTool === 'image') {
          document.execCommand('insertImage', false, toolInputValue);
      } else if (activeTool === 'video') {
           let html = '';
           const url = toolInputValue.trim();
           
           // Robust YouTube Regex to capture ID from various URL formats
           // Covers: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID, etc.
           const ytRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
           const match = url.match(ytRegExp);

           if (match && match[2].length === 11) {
              const videoId = match[2];
              html = `<iframe width="100%" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="margin: 10px 0;"></iframe><br/>`;
           } else if (url.startsWith('<iframe')) {
               // User pasted the full embed code
               html = url + '<br/>';
           } else {
               // Generic video URL (mp4, etc)
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
        title: '',
        excerpt: '',
        content: '',
        category: availableCategories[0]?.name || 'Politique',
        imageUrl: 'https://picsum.photos/800/600',
        videoUrl: '',
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
        if (file.size > 5 * 1024 * 1024) {
            alert("Fichier trop volumineux pour la démo (Max 5MB).");
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setCurrentArticle({ ...currentArticle, [field]: reader.result as string });
        };
        reader.readAsDataURL(file);
    }
  };

  const handleSaveArticle = () => {
    if (!user || !currentArticle.title) return;
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

    saveArticle(newArticle);
    setIsEditorOpen(false);
    refreshData();
  };

  const handleDelete = (id: string) => {
    if (user && PERMISSIONS.canDeleteArticle(user.role)) {
        if (window.confirm("Êtes-vous sûr de vouloir supprimer définitivement cet article ?")) {
            deleteArticle(id);
            refreshData();
        }
    } else {
        alert("Seul l'Administrateur peut supprimer des articles.");
    }
  };

  const handleStatusChange = (article: Article, newStatus: ArticleStatus) => {
    if (!user) return;
    if (newStatus === ArticleStatus.PUBLISHED && !PERMISSIONS.canPublish(user.role)) {
        alert("Vous n'avez pas les droits de publication.");
        return;
    }
    const updated = { ...article, status: newStatus, updatedAt: new Date().toISOString() };
    saveArticle(updated);
    refreshData();
  };

  // --- User Logic ---
  const handleOpenUserModal = (userData?: User) => {
    setNewUserPassword(''); // Reset password field
    if (userData && userData.id) {
        setCurrentUserData({...userData});
    } else {
        // Initialize with safe defaults for new user
        setCurrentUserData({
            name: '',
            email: '',
            role: UserRole.CONTRIBUTOR,
            avatar: 'https://ui-avatars.com/api/?name=User',
            id: '' // Empty ID signals creation
        });
    }
    setIsUserModalOpen(true);
  };

  const handleUserAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.size > 2 * 1024 * 1024) {
            alert("Image trop volumineuse (Max 2MB).");
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setCurrentUserData({ ...currentUserData, avatar: reader.result as string });
        };
        reader.readAsDataURL(file);
    }
  };

  const handleSaveUser = () => {
    if (!currentUserData.name || !currentUserData.email || !currentUserData.role) {
        alert("Veuillez remplir les champs obligatoires (Nom, Email, Rôle)");
        return;
    }
    
    // For new users, password is required. For edits, it's optional.
    if (!currentUserData.id && !newUserPassword) {
        alert("Un mot de passe est requis pour un nouvel utilisateur.");
        return;
    }

    const newUser: User = {
        id: currentUserData.id || 'u' + Date.now(),
        name: currentUserData.name,
        email: currentUserData.email,
        role: currentUserData.role,
        avatar: currentUserData.avatar || `https://ui-avatars.com/api/?name=${currentUserData.name}`,
        // Keep existing password if not changed, or set new one
        password: newUserPassword ? newUserPassword : (currentUserData.password || '123456')
    };

    saveUser(newUser);
    setIsUserModalOpen(false);
    refreshData();
  };

  const handleDeleteUser = (id: string) => {
      if(window.confirm("Supprimer cet utilisateur ?")) {
          deleteUser(id);
          refreshData();
      }
  };

  // --- Category Logic ---
  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    const newCat: Category = {
        id: 'c' + Date.now(),
        name: newCategoryName.trim(),
        slug: newCategoryName.trim()
    };
    saveCategory(newCat);
    setNewCategoryName('');
    refreshData();
  };

  const initiateDeleteCategory = (category: Category) => {
      const count = articles.filter(a => a.category === category.name).length;
      if (count > 0) {
          setCategoryDeleteData({ category, articleCount: count });
          const firstAvailable = categoriesList.find(c => c.id !== category.id);
          if (firstAvailable) setTargetCategoryForMove(firstAvailable.name);
      } else {
          if (window.confirm(`Supprimer la catégorie "${category.name}" ?`)) {
              deleteCategory(category.id);
              refreshData();
          }
      }
  };

  const confirmCategoryDeleteWithMove = () => {
      if (!categoryDeleteData || !targetCategoryForMove) return;
      bulkUpdateArticleCategory(categoryDeleteData.category.name, targetCategoryForMove);
      deleteCategory(categoryDeleteData.category.id);
      setCategoryDeleteData(null);
      refreshData();
  };

  const startEditingCategory = (category: Category) => {
      setEditingCategory({ id: category.id, name: category.name });
  };

  const saveEditingCategory = () => {
      if (!editingCategory || !editingCategory.name.trim()) return;
      updateCategory(editingCategory.id, editingCategory.name.trim());
      setEditingCategory(null);
      refreshData();
  };

  // --- AD MANAGEMENT LOGIC ---
  const handleOpenAdModal = (ad?: Ad) => {
      if (ad && ad.id) {
          setCurrentAd({...ad});
      } else {
          setCurrentAd({
              title: '',
              location: AdLocation.HEADER_LEADERBOARD,
              type: AdType.IMAGE,
              content: '',
              linkUrl: '',
              active: true
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

  const handleSaveAd = () => {
      if (!currentAd.title || !currentAd.content || !currentAd.location || !currentAd.type) {
          alert("Veuillez remplir tous les champs obligatoires (Titre, Emplacement, Type, Contenu)");
          return;
      }

      const newAd: Ad = {
          id: currentAd.id || 'ad' + Date.now(),
          title: currentAd.title,
          location: currentAd.location,
          type: currentAd.type,
          content: currentAd.content,
          linkUrl: currentAd.linkUrl || '',
          active: currentAd.active !== undefined ? currentAd.active : true
      };

      saveAd(newAd);
      setIsAdModalOpen(false);
      refreshData();
  };

  const handleDeleteAd = (id: string) => {
      if(window.confirm("Supprimer cette publicité ?")) {
          deleteAd(id);
          refreshData();
      }
  };


  if (!user) return null;

  return (
    <>
      <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row relative z-0">
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-64 bg-brand-dark text-white flex flex-col md:fixed md:h-full z-10 overflow-y-auto shadow-xl">
          <div className="p-6 border-b border-gray-700 flex flex-col items-center text-center">
              <img src="https://placehold.co/150x150/0055a4/ffffff?text=WCI" alt="Logo" className="w-20 h-20 rounded-full mb-3 border-2 border-brand-yellow" />
              <h1 className="font-serif text-lg font-bold leading-none">World Canal</h1>
              <span className="text-brand-red font-bold uppercase tracking-wider text-xs">Admin CMS</span>
          </div>
          
          <nav className="flex-1 p-4 space-y-2 text-sm">
              <button 
                  onClick={() => setActiveTab('articles')}
                  className={`w-full text-left px-4 py-3 rounded transition-colors ${activeTab === 'articles' ? 'bg-brand-blue text-white font-bold' : 'text-gray-300 hover:bg-gray-800'}`}
              >
                  📄 Tous les Articles
              </button>
              {PERMISSIONS.canManageCategories(user.role) && (
                  <button 
                      onClick={() => setActiveTab('categories')}
                      className={`w-full text-left px-4 py-3 rounded transition-colors ${activeTab === 'categories' ? 'bg-brand-blue text-white font-bold' : 'text-gray-300 hover:bg-gray-800'}`}
                  >
                      🏷️ Gestion Catégories
                  </button>
              )}
              {PERMISSIONS.canManageAds(user.role) && (
                  <button 
                      onClick={() => setActiveTab('ads')}
                      className={`w-full text-left px-4 py-3 rounded transition-colors ${activeTab === 'ads' ? 'bg-brand-blue text-white font-bold' : 'text-gray-300 hover:bg-gray-800'}`}
                  >
                      📢 Gestion Publicités
                  </button>
              )}
              {PERMISSIONS.canManageUsers(user.role) && (
                  <button 
                      onClick={() => setActiveTab('users')}
                      className={`w-full text-left px-4 py-3 rounded transition-colors ${activeTab === 'users' ? 'bg-brand-blue text-white font-bold' : 'text-gray-300 hover:bg-gray-800'}`}
                  >
                      👥 Gestion Utilisateurs
                  </button>
              )}
              <button 
                  onClick={() => setActiveTab('profile')}
                  className={`w-full text-left px-4 py-3 rounded transition-colors ${activeTab === 'profile' ? 'bg-brand-blue text-white font-bold' : 'text-gray-300 hover:bg-gray-800'}`}
              >
                  👤 Mon Profil
              </button>
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
                      <button 
                        type="button"
                        onClick={handleCreateNew} 
                        className="bg-brand-blue text-white px-6 py-3 rounded-full hover:bg-blue-700 shadow-lg font-bold text-sm flex items-center gap-2 transform hover:-translate-y-1 transition-all"
                      >
                          <span>✏️</span> Rédiger un Article
                      </button>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100">
                      <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                          <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold tracking-wider">
                              <tr>
                                  <th className="p-4">Titre</th>
                                  <th className="p-4">Auteur</th>
                                  <th className="p-4">Catégorie</th>
                                  <th className="p-4">Statut</th>
                                  <th className="p-4 text-right">Actions</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-sm">
                              {articles.map(article => (
                                  <tr key={article.id} className="hover:bg-blue-50 transition-colors">
                                      <td className="p-4 font-bold text-gray-800 max-w-xs truncate">{article.title}</td>
                                      <td className="p-4 text-gray-600 flex items-center gap-2">
                                          {article.authorAvatar && <img src={article.authorAvatar} className="w-6 h-6 rounded-full"/>}
                                          {article.authorName}
                                      </td>
                                      <td className="p-4">
                                          <span className="inline-block bg-brand-blue text-white px-2 py-1 rounded text-xs font-bold shadow-sm">{article.category}</span>
                                      </td>
                                      <td className="p-4">
                                          <span className={`px-3 py-1 rounded-full text-xs font-bold border 
                                              ${article.status === ArticleStatus.PUBLISHED ? 'bg-green-50 text-green-700 border-green-200' : 
                                                article.status === ArticleStatus.SUBMITTED ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                              {article.status === ArticleStatus.SUBMITTED ? 'En attente' : article.status}
                                          </span>
                                      </td>
                                      <td className="p-4 text-right space-x-2">
                                          {(user.role === UserRole.ADMIN || article.authorId === user.id) && (
                                              <button onClick={() => handleEdit(article)} className="text-blue-600 hover:text-blue-800 font-medium">Éditer</button>
                                          )}
                                          {PERMISSIONS.canPublish(user.role) && article.status === ArticleStatus.SUBMITTED && (
                                              <button onClick={() => handleStatusChange(article, ArticleStatus.PUBLISHED)} className="text-green-600 font-bold hover:underline">Valider</button>
                                          )}
                                          {PERMISSIONS.canPublish(user.role) && article.status === ArticleStatus.PUBLISHED && (
                                              <button onClick={() => handleStatusChange(article, ArticleStatus.DRAFT)} className="text-orange-600 hover:underline">Dépublier</button>
                                          )}
                                          {PERMISSIONS.canPublish(user.role) && article.status === ArticleStatus.DRAFT && (
                                              <button onClick={() => handleStatusChange(article, ArticleStatus.PUBLISHED)} className="text-green-600 hover:underline">Publier</button>
                                          )}
                                          {PERMISSIONS.canDeleteArticle(user.role) && (
                                              <button onClick={() => handleDelete(article.id)} className="text-red-600 hover:text-red-800 ml-2">Supprimer</button>
                                          )}
                                      </td>
                                  </tr>
                              ))}
                              {articles.length === 0 && (
                                  <tr>
                                      <td colSpan={5} className="p-8 text-center text-gray-400 italic">Aucun article trouvé.</td>
                                  </tr>
                              )}
                          </tbody>
                      </table>
                      </div>
                  </div>
              </div>
          )}

          {/* ADS, CATEGORIES, USERS, PROFILE TABS OMITTED FOR BREVITY AS NO CHANGES REQUESTED THERE */}
          {/* ... keeping previous implementations for ads, categories, users, profile ... */}
          {activeTab === 'ads' && PERMISSIONS.canManageAds(user.role) && (
              <div>
                  <div className="flex justify-between items-center mb-6">
                      <div>
                          <h2 className="text-3xl font-serif font-bold text-gray-800">Gestion Publicités</h2>
                          <p className="text-gray-500 text-sm">Ajoutez des bannières, vidéos ou codes scripts.</p>
                      </div>
                      <button type="button" onClick={() => handleOpenAdModal()} className="bg-brand-blue text-white px-6 py-3 rounded-full hover:bg-blue-700 shadow-lg font-bold text-sm">+ Nouvelle Publicité</button>
                  </div>
                  <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100">
                      <table className="w-full text-left border-collapse">
                          <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold tracking-wider">
                              <tr>
                                  <th className="p-4">Titre</th>
                                  <th className="p-4">Emplacement</th>
                                  <th className="p-4">Type</th>
                                  <th className="p-4">Aperçu Contenu</th>
                                  <th className="p-4">Statut</th>
                                  <th className="p-4 text-right">Actions</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-sm">
                              {adsList.map(ad => (
                                  <tr key={ad.id} className="hover:bg-gray-50">
                                      <td className="p-4 font-bold text-gray-800">{ad.title}</td>
                                      <td className="p-4 text-xs"><span className="bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200">{ad.location}</span></td>
                                      <td className="p-4 text-gray-600">{ad.type}</td>
                                      <td className="p-4 text-xs text-gray-400 truncate max-w-[150px]">{ad.content.substring(0, 30)}...</td>
                                      <td className="p-4">{ad.active ? <span className="text-green-600 font-bold text-xs bg-green-50 px-2 py-1 rounded">Actif</span> : <span className="text-gray-500 font-bold text-xs bg-gray-100 px-2 py-1 rounded">Inactif</span>}</td>
                                      <td className="p-4 text-right space-x-2"><button onClick={() => handleOpenAdModal(ad)} className="text-blue-600 hover:text-blue-800 font-medium">Modifier</button><button onClick={() => handleDeleteAd(ad.id)} className="text-red-600 hover:text-red-800 font-medium">Supprimer</button></td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          )}

          {activeTab === 'categories' && PERMISSIONS.canManageCategories(user.role) && (
              <div>
                  <h2 className="text-3xl font-serif font-bold text-gray-800 mb-2">Gestion des Catégories</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      <div className="bg-white p-6 rounded-lg shadow-md h-fit">
                          <h3 className="font-bold text-lg mb-4">Nouvelle Catégorie</h3>
                          <div className="flex flex-col gap-3">
                              <input type="text" placeholder="Nom de la catégorie..." className="border border-gray-300 bg-white text-gray-900 p-3 rounded focus:border-brand-blue outline-none" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()} />
                              <button onClick={handleAddCategory} className="bg-brand-blue text-white py-2 rounded font-bold hover:bg-blue-700">Ajouter</button>
                          </div>
                      </div>
                      <div className="lg:col-span-2 bg-white rounded-lg shadow-md overflow-hidden">
                          <table className="w-full text-left">
                              <thead className="bg-gray-50 border-b"><tr><th className="p-4">Nom</th><th className="p-4">Slug</th><th className="p-4 text-right">Actions</th></tr></thead>
                              <tbody className="divide-y divide-gray-100">
                                  {categoriesList.map(cat => (
                                      <tr key={cat.id} className="hover:bg-gray-50">
                                          <td className="p-4 font-bold text-gray-800">{editingCategory && editingCategory.id === cat.id ? <input type="text" autoFocus className="border border-brand-blue p-1 rounded text-gray-900" value={editingCategory.name} onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && saveEditingCategory()} /> : cat.name}</td>
                                          <td className="p-4 text-gray-500 text-sm">{cat.slug}</td>
                                          <td className="p-4 text-right space-x-3">{editingCategory && editingCategory.id === cat.id ? <><button onClick={saveEditingCategory} className="text-green-600 font-bold hover:underline text-sm">Enregistrer</button><button onClick={() => setEditingCategory(null)} className="text-gray-500 hover:underline text-sm">Annuler</button></> : <><button onClick={() => startEditingCategory(cat)} className="text-blue-600 hover:text-blue-800 text-sm font-bold">Modifier</button><button onClick={() => initiateDeleteCategory(cat)} className="text-red-600 hover:text-red-800 text-sm font-bold">Supprimer</button></>}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              </div>
          )}

          {activeTab === 'users' && PERMISSIONS.canManageUsers(user.role) && (
              <div>
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-gray-800">Gestion des Utilisateurs</h2>
                      <button type="button" onClick={() => handleOpenUserModal()} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-bold text-sm">+ Créer Utilisateur</button>
                  </div>
                  <div className="bg-white rounded shadow p-0">
                      <table className="w-full text-left">
                          <thead className="bg-gray-50 border-b"><tr><th className="p-4 text-xs font-bold text-gray-500 uppercase">Utilisateur</th><th className="p-4 text-xs font-bold text-gray-500 uppercase">Rôle / Permissions</th><th className="p-4 text-xs font-bold text-gray-500 uppercase">Actions</th></tr></thead>
                          <tbody className="divide-y divide-gray-100">
                              {usersList.map(u => (
                                  <tr key={u.id}>
                                      <td className="p-4 flex items-center gap-3"><img src={u.avatar} className="w-8 h-8 rounded-full border border-gray-200" /><div><div className="font-bold text-gray-900">{u.name}</div><div className="text-xs text-gray-500">{u.email}</div></div></td>
                                      <td className="p-4"><span className={`inline-block px-2 py-1 rounded text-xs font-bold ${u.role === UserRole.ADMIN ? 'bg-red-100 text-red-700' : u.role === UserRole.EDITOR ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>{u.role}</span></td>
                                      <td className="p-4 space-x-2"><button onClick={() => handleOpenUserModal(u)} className="text-blue-600 text-sm hover:underline font-medium">Modifier</button>{u.id !== user.id && <button onClick={() => handleDeleteUser(u.id)} className="text-red-600 text-sm hover:underline font-medium">Supprimer</button>}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          )}

          {activeTab === 'profile' && (
              <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">Mon Profil</h2>
                  <div className="bg-white rounded shadow p-6 max-w-lg">
                      <div className="flex items-center gap-4 mb-6"><img src={user.avatar} className="w-16 h-16 rounded-full border-2 border-brand-blue" /><div><h3 className="text-xl font-bold">{user.name}</h3><p className="text-gray-500">{user.email}</p><span className="inline-block bg-brand-blue text-white text-xs px-2 py-1 rounded mt-1">{user.role}</span></div></div>
                      <div className="space-y-4"><div><label className="block text-sm font-bold text-gray-700">Nom complet</label><input type="text" value={user.name} disabled className="w-full border p-2 rounded bg-gray-50 text-gray-500" /></div><div><label className="block text-sm font-bold text-gray-700">Email</label><input type="email" value={user.email} disabled className="w-full border p-2 rounded bg-gray-50 text-gray-500" /></div><div className="bg-yellow-50 border-l-4 border-yellow-400 p-4"><p className="text-sm text-yellow-700">Pour modifier votre profil, veuillez contacter un Administrateur.</p></div></div>
                  </div>
              </div>
          )}
        </main>
      </div>

      {/* MODALS SECTION - USING INLINE Z-INDEX TO FORCE VISIBILITY */}
      
      {/* Article Modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex flex-col overflow-hidden" style={{ zIndex: 9999 }}>
            {/* Modal Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <button onClick={() => setIsEditorOpen(false)} className="text-gray-500 hover:text-gray-800 text-xl font-bold">✕</button>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">{currentArticle.id ? 'Éditer l\'article' : 'Nouvelle Rédaction'}</h3>
                        <p className="text-xs text-gray-500">
                             Statut actuel: <span className="font-bold">{currentArticle.status || ArticleStatus.DRAFT}</span>
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                     <button onClick={() => setIsEditorOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-medium">Fermer</button>
                     <button onClick={() => { setCurrentArticle({...currentArticle, status: ArticleStatus.DRAFT}); handleSaveArticle(); }} 
                             className="px-6 py-2 border border-gray-300 rounded text-gray-700 font-bold hover:bg-gray-50">
                        Enregistrer Brouillon
                     </button>
                     {user.role === UserRole.CONTRIBUTOR ? (
                         <button onClick={() => { setCurrentArticle({...currentArticle, status: ArticleStatus.SUBMITTED}); handleSaveArticle(); }} 
                            className="px-6 py-2 bg-brand-yellow text-brand-dark rounded font-bold hover:bg-yellow-400 shadow-sm">
                            Soumettre à relecture
                         </button>
                     ) : (
                         <button onClick={() => { setCurrentArticle({...currentArticle, status: ArticleStatus.PUBLISHED}); handleSaveArticle(); }} 
                            className="px-6 py-2 bg-brand-blue text-white rounded font-bold hover:bg-blue-600 shadow-sm">
                            Publier
                         </button>
                     )}
                </div>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto bg-gray-100 p-4 md:p-8 flex justify-center editor-scroll">
                <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-3 gap-6 h-fit">
                    
                    {/* Left Column: Editor */}
                    <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-8 min-h-[500px] border border-gray-200 flex flex-col">
                        <input 
                            type="text" 
                            placeholder="Saisissez votre titre ici..." 
                            className="w-full text-4xl font-serif font-bold text-gray-900 placeholder-gray-400 border-none outline-none mb-6 bg-white"
                            value={currentArticle.title} 
                            onChange={(e) => setCurrentArticle({...currentArticle, title: e.target.value})} 
                        />
                        <textarea 
                            placeholder="Introduction (Chapeau)..." 
                            className="w-full text-lg text-gray-700 italic border-l-4 border-gray-300 outline-none resize-none mb-6 h-24 bg-gray-50 p-4 rounded focus:border-brand-blue"
                            value={currentArticle.excerpt} 
                            onChange={(e) => setCurrentArticle({...currentArticle, excerpt: e.target.value})} 
                        ></textarea>
                        
                        {/* MODERN RICH TEXT EDITOR */}
                        <div className="flex-1 flex flex-col border border-gray-300 rounded overflow-hidden">
                            {/* Toolbar */}
                            <div className="bg-gray-50 border-b border-gray-300 p-2 select-none">
                                <div className="flex gap-2 flex-wrap mb-2">
                                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => execCmd('bold')} className="p-2 hover:bg-gray-200 rounded font-bold text-gray-700 bg-white border border-gray-200" title="Gras">B</button>
                                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => execCmd('italic')} className="p-2 hover:bg-gray-200 rounded italic text-gray-700 bg-white border border-gray-200" title="Italique">I</button>
                                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => execCmd('underline')} className="p-2 hover:bg-gray-200 rounded underline text-gray-700 bg-white border border-gray-200" title="Souligné">U</button>
                                    <div className="w-px bg-gray-300 mx-1"></div>
                                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => initTool('link')} className={`p-2 rounded text-gray-700 text-sm border ${activeTool === 'link' ? 'bg-brand-blue text-white border-brand-blue' : 'bg-white hover:bg-gray-100 border-gray-200'}`} title="Lien">🔗 Lien</button>
                                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => initTool('image')} className={`p-2 rounded text-gray-700 text-sm border ${activeTool === 'image' ? 'bg-brand-blue text-white border-brand-blue' : 'bg-white hover:bg-gray-100 border-gray-200'}`} title="Image">🖼️ Image</button>
                                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => initTool('video')} className={`p-2 rounded text-gray-700 text-sm border ${activeTool === 'video' ? 'bg-brand-blue text-white border-brand-blue' : 'bg-white hover:bg-gray-100 border-gray-200'}`} title="Vidéo">🎥 Vidéo</button>
                                </div>
                                
                                {/* Inline Tool Input Area */}
                                {activeTool && (
                                    <div className="flex flex-col gap-2 bg-gray-100 p-2 rounded border border-gray-300 animate-fade-in">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-gray-600 uppercase min-w-[80px]">
                                                {activeTool === 'link' ? 'URL :' : activeTool === 'image' ? 'URL Image :' : 'URL Vidéo :'}
                                            </span>
                                            <input 
                                                type="text" 
                                                autoFocus
                                                className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:border-brand-blue outline-none"
                                                placeholder={activeTool === 'video' ? 'https://youtube.com/watch?v=...' : 'https://...'}
                                                value={toolInputValue}
                                                onChange={(e) => setToolInputValue(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && applyTool()}
                                            />
                                        </div>
                                        {/* Link Text Input - Only for Link Tool */}
                                        {activeTool === 'link' && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-gray-600 uppercase min-w-[80px]">Nom lien :</span>
                                                <input 
                                                    type="text" 
                                                    className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:border-brand-blue outline-none"
                                                    placeholder="Texte à afficher (Ex: Cliquez ici)"
                                                    value={toolInputText}
                                                    onChange={(e) => setToolInputText(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && applyTool()}
                                                />
                                            </div>
                                        )}
                                        <div className="flex justify-end gap-2 mt-1">
                                            <button onClick={cancelTool} className="bg-gray-300 text-gray-700 px-3 py-1 rounded text-xs font-bold hover:bg-gray-400">Annuler</button>
                                            <button onClick={applyTool} className="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-green-700">Valider</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            {/* Editable Content Area */}
                            <div 
                                ref={editorRef}
                                contentEditable
                                suppressContentEditableWarning={true}
                                className="flex-1 p-4 bg-white outline-none overflow-y-auto prose max-w-none text-gray-900 cursor-text"
                                style={{ minHeight: '300px' }}
                                onInput={handleEditorInput}
                                onKeyUp={saveSelectionState}
                                onMouseUp={saveSelectionState}
                            >
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Settings */}
                    <div className="space-y-6">
                        
                        {/* Publishing Info */}
                        <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
                            <h4 className="font-bold text-gray-800 mb-4 border-b pb-2">Paramètres de publication</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Catégorie</label>
                                    <select className="w-full border border-gray-300 p-2 rounded bg-white text-gray-900 focus:border-brand-blue outline-none"
                                        value={currentArticle.category} 
                                        onChange={(e) => setCurrentArticle({...currentArticle, category: e.target.value})} 
                                    >
                                        {availableCategories.map(cat => (
                                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Auteur</label>
                                    <input type="text" disabled value={currentArticle.authorName || user.name} className="w-full border border-gray-200 bg-gray-100 p-2 rounded text-gray-500" />
                                </div>
                            </div>
                        </div>

                        {/* Media Manager */}
                        <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
                            <h4 className="font-bold text-gray-800 mb-4 border-b pb-2">Média à la Une</h4>
                            
                            <div className="flex bg-gray-100 p-1 rounded mb-4">
                                <button onClick={() => setMediaTab('image')} className={`flex-1 py-1 text-sm font-bold rounded ${mediaTab === 'image' ? 'bg-white shadow text-brand-blue' : 'text-gray-500'}`}>Image</button>
                                <button onClick={() => setMediaTab('video')} className={`flex-1 py-1 text-sm font-bold rounded ${mediaTab === 'video' ? 'bg-white shadow text-brand-blue' : 'text-gray-500'}`}>Vidéo</button>
                            </div>

                            {mediaTab === 'image' && (
                                <div className="space-y-3">
                                    <div className="flex gap-4 text-xs">
                                        <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="imgType" checked={uploadType === 'url'} onChange={() => setUploadType('url')} /> URL Web</label>
                                        <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="imgType" checked={uploadType === 'file'} onChange={() => setUploadType('file')} /> Upload Local</label>
                                    </div>
                                    
                                    {uploadType === 'url' ? (
                                        <input type="text" placeholder="https://exemple.com/image.jpg" className="w-full border border-gray-300 bg-white text-gray-900 p-2 rounded text-sm focus:border-brand-blue outline-none" 
                                            value={currentArticle.imageUrl} onChange={(e) => setCurrentArticle({...currentArticle, imageUrl: e.target.value})} />
                                    ) : (
                                        <div className="border-2 border-dashed border-gray-300 p-4 rounded text-center cursor-pointer hover:bg-gray-50 transition-colors relative bg-gray-50">
                                            <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" 
                                                onChange={(e) => handleFileUpload(e, 'imageUrl')} />
                                            <span className="text-xs text-gray-500">Cliquez pour upload</span>
                                        </div>
                                    )}

                                    {currentArticle.imageUrl && (
                                        <div className="relative group mt-2">
                                            <img src={currentArticle.imageUrl} alt="Preview" className="w-full h-32 object-cover rounded border border-gray-200" />
                                            <div className="absolute inset-0 bg-black bg-opacity-20 hidden group-hover:flex items-center justify-center text-white text-xs">Aperçu</div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {mediaTab === 'video' && (
                                <div className="space-y-3">
                                     <div className="flex gap-4 text-xs">
                                        <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="vidType" checked={uploadType === 'url'} onChange={() => setUploadType('url')} /> Youtube / URL</label>
                                        <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="vidType" checked={uploadType === 'file'} onChange={() => setUploadType('file')} /> Upload Local</label>
                                    </div>

                                    {uploadType === 'url' ? (
                                        <input type="text" placeholder="https://youtube.com/watch?v=..." className="w-full border border-gray-300 bg-white text-gray-900 p-2 rounded text-sm focus:border-brand-blue outline-none" 
                                            value={currentArticle.videoUrl} onChange={(e) => setCurrentArticle({...currentArticle, videoUrl: e.target.value})} />
                                    ) : (
                                         <div className="border-2 border-dashed border-gray-300 p-4 rounded text-center cursor-pointer hover:bg-gray-50 transition-colors relative bg-gray-50">
                                            <input type="file" accept="video/*" className="absolute inset-0 opacity-0 cursor-pointer" 
                                                onChange={(e) => handleFileUpload(e, 'videoUrl')} />
                                            <span className="text-xs text-gray-500">Cliquez pour upload vidéo</span>
                                        </div>
                                    )}
                                    {currentArticle.videoUrl && <div className="p-2 bg-green-50 text-green-700 text-xs rounded border border-green-200">Vidéo configurée !</div>}
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
      )}

      {/* User Management Modal, Category Modal, Ad Modal omitted for brevity (unchanged) */}
      {/* ... keeping previous modal implementations for user/ads/category-delete ... */}
      
      {/* User Management Modal */}
      {isUserModalOpen && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-lg">
                    <h3 className="text-lg font-bold text-gray-800">{currentUserData.id ? 'Modifier Utilisateur' : 'Créer Utilisateur'}</h3>
                    <button onClick={() => setIsUserModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                </div>
                
                <div className="p-6 space-y-6">
                    <div className="flex flex-col items-center gap-3"><div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden border-2 border-brand-blue relative group"><img src={currentUserData.avatar} alt="Avatar" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black bg-opacity-40 hidden group-hover:flex items-center justify-center text-white text-xs">Modifier</div></div><div className="flex gap-2 text-xs"><label className="cursor-pointer text-blue-600 font-bold hover:underline"><input type="file" accept="image/*" className="hidden" onChange={handleUserAvatarUpload} />Uploader Photo</label><span className="text-gray-300">|</span><button onClick={() => setCurrentUserData({...currentUserData, avatar: `https://ui-avatars.com/api/?name=${currentUserData.name || 'User'}&background=random`})} className="text-gray-500 hover:text-gray-800">Générer Auto</button></div></div>
                    <div className="space-y-4">
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nom Complet</label><input type="text" className="w-full border border-gray-300 bg-white text-gray-900 p-3 rounded focus:ring-2 focus:ring-brand-blue outline-none" placeholder="Ex: Jean Dupont" value={currentUserData.name || ''} onChange={(e) => setCurrentUserData({...currentUserData, name: e.target.value})} /></div>
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label><input type="email" className="w-full border border-gray-300 bg-white text-gray-900 p-3 rounded focus:ring-2 focus:ring-brand-blue outline-none" placeholder="Ex: jean@worldcanalinfo.com" value={currentUserData.email || ''} onChange={(e) => setCurrentUserData({...currentUserData, email: e.target.value})} /></div>
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">{currentUserData.id ? 'Modifier Mot de passe (Laisser vide pour ne pas changer)' : 'Mot de passe'}</label><input type="text" className="w-full border border-gray-300 bg-white text-gray-900 p-3 rounded focus:ring-2 focus:ring-brand-blue outline-none" placeholder="******" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} /><p className="text-xs text-gray-500 mt-1">Seul l'administrateur peut définir le mot de passe.</p></div>
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rôle et Permissions</label><select className="w-full border border-gray-300 bg-white text-gray-900 p-3 rounded focus:ring-2 focus:ring-brand-blue outline-none cursor-pointer" value={currentUserData.role || UserRole.CONTRIBUTOR} onChange={(e) => setCurrentUserData({...currentUserData, role: e.target.value as UserRole})}><option value={UserRole.CONTRIBUTOR} className="text-gray-900">Contributeur</option><option value={UserRole.EDITOR} className="text-gray-900">Éditeur</option><option value={UserRole.ADMIN} className="text-gray-900 font-bold">Administrateur</option></select></div>
                    </div>
                    <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-4"><button onClick={() => setIsUserModalOpen(false)} className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded font-medium">Annuler</button><button onClick={handleSaveUser} className="px-6 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700 shadow-sm">Enregistrer</button></div>
                </div>
            </div>
          </div>
      )}

      {/* AD MANAGEMENT MODAL */}
      {isAdModalOpen && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-lg">
                    <h3 className="text-lg font-bold text-gray-800">{currentAd.id ? 'Modifier Publicité' : 'Créer Publicité'}</h3>
                    <button onClick={() => setIsAdModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                </div>
                <div className="p-6 overflow-y-auto max-h-[80vh]">
                     <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nom de la pub</label><input type="text" className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-brand-blue outline-none" placeholder="Ex: Bannière Coca-Cola" value={currentAd.title || ''} onChange={(e) => setCurrentAd({...currentAd, title: e.target.value})} /></div><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Emplacement</label><select className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-brand-blue outline-none" value={currentAd.location || AdLocation.HEADER_LEADERBOARD} onChange={(e) => setCurrentAd({...currentAd, location: e.target.value as AdLocation})}><option value={AdLocation.HEADER_LEADERBOARD}>Header (728x90)</option><option value={AdLocation.SIDEBAR_SQUARE}>Sidebar Haut (Carré 300x250)</option><option value={AdLocation.SIDEBAR_SKYSCRAPER}>Sidebar Bas (Vertical 300x600)</option></select></div></div>
                         <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Type de contenu</label><div className="flex gap-4"><label className="flex items-center gap-2 cursor-pointer border p-3 rounded hover:bg-gray-50"><input type="radio" name="adType" checked={currentAd.type === AdType.IMAGE} onChange={() => setCurrentAd({...currentAd, type: AdType.IMAGE})} /><span className="text-gray-900 font-bold text-sm">Image</span></label><label className="flex items-center gap-2 cursor-pointer border p-3 rounded hover:bg-gray-50"><input type="radio" name="adType" checked={currentAd.type === AdType.VIDEO} onChange={() => setCurrentAd({...currentAd, type: AdType.VIDEO})} /><span className="text-gray-900 font-bold text-sm">Vidéo</span></label><label className="flex items-center gap-2 cursor-pointer border p-3 rounded hover:bg-gray-50"><input type="radio" name="adType" checked={currentAd.type === AdType.SCRIPT} onChange={() => setCurrentAd({...currentAd, type: AdType.SCRIPT})} /><span className="text-gray-900 font-bold text-sm">Code / Script</span></label></div></div>
                         <div className="bg-gray-50 p-4 rounded border border-gray-200">{currentAd.type === AdType.SCRIPT ? (<div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Code HTML / Script JS</label><textarea className="w-full h-32 p-2 border border-gray-300 rounded font-mono text-xs" placeholder="<script>...</script> ou <iframe...>" value={currentAd.content || ''} onChange={(e) => setCurrentAd({...currentAd, content: e.target.value})}></textarea></div>) : (<div className="space-y-3"><div className="flex gap-4 text-xs font-bold mb-2"><button onClick={() => setUploadType('url')} className={`px-2 py-1 rounded ${uploadType === 'url' ? 'bg-brand-blue text-white' : 'text-gray-500'}`}>Via Lien URL</button><button onClick={() => setUploadType('file')} className={`px-2 py-1 rounded ${uploadType === 'file' ? 'bg-brand-blue text-white' : 'text-gray-500'}`}>Via Fichier Local</button></div>{uploadType === 'url' ? (<input type="text" className="w-full border p-2 rounded" placeholder="https://..." value={currentAd.content || ''} onChange={(e) => setCurrentAd({...currentAd, content: e.target.value})} />) : (<input type="file" accept={currentAd.type === AdType.IMAGE ? "image/*" : "video/*"} onChange={handleAdContentUpload} className="w-full border p-2 rounded bg-white" />)}<div className="mt-3 pt-3 border-t border-gray-200"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Lien de destination (Au clic)</label><input type="text" className="w-full border p-2 rounded" placeholder="https://site-client.com" value={currentAd.linkUrl || ''} onChange={(e) => setCurrentAd({...currentAd, linkUrl: e.target.value})} /></div></div>)}</div>
                         <div className="flex items-center gap-2"><input type="checkbox" id="adActive" className="w-5 h-5" checked={currentAd.active} onChange={(e) => setCurrentAd({...currentAd, active: e.target.checked})} /><label htmlFor="adActive" className="font-bold text-gray-700 select-none">Publicité Active</label></div>
                     </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 rounded-b-lg"><button onClick={() => setIsAdModalOpen(false)} className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded font-medium">Annuler</button><button onClick={handleSaveAd} className="px-6 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 shadow-sm">Enregistrer Publicité</button></div>
            </div>
          </div>
      )}

      {/* CATEGORY REASSIGNMENT MODAL */}
      {categoryDeleteData && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center p-4" style={{ zIndex: 99999 }}>
              <div className="bg-white rounded-lg shadow-xl w-full max-w-md border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-2">Attention !</h3>
                  <p className="text-gray-600 mb-4">La catégorie <span className="font-bold text-brand-blue">"{categoryDeleteData.category.name}"</span> contient {categoryDeleteData.articleCount} article(s).<br/>Veuillez choisir une nouvelle catégorie pour déplacer ces articles avant de supprimer.</p>
                  <div className="mb-6"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Déplacer les articles vers :</label><select className="w-full border border-gray-300 p-3 rounded bg-white text-gray-900 focus:border-brand-blue outline-none" value={targetCategoryForMove} onChange={(e) => setTargetCategoryForMove(e.target.value)}>{categoriesList.filter(c => c.id !== categoryDeleteData.category.id).map(c => (<option key={c.id} value={c.name}>{c.name}</option>))}</select></div>
                  <div className="flex justify-end gap-3"><button onClick={() => setCategoryDeleteData(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-medium">Annuler</button><button onClick={confirmCategoryDeleteWithMove} className="px-4 py-2 bg-red-600 text-white rounded font-bold hover:bg-red-700">Déplacer & Supprimer</button></div>
              </div>
          </div>
      )}
    </>
  );
};