import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getArticles, getUsers, saveArticle, deleteArticle, saveUser, deleteUser, getCategories, saveCategory, deleteCategory, getAds, saveAd, deleteAd } from '../services/mockDatabase';
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

  // Forms State
  const [currentArticle, setCurrentArticle] = useState<Partial<Article>>({});
  const [currentUserData, setCurrentUserData] = useState<Partial<User>>({});
  const [currentAd, setCurrentAd] = useState<Partial<Ad>>({});
  const [newCategoryName, setNewCategoryName] = useState('');

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

  const refreshData = () => {
    setArticles(getArticles());
    setUsersList(getUsers());
    const cats = getCategories();
    setCategoriesList(cats);
    setAvailableCategories(cats);
    setAdsList(getAds());
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

    let status = currentArticle.status || ArticleStatus.DRAFT;
    if (user.role === UserRole.CONTRIBUTOR) {
        if (status === ArticleStatus.PUBLISHED) status = ArticleStatus.SUBMITTED;
    }

    const newArticle: Article = {
        id: currentArticle.id || Date.now().toString(),
        title: currentArticle.title!,
        excerpt: currentArticle.excerpt || '',
        content: currentArticle.content || '',
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
    if (userData) {
        setCurrentUserData({...userData});
    } else {
        setCurrentUserData({
            name: '',
            email: '',
            role: UserRole.CONTRIBUTOR,
            avatar: 'https://ui-avatars.com/api/?name=User'
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
    if (!currentUserData.name || !currentUserData.email || !currentUserData.role) return;
    const newUser: User = {
        id: currentUserData.id || 'u' + Date.now(),
        name: currentUserData.name,
        email: currentUserData.email,
        role: currentUserData.role,
        avatar: currentUserData.avatar || `https://ui-avatars.com/api/?name=${currentUserData.name}`
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

  const handleDeleteCategory = (id: string) => {
      if(window.confirm("Supprimer cette catégorie ?")) {
          deleteCategory(id);
          refreshData();
      }
  };

  // --- AD MANAGEMENT LOGIC ---
  const handleOpenAdModal = (ad?: Ad) => {
      if (ad) {
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
          alert("Veuillez remplir tous les champs obligatoires");
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
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-brand-dark text-white flex flex-col md:fixed md:h-full z-10 overflow-y-auto">
        <div className="p-6 border-b border-gray-700 flex flex-col items-center text-center">
            <img src="https://placehold.co/180x180?text=World+Canal\nInfo" alt="Logo" className="w-20 h-20 rounded-full mb-3 border-2 border-brand-yellow" />
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
      <main className="md:ml-64 flex-1 p-4 md:p-8 overflow-y-auto">
        
        {/* ARTICLES TAB */}
        {activeTab === 'articles' && (
            <div>
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <div>
                        <h2 className="text-3xl font-serif font-bold text-gray-800">Articles</h2>
                        <p className="text-gray-500 text-sm">Gérez le contenu éditorial du journal.</p>
                    </div>
                    <button onClick={handleCreateNew} className="bg-brand-blue text-white px-6 py-3 rounded-full hover:bg-blue-700 shadow-lg font-bold text-sm flex items-center gap-2 transform hover:-translate-y-1 transition-all">
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
                                    <td className="p-4"><span className="bg-gray-100 px-2 py-1 rounded text-xs">{article.category}</span></td>
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

        {/* ADS TAB */}
        {activeTab === 'ads' && PERMISSIONS.canManageAds(user.role) && (
            <div>
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-3xl font-serif font-bold text-gray-800">Gestion Publicités</h2>
                        <p className="text-gray-500 text-sm">Ajoutez des bannières, vidéos ou codes scripts.</p>
                    </div>
                    <button onClick={() => handleOpenAdModal()} className="bg-brand-blue text-white px-6 py-3 rounded-full hover:bg-blue-700 shadow-lg font-bold text-sm">
                        + Nouvelle Publicité
                    </button>
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
                                    <td className="p-4 text-xs">
                                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200">{ad.location}</span>
                                    </td>
                                    <td className="p-4 text-gray-600">{ad.type}</td>
                                    <td className="p-4 text-xs text-gray-400 truncate max-w-[150px]">{ad.content.substring(0, 30)}...</td>
                                    <td className="p-4">
                                        {ad.active ? (
                                            <span className="text-green-600 font-bold text-xs bg-green-50 px-2 py-1 rounded">Actif</span>
                                        ) : (
                                            <span className="text-gray-500 font-bold text-xs bg-gray-100 px-2 py-1 rounded">Inactif</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right space-x-2">
                                        <button onClick={() => handleOpenAdModal(ad)} className="text-blue-600 hover:text-blue-800 font-medium">Modifier</button>
                                        <button onClick={() => handleDeleteAd(ad.id)} className="text-red-600 hover:text-red-800 font-medium">Supprimer</button>
                                    </td>
                                </tr>
                            ))}
                            {adsList.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-400 italic">Aucune publicité configurée.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* CATEGORIES TAB (Admin Only) */}
        {activeTab === 'categories' && PERMISSIONS.canManageCategories(user.role) && (
             <div>
                <h2 className="text-3xl font-serif font-bold text-gray-800 mb-2">Gestion des Catégories</h2>
                <p className="text-gray-500 text-sm mb-6">Ajoutez ou supprimez des catégories pour classer les articles.</p>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Add Category Form */}
                    <div className="bg-white p-6 rounded-lg shadow-md h-fit">
                        <h3 className="font-bold text-lg mb-4">Nouvelle Catégorie</h3>
                        <div className="flex flex-col gap-3">
                            <input 
                                type="text" 
                                placeholder="Nom de la catégorie..." 
                                className="border border-gray-300 bg-white text-gray-900 p-3 rounded focus:border-brand-blue outline-none"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                            />
                            <button onClick={handleAddCategory} className="bg-brand-blue text-white py-2 rounded font-bold hover:bg-blue-700">
                                Ajouter
                            </button>
                        </div>
                    </div>

                    {/* List */}
                    <div className="lg:col-span-2 bg-white rounded-lg shadow-md overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="p-4">Nom</th>
                                    <th className="p-4">Slug</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {categoriesList.map(cat => (
                                    <tr key={cat.id} className="hover:bg-gray-50">
                                        <td className="p-4 font-bold">{cat.name}</td>
                                        <td className="p-4 text-gray-500 text-sm">{cat.slug}</td>
                                        <td className="p-4 text-right">
                                            <button onClick={() => handleDeleteCategory(cat.id)} className="text-red-600 hover:text-red-800 text-sm font-bold">Supprimer</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
             </div>
        )}

        {/* USERS TAB (Admin Only) */}
        {activeTab === 'users' && PERMISSIONS.canManageUsers(user.role) && (
            <div>
                 <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Gestion des Utilisateurs</h2>
                    <button onClick={() => handleOpenUserModal()} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-bold text-sm">
                        + Créer Utilisateur
                    </button>
                 </div>
                 
                 <div className="bg-white rounded shadow p-0">
                     <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Utilisateur</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Rôle / Permissions</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {usersList.map(u => (
                                <tr key={u.id}>
                                    <td className="p-4 flex items-center gap-3">
                                        <img src={u.avatar} className="w-8 h-8 rounded-full border border-gray-200" />
                                        <div>
                                            <div className="font-bold text-gray-900">{u.name}</div>
                                            <div className="text-xs text-gray-500">{u.email}</div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`inline-block px-2 py-1 rounded text-xs font-bold 
                                            ${u.role === UserRole.ADMIN ? 'bg-red-100 text-red-700' : 
                                              u.role === UserRole.EDITOR ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="p-4 space-x-2">
                                        <button onClick={() => handleOpenUserModal(u)} className="text-blue-600 text-sm hover:underline font-medium">Modifier</button>
                                        {u.id !== user.id && ( 
                                            <button onClick={() => handleDeleteUser(u.id)} className="text-red-600 text-sm hover:underline font-medium">Supprimer</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                     </table>
                 </div>
            </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
             <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Mon Profil</h2>
                <div className="bg-white rounded shadow p-6 max-w-lg">
                    <div className="flex items-center gap-4 mb-6">
                        <img src={user.avatar} className="w-16 h-16 rounded-full border-2 border-brand-blue" />
                        <div>
                            <h3 className="text-xl font-bold">{user.name}</h3>
                            <p className="text-gray-500">{user.email}</p>
                            <span className="inline-block bg-brand-blue text-white text-xs px-2 py-1 rounded mt-1">{user.role}</span>
                        </div>
                    </div>
                     <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700">Nom complet</label>
                            <input type="text" value={user.name} disabled className="w-full border p-2 rounded bg-gray-50 text-gray-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700">Email</label>
                            <input type="email" value={user.email} disabled className="w-full border p-2 rounded bg-gray-50 text-gray-500" />
                        </div>
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                            <p className="text-sm text-yellow-700">
                                Pour modifier votre profil, veuillez contacter un Administrateur ou utiliser l'onglet Gestion Utilisateurs si vous êtes Admin.
                            </p>
                        </div>
                    </div>
                </div>
           </div>
        )}
      </main>

      {/* Article Modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-80 z-50 flex flex-col overflow-hidden">
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
                    <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-8 min-h-[500px] border border-gray-200">
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
                        <textarea 
                            placeholder="Commencez à écrire votre article..." 
                            className="w-full h-[600px] text-lg leading-relaxed text-gray-900 border-none outline-none resize-none bg-white placeholder-gray-400"
                            value={currentArticle.content} 
                            onChange={(e) => setCurrentArticle({...currentArticle, content: e.target.value})} 
                        ></textarea>
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

      {/* User Management Modal */}
      {isUserModalOpen && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-75 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-lg">
                    <h3 className="text-lg font-bold text-gray-800">{currentUserData.id ? 'Modifier Utilisateur' : 'Créer Utilisateur'}</h3>
                    <button onClick={() => setIsUserModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                </div>
                
                <div className="p-6 space-y-6">
                    {/* Avatar Upload */}
                    <div className="flex flex-col items-center gap-3">
                         <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden border-2 border-brand-blue relative group">
                             <img src={currentUserData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                             <div className="absolute inset-0 bg-black bg-opacity-40 hidden group-hover:flex items-center justify-center text-white text-xs">
                                 Modifier
                             </div>
                         </div>
                         <div className="flex gap-2 text-xs">
                            <label className="cursor-pointer text-blue-600 font-bold hover:underline">
                                <input type="file" accept="image/*" className="hidden" onChange={handleUserAvatarUpload} />
                                Uploader Photo
                            </label>
                            <span className="text-gray-300">|</span>
                             <button onClick={() => setCurrentUserData({...currentUserData, avatar: `https://ui-avatars.com/api/?name=${currentUserData.name || 'User'}&background=random`})} className="text-gray-500 hover:text-gray-800">
                                 Générer Auto
                             </button>
                         </div>
                    </div>

                    {/* Inputs */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nom Complet</label>
                            <input type="text" className="w-full border border-gray-300 bg-white text-gray-900 p-3 rounded focus:ring-2 focus:ring-brand-blue outline-none" 
                                placeholder="Ex: Jean Dupont"
                                value={currentUserData.name} 
                                onChange={(e) => setCurrentUserData({...currentUserData, name: e.target.value})} 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                            <input type="email" className="w-full border border-gray-300 bg-white text-gray-900 p-3 rounded focus:ring-2 focus:ring-brand-blue outline-none" 
                                placeholder="Ex: jean@worldcanalinfo.com"
                                value={currentUserData.email} 
                                onChange={(e) => setCurrentUserData({...currentUserData, email: e.target.value})} 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rôle et Permissions</label>
                            <select className="w-full border border-gray-300 bg-white text-gray-900 p-3 rounded focus:ring-2 focus:ring-brand-blue outline-none cursor-pointer"
                                value={currentUserData.role}
                                onChange={(e) => setCurrentUserData({...currentUserData, role: e.target.value as UserRole})}
                            >
                                <option value={UserRole.CONTRIBUTOR} className="text-gray-900">Contributeur (Peut écrire, doit soumettre)</option>
                                <option value={UserRole.EDITOR} className="text-gray-900">Éditeur (Peut écrire et publier)</option>
                                <option value={UserRole.ADMIN} className="text-gray-900 font-bold">Administrateur (Accès total)</option>
                            </select>
                            <p className="text-xs text-gray-500 mt-2">
                                * Le rôle détermine les accès au dashboard et les droits de publication.
                            </p>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-4">
                        <button onClick={() => setIsUserModalOpen(false)} className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded font-medium">Annuler</button>
                        <button onClick={handleSaveUser} className="px-6 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700 shadow-sm">Enregistrer</button>
                    </div>
                </div>
            </div>
          </div>
      )}

      {/* AD MANAGEMENT MODAL */}
      {isAdModalOpen && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-80 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-lg">
                    <h3 className="text-lg font-bold text-gray-800">{currentAd.id ? 'Modifier Publicité' : 'Créer Publicité'}</h3>
                    <button onClick={() => setIsAdModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[80vh]">
                     <div className="space-y-5">
                        {/* Name and Location */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nom de la pub</label>
                                <input type="text" className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-brand-blue outline-none" 
                                    placeholder="Ex: Bannière Coca-Cola"
                                    value={currentAd.title} onChange={(e) => setCurrentAd({...currentAd, title: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Emplacement</label>
                                <select className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-brand-blue outline-none"
                                    value={currentAd.location} onChange={(e) => setCurrentAd({...currentAd, location: e.target.value as AdLocation})}
                                >
                                    <option value={AdLocation.HEADER_LEADERBOARD}>Header (728x90)</option>
                                    <option value={AdLocation.SIDEBAR_SQUARE}>Sidebar Haut (Carré 300x250)</option>
                                    <option value={AdLocation.SIDEBAR_SKYSCRAPER}>Sidebar Bas (Vertical 300x600)</option>
                                </select>
                            </div>
                        </div>

                        {/* Type Selection */}
                         <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Type de contenu</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer border p-3 rounded hover:bg-gray-50">
                                    <input type="radio" name="adType" checked={currentAd.type === AdType.IMAGE} onChange={() => setCurrentAd({...currentAd, type: AdType.IMAGE})} />
                                    <span>Image</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer border p-3 rounded hover:bg-gray-50">
                                    <input type="radio" name="adType" checked={currentAd.type === AdType.VIDEO} onChange={() => setCurrentAd({...currentAd, type: AdType.VIDEO})} />
                                    <span>Vidéo</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer border p-3 rounded hover:bg-gray-50">
                                    <input type="radio" name="adType" checked={currentAd.type === AdType.SCRIPT} onChange={() => setCurrentAd({...currentAd, type: AdType.SCRIPT})} />
                                    <span>Code / Script</span>
                                </label>
                            </div>
                         </div>

                         {/* Content Source Logic */}
                         <div className="bg-gray-50 p-4 rounded border border-gray-200">
                             {currentAd.type === AdType.SCRIPT ? (
                                 <div>
                                     <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Code HTML / Script JS</label>
                                     <textarea 
                                        className="w-full h-32 p-2 border border-gray-300 rounded font-mono text-xs" 
                                        placeholder="<script>...</script> ou <iframe...>"
                                        value={currentAd.content} onChange={(e) => setCurrentAd({...currentAd, content: e.target.value})}
                                     ></textarea>
                                 </div>
                             ) : (
                                 <div className="space-y-3">
                                     <div className="flex gap-4 text-xs font-bold mb-2">
                                        <button onClick={() => setUploadType('url')} className={`px-2 py-1 rounded ${uploadType === 'url' ? 'bg-brand-blue text-white' : 'text-gray-500'}`}>Via Lien URL</button>
                                        <button onClick={() => setUploadType('file')} className={`px-2 py-1 rounded ${uploadType === 'file' ? 'bg-brand-blue text-white' : 'text-gray-500'}`}>Via Fichier Local</button>
                                     </div>
                                     
                                     {uploadType === 'url' ? (
                                         <input type="text" className="w-full border p-2 rounded" placeholder="https://..." value={currentAd.content} onChange={(e) => setCurrentAd({...currentAd, content: e.target.value})} />
                                     ) : (
                                         <input type="file" accept={currentAd.type === AdType.IMAGE ? "image/*" : "video/*"} onChange={handleAdContentUpload} className="w-full border p-2 rounded bg-white" />
                                     )}

                                     {/* Link URL (Only for Image/Video) */}
                                     <div className="mt-3 pt-3 border-t border-gray-200">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Lien de destination (Au clic)</label>
                                        <input type="text" className="w-full border p-2 rounded" placeholder="https://site-client.com" value={currentAd.linkUrl} onChange={(e) => setCurrentAd({...currentAd, linkUrl: e.target.value})} />
                                     </div>
                                 </div>
                             )}
                         </div>

                         {/* Active Toggle */}
                         <div className="flex items-center gap-2">
                             <input type="checkbox" id="adActive" className="w-5 h-5" checked={currentAd.active} onChange={(e) => setCurrentAd({...currentAd, active: e.target.checked})} />
                             <label htmlFor="adActive" className="font-bold text-gray-700 select-none">Publicité Active</label>
                         </div>
                     </div>
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 rounded-b-lg">
                    <button onClick={() => setIsAdModalOpen(false)} className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded font-medium">Annuler</button>
                    <button onClick={handleSaveAd} className="px-6 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 shadow-sm">Enregistrer Publicité</button>
                </div>
            </div>
          </div>
      )}

    </div>
  );
};