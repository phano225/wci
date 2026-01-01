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
    deleteUser,
    getMessages,
    updateMessageStatus,
    getVideos,
    saveVideo,
    deleteVideo,
    getSocialLinks,
    saveSocialLink,
    deleteSocialLink,
    uploadImage,
    getArticleById
} from '../services/api';
import { generateSEOMeta, generateArticleDraft } from '../services/aiService';
import { Article, ArticleStatus, Category, Ad, AdType, AdLocation, UserRole, User, PERMISSIONS, SubmissionStatus, ContactMessage, Video, SocialLink } from '../types';
import { useNavigate, Link } from 'react-router-dom';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import ImageResize from 'quill-image-resize-module-react';

Quill.register('modules/imageResize', ImageResize);

const formatPermissionName = (key: string) => {
    const map: Record<string, string> = {
        canCreateArticle: "Créer un article",
        canEditOwnArticle: "Modifier ses articles",
        canDeleteArticle: "Supprimer n'importe quel article",
        canPublishArticle: "Publier directement (sans validation)",
        canSubmitForReview: "Soumettre pour validation",
        canReviewSubmissions: "Valider/Refuser les soumissions",
        canManageUsers: "Gérer les utilisateurs (Ajout/Suppr)",
        canCreateEditor: "Créer un compte Éditeur",
        canCreateContributor: "Créer un compte Contributeur",
        canEditOwnProfile: "Modifier son profil",
        canDeleteOwnAccount: "Supprimer son compte",
        canManageCategories: "Gérer les rubriques",
        canManageAds: "Gérer les publicités",
    };
    return map[key] || key;
};

export const AdminDashboard = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'articles' | 'submissions' | 'categories' | 'ads' | 'users' | 'messages' | 'videos' | 'social' | 'settings' | 'permissions'>('articles');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [visitorBaseCount, setVisitorBaseCount] = useState(0);
  
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isSocialModalOpen, setIsSocialModalOpen] = useState(false);
  const [isDeleteCategoryModalOpen, setIsDeleteCategoryModalOpen] = useState(false);
  
  const [currentArticle, setCurrentArticle] = useState<Partial<Article>>({});
  const [currentCategory, setCurrentCategory] = useState<Partial<Category>>({});
  const [targetCategoryForReassign, setTargetCategoryForReassign] = useState<string>('');
  const [currentAd, setCurrentAd] = useState<Partial<Ad>>({});
  const [currentEditUser, setCurrentEditUser] = useState<Partial<User>>({});
  const [currentVideo, setCurrentVideo] = useState<Partial<Video>>({});
  const [currentSocialLink, setCurrentSocialLink] = useState<Partial<SocialLink>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const featuredImageRef = useRef<HTMLInputElement>(null);

  const handleMarkAsRead = async (id: string) => {
    setIsProcessing(true);
    await updateMessageStatus(id, 'READ');
    await loadData();
    setIsProcessing(false);
  };

  const handleArchiveMessage = async (id: string) => {
      if (!confirm('Archiver ce message ?')) return;
      setIsProcessing(true);
      await updateMessageStatus(id, 'ARCHIVED');
      await loadData();
      setIsProcessing(false);
  };

  // --- EDITOR MODULES ---
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
    
    // Safety timeout to prevent infinite spinner
    const timeoutId = setTimeout(() => {
        setIsProcessing(false);
        // Do not alert here to avoid spamming, just stop spinner
        console.warn('Load data timeout - stopping spinner');
    }, 15000);

    try {
        console.log('Chargement des données...');
        
        console.time('getArticles');
        const arts = await getArticles();
        console.timeEnd('getArticles');

        console.time('getCategories');
        const cats = await getCategories();
        console.timeEnd('getCategories');

        console.time('getAds');
        const adsList = await getAds();
        console.timeEnd('getAds');

        // Check for visitor counter config
        const visitorConfig = adsList.find(a => a.id === 'visitor_counter_config');
        if (visitorConfig && visitorConfig.content) {
            try {
                const config = JSON.parse(visitorConfig.content);
                setVisitorBaseCount(config.base_count || 0);
            } catch (e) {
                console.error('Error parsing visitor config', e);
            }
        }

        console.time('getUsers');
        const userList = await getUsers();
        console.timeEnd('getUsers');

        console.time('getMessages');
        const msgList = await getMessages();
        console.timeEnd('getMessages');

        console.time('getVideos');
        const videoList = await getVideos();
        console.timeEnd('getVideos');

        console.time('getSocialLinks');
        const socialList = await getSocialLinks();
        console.timeEnd('getSocialLinks');
        
        clearTimeout(timeoutId); // Clear timeout if successful

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
        setMessages(msgList);
        setVideos(videoList);
        setSocialLinks(socialList);
    } catch (e) {
        clearTimeout(timeoutId);
        console.error('Erreur lors du chargement des données:', e);
        const errorMessage = (e as any)?.message || (e as any)?.error_description || JSON.stringify(e);
        alert(`Erreur de chargement des données: ${errorMessage}`);
    }
    setIsProcessing(false);
  };

  const handleSaveSocialLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSocialLink.platform || !currentSocialLink.url || !currentSocialLink.iconClass) {
        alert('Veuillez remplir tous les champs obligatoires.');
        return;
    }

    setIsProcessing(true);
    try {
        const linkToSave: SocialLink = {
            id: currentSocialLink.id || crypto.randomUUID(),
            platform: currentSocialLink.platform,
            url: currentSocialLink.url,
            iconClass: currentSocialLink.iconClass,
            bgColor: currentSocialLink.bgColor || 'bg-gray-600',
            textColor: currentSocialLink.textColor || 'text-white'
        };
        await saveSocialLink(linkToSave);
        await loadData();
        setIsSocialModalOpen(false);
        setCurrentSocialLink({});
    } catch (error) {
        console.error('Erreur sauvegarde lien social:', error);
        const errorMessage = (error as any)?.message || JSON.stringify(error);
        alert(`Erreur lors de la sauvegarde du lien social: ${errorMessage}`);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDeleteSocialLink = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce lien ?')) return;
    setIsProcessing(true);
    try {
        await deleteSocialLink(id);
        await loadData();
    } catch (error) {
        console.error('Erreur suppression lien social:', error);
        alert('Erreur lors de la suppression du lien social.');
    } finally {
        setIsProcessing(false);
    }
  };

  const handleSaveVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentVideo.title || !currentVideo.youtubeId || !currentVideo.category) {
        alert('Veuillez remplir tous les champs obligatoires.');
        return;
    }

    setIsProcessing(true);
    // Safety timeout
    const timeoutId = setTimeout(() => {
        setIsProcessing(false);
        console.warn('Save video timeout');
        alert('L\'opération prend trop de temps. Vérifiez votre connexion.');
    }, 15000);

    try {
        // Extract YouTube ID from URL if full URL is pasted
        let videoId = currentVideo.youtubeId;
        // Regex to handle various YouTube URL formats (standard, short, embed)
        const urlMatch = videoId.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (urlMatch && urlMatch[1]) {
            videoId = urlMatch[1];
        }

        const videoToSave: Video = {
            id: currentVideo.id || crypto.randomUUID(),
            title: currentVideo.title,
            youtubeId: videoId,
            category: currentVideo.category,
            duration: currentVideo.duration || '',
            createdAt: currentVideo.createdAt || new Date().toISOString()
        };
        
        console.log('Saving video...', videoToSave);
        await saveVideo(videoToSave);
        console.log('Video saved. Reloading list...');
        
        // Optimistic update or partial reload for speed
        const updatedVideos = await getVideos();
        setVideos(updatedVideos);
        console.log('List reloaded.');
        
        clearTimeout(timeoutId);
        setIsVideoModalOpen(false);
        setCurrentVideo({});
    } catch (error) {
        clearTimeout(timeoutId);
        console.error('Erreur sauvegarde vidéo:', error);
        const errorMessage = (error as any)?.message || JSON.stringify(error);
        alert(`Erreur lors de la sauvegarde de la vidéo: ${errorMessage}`);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDeleteVideo = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette vidéo ?')) return;
    setIsProcessing(true);
    try {
        await deleteVideo(id);
        const updatedVideos = await getVideos();
        setVideos(updatedVideos);
    } catch (error) {
        console.error('Erreur suppression vidéo:', error);
        alert('Erreur lors de la suppression de la vidéo.');
    } finally {
        setIsProcessing(false);
    }
  };

  const handleLocalImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        setIsProcessing(true);
        try {
            const imageUrl = await uploadImage(file);
            const imgTag = `<img src="${imageUrl}" class="w-full rounded-2xl shadow-xl my-8 border border-gray-100" />`;
            setCurrentArticle(prev => ({ ...prev, content: (prev.content || '') + imgTag }));
        } catch (error) {
            console.error('Erreur upload image:', error);
            alert('Erreur lors de l\'upload de l\'image.');
        } finally {
            setIsProcessing(false);
        }
    }
    e.target.value = '';
  };

  const handleFeaturedImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        setIsProcessing(true);
        try {
            const imageUrl = await uploadImage(file);
            setCurrentArticle(prev => ({ ...prev, imageUrl: imageUrl }));
        } catch (error) {
            console.error('Erreur upload image mise en avant:', error);
            alert('Erreur lors de l\'upload de l\'image.');
        } finally {
            setIsProcessing(false);
        }
    }
    e.target.value = '';
  };

  const handleSaveArticle = async (targetStatus: ArticleStatus) => {
    if (!currentArticle.title || !user) { alert("Le titre est requis."); return; }
    
    setIsProcessing(true);
    // Safety timeout
    const timeoutId = setTimeout(() => {
        setIsProcessing(false);
        console.warn('Save article timeout');
        alert('L\'opération prend trop de temps. Vérifiez votre connexion.');
    }, 30000); // Articles might take longer (images etc)

    try {
      // Permission check
      if (targetStatus === ArticleStatus.PUBLISHED && !PERMISSIONS.canPublishArticle(user.role)) {
        alert("Vous n'avez pas la permission de publier directement.");
        setIsProcessing(false);
        clearTimeout(timeoutId);
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

      console.log('Saving article...', articleToSave.title);
      await saveArticle(articleToSave);
      console.log('Article saved. Reloading list...');
      
      // OPTIMIZATION: Only reload articles, not everything
      // And we use the lightweight getArticles() which excludes content
      const updatedArticles = await getArticles();
      setArticles(updatedArticles);
      console.log('List reloaded.');
      
      clearTimeout(timeoutId);
      setIsEditorOpen(false);

      if (targetStatus === ArticleStatus.SUBMITTED) {
        alert('Article soumis pour révision.');
      } else if (targetStatus === ArticleStatus.PUBLISHED) {
        alert('Article publié avec succès !');
      } else {
        alert('Brouillon sauvegardé.');
      }

    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Erreur lors de la sauvegarde:', error);
      const errorMessage = (error as any)?.message || JSON.stringify(error);
      alert(`Erreur lors de la sauvegarde: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveCategory = async () => {
    if (!currentCategory.name) return;
    setIsProcessing(true);
    try {
        await saveCategory({
            id: currentCategory.id || Date.now().toString(),
            name: currentCategory.name,
            slug: currentCategory.name.toLowerCase().replace(/\s+/g, '-')
        });
        setIsCategoryModalOpen(false);
        await loadData();
    } catch (error) {
        console.error('Erreur sauvegarde catégorie:', error);
        alert('Erreur lors de la sauvegarde de la rubrique.');
    } finally {
        setIsProcessing(false);
    }
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
  
  const handleAdImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        setIsProcessing(true);
        try {
            const imageUrl = await uploadImage(file);
            setCurrentAd(prev => ({ ...prev, imageUrl: imageUrl, content: imageUrl }));
        } catch (error) {
            console.error('Erreur upload image pub:', error);
            alert('Erreur lors de l\'upload de l\'image.');
        } finally {
            setIsProcessing(false);
        }
    }
  };

  const handleSaveAd = async () => {
      if (!currentAd.title) return;
      setIsProcessing(true);
      try {
        await saveAd({
            id: currentAd.id || Date.now().toString(),
            title: currentAd.title,
            location: currentAd.location || AdLocation.HEADER_LEADERBOARD,
            type: currentAd.type || AdType.IMAGE,
            content: currentAd.content || '',
            imageUrl: currentAd.imageUrl || '',
            linkUrl: currentAd.linkUrl || '',
            active: currentAd.active !== undefined ? currentAd.active : true
        });
        
        // Optimistic update
        const updatedAds = await getAds();
        setAds(updatedAds);
        
        setIsAdModalOpen(false);
      } catch (error) {
        console.error('Erreur sauvegarde pub:', error);
        alert('Erreur lors de la sauvegarde de la publicité.');
      } finally {
        setIsProcessing(false);
      }
  };

  const handleAIFill = async () => {
    if (!currentArticle.title) { alert("Entrez un titre d'abord."); return; }
    setIsProcessing(true);
    try {
        const res = await generateArticleDraft(currentArticle.title, currentArticle.category || 'Information');
        setCurrentArticle(prev => ({ ...prev, content: res }));
    } catch (e) { alert("Erreur IA. Vérifiez votre clé API Grok."); }
    setIsProcessing(false);
  };
  
  const handleAISummary = async () => {
      if (!currentArticle.title && !currentArticle.content) { 
          alert("Titre ou contenu requis pour le résumé."); 
          return; 
      }
      setIsProcessing(true);
      try {
        const summary = await generateSEOMeta(currentArticle.title, currentArticle.content || '');
        setCurrentArticle(prev => ({ ...prev, excerpt: summary }));
      } catch (e) {
          console.error(e);
          alert("Erreur lors de la génération du résumé.");
      } finally {
          setIsProcessing(false);
      }
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

  const handleSaveVisitorSettings = async () => {
    setIsProcessing(true);
    try {
        await saveAd({
            id: 'visitor_counter_config',
            title: 'Visitor Counter Config',
            location: 'SYSTEM_SETTINGS' as AdLocation,
            type: AdType.SCRIPT,
            content: JSON.stringify({ base_count: visitorBaseCount }),
            active: true
        });
        alert('Compteur mis à jour !');
        await loadData();
    } catch (e) {
        console.error(e);
        alert('Erreur lors de la mise à jour');
    } finally {
        setIsProcessing(false);
    }
  };

  const handleEditArticle = async (article: Article) => {
    setIsProcessing(true);
    try {
        const fullArticle = await getArticleById(article.id);
        if (fullArticle) {
            setCurrentArticle(fullArticle);
            setIsEditorOpen(true);
        } else {
             console.error("Impossible de charger l'article complet");
             setCurrentArticle(article);
             setIsEditorOpen(true);
        }
    } catch (error) {
        console.error("Error fetching article details:", error);
        alert("Erreur de chargement de l'article.");
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-brand-dark text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-md">
          <h2 className="text-xl font-serif font-black text-brand-yellow tracking-tighter">WCI Admin</h2>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-4">
              {isMobileMenuOpen ? '✕' : '☰'}
          </button>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`w-72 bg-brand-dark text-white flex flex-col fixed h-full shadow-2xl z-40 overflow-y-auto transition-transform duration-300 ease-in-out md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:static md:h-screen`}>
        <div className="p-10 text-center border-b border-white/5 hidden md:block">
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
            
            {/* Vidéos - Accessible by everyone who can edit articles or specifically configured */}
            <button onClick={() => setActiveTab('videos')} className={`w-full text-left px-5 py-4 rounded-2xl flex items-center gap-4 ${activeTab === 'videos' ? 'bg-brand-blue shadow-lg' : 'opacity-40 hover:opacity-100'}`}>
                🎥 Vidéos
            </button>

            {PERMISSIONS.canManageUsers(user?.role!) && <button onClick={() => setActiveTab('users')} className={`w-full text-left px-5 py-4 rounded-2xl flex items-center gap-4 ${activeTab === 'users' ? 'bg-brand-blue shadow-lg' : 'opacity-40 hover:opacity-100'}`}>👥 Équipe</button>}
            
            {PERMISSIONS.canManageUsers(user?.role!) && <button onClick={() => setActiveTab('messages')} className={`w-full text-left px-5 py-4 rounded-2xl flex items-center gap-4 ${activeTab === 'messages' ? 'bg-brand-blue shadow-lg' : 'opacity-40 hover:opacity-100'}`}>
                📩 Messages
                {messages.filter(m => m.status === 'UNREAD').length > 0 && (
                    <span className="bg-red-500 text-white text-[10px] px-2 rounded-full">{messages.filter(m => m.status === 'UNREAD').length}</span>
                )}
            </button>}

            {PERMISSIONS.canManageUsers(user?.role!) && <button onClick={() => setActiveTab('social')} className={`w-full text-left px-5 py-4 rounded-2xl flex items-center gap-4 ${activeTab === 'social' ? 'bg-brand-blue shadow-lg' : 'opacity-40 hover:opacity-100'}`}>
                🌐 Réseaux Sociaux
            </button>}

            {PERMISSIONS.canManageAds(user?.role!) && <button onClick={() => setActiveTab('settings')} className={`w-full text-left px-5 py-4 rounded-2xl flex items-center gap-4 ${activeTab === 'settings' ? 'bg-brand-blue shadow-lg' : 'opacity-40 hover:opacity-100'}`}>
                ⚙️ Paramètres
            </button>}

            <button onClick={() => setActiveTab('permissions')} className={`w-full text-left px-5 py-4 rounded-2xl flex items-center gap-4 ${activeTab === 'permissions' ? 'bg-brand-blue shadow-lg' : 'opacity-40 hover:opacity-100'}`}>
                🛡️ Permissions
            </button>
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

      <main className="flex-1 p-4 md:p-12 overflow-y-auto w-full">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 md:mb-16 gap-6 md:gap-0">
            <h1 className="text-3xl md:text-5xl font-serif font-black text-brand-dark uppercase tracking-tighter">
                {activeTab === 'articles' ? 'Mes Articles' : activeTab === 'submissions' ? 'Attente de Validation' : activeTab === 'categories' ? 'Rubriques' : activeTab === 'ads' ? 'Régie Pub' : activeTab === 'messages' ? 'Messagerie' : activeTab === 'videos' ? 'Vidéos' : activeTab === 'social' ? 'Réseaux Sociaux' : activeTab === 'permissions' ? 'Permissions' : activeTab === 'settings' ? 'Paramètres' : 'Équipe'}
            </h1>
            <button onClick={() => { 
                if(activeTab === 'articles') { setCurrentArticle({}); setIsEditorOpen(true); } 
                else if(activeTab === 'categories' && PERMISSIONS.canManageCategories(user?.role!)) { setCurrentCategory({}); setIsCategoryModalOpen(true); }
                else if(activeTab === 'ads' && PERMISSIONS.canManageAds(user?.role!)) { setCurrentAd({active: true, location: AdLocation.HEADER_LEADERBOARD, type: AdType.IMAGE}); setIsAdModalOpen(true); }
                else if(activeTab === 'users' && PERMISSIONS.canManageUsers(user?.role!)) { setCurrentEditUser({}); setIsUserModalOpen(true); }
                else if(activeTab === 'videos') { setCurrentVideo({}); setIsVideoModalOpen(true); }
                else if(activeTab === 'social') { setCurrentSocialLink({}); setIsSocialModalOpen(true); }
            }} className={`w-full md:w-auto bg-brand-blue text-white px-6 md:px-10 py-4 rounded-2xl font-black shadow-2xl hover:scale-105 transition-all text-xs tracking-widest uppercase ${(
                (activeTab === 'categories' && !PERMISSIONS.canManageCategories(user?.role!)) ||
                (activeTab === 'ads' && !PERMISSIONS.canManageAds(user?.role!)) ||
                (activeTab === 'users' && !PERMISSIONS.canManageUsers(user?.role!)) ||
                (activeTab === 'submissions') ||
                (activeTab === 'messages') // Cannot add messages manually
            ) ? 'hidden' : ''}`}>+ AJOUTER</button>
        </header>

        {/* --- SETTINGS --- */}
        {activeTab === 'settings' && (
            <div className="bg-white p-6 md:p-12 rounded-[35px] shadow-sm border border-gray-100 max-w-2xl">
                <h3 className="text-2xl font-bold mb-6">Paramètres du Compteur de Visiteurs</h3>
                
                <div className="bg-blue-50 p-6 rounded-2xl mb-8 border border-blue-100">
                    <p className="text-blue-800 text-sm mb-2 font-bold">COMMENT ÇA MARCHE :</p>
                    <ul className="text-blue-700 text-sm list-disc pl-5 space-y-1">
                        <li>Ce nombre sert de base de départ.</li>
                        <li>Chaque visiteur verra ce nombre + un incrément aléatoire unique stocké dans son navigateur.</li>
                        <li>L'incrément augmente de ~100k à chaque rechargement pour cet utilisateur.</li>
                        <li>Pour tout le monde, le compteur commence au moins à la valeur ci-dessous.</li>
                    </ul>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-3">Base de visiteurs (Minimum affiché)</label>
                        <input 
                            type="number" 
                            value={visitorBaseCount} 
                            onChange={(e) => setVisitorBaseCount(parseInt(e.target.value) || 0)}
                            className="w-full bg-gray-50 border-none p-5 rounded-2xl font-bold text-xl focus:ring-2 focus:ring-brand-blue"
                        />
                    </div>
                    
                    <button 
                        onClick={handleSaveVisitorSettings}
                        disabled={isProcessing}
                        className="w-full py-5 bg-brand-blue text-white font-black rounded-2xl text-sm uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50"
                    >
                        {isProcessing ? 'Enregistrement...' : 'Sauvegarder les paramètres'}
                    </button>
                </div>
            </div>
        )}

        {/* --- ARTICLES --- */}
        {activeTab === 'articles' && (
            <div className="space-y-4">
                {articles.map(art => (
                    <div key={art.id} className="bg-white p-6 rounded-[35px] border border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between group hover:shadow-xl transition-all gap-6">
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8 w-full md:w-auto">
                            <img src={art.imageUrl} className="w-full md:w-20 h-40 md:h-20 rounded-3xl object-cover shadow-sm" alt="" />
                            <div>
                                <h3 className="font-bold text-xl md:text-2xl text-gray-900 group-hover:text-brand-blue transition-colors">{art.title}</h3>
                                <div className="flex flex-wrap items-center gap-2 mt-2">
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
                        <div className="flex gap-4 w-full md:w-auto">
                            <button onClick={() => handleEditArticle(art)} className="flex-1 md:flex-none px-8 py-4 bg-blue-50 text-brand-blue rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-blue hover:text-white transition-all">Éditer</button>
                            <button onClick={() => { if(confirm('Supprimer cet article ?')) deleteArticle(art.id).then(loadData); }} className="text-brand-red font-black p-4 hover:bg-red-50 rounded-2xl">✕</button>
                        </div>
                    </div>
                ))}
                {articles.length === 0 && <div className="text-center p-6 md:p-10 text-gray-400">Aucun article trouvé.</div>}
            </div>
        )}

        {/* --- SOUMISSIONS (Admin/Editor Only) --- */}
        {activeTab === 'submissions' && (
            <div className="space-y-4">
                {articles.filter(art => art.status === ArticleStatus.SUBMITTED).map(art => (
                    <div key={art.id} className="bg-yellow-50 p-6 rounded-[35px] border border-yellow-200 flex flex-col md:flex-row items-start md:items-center justify-between group hover:shadow-xl transition-all gap-6">
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8 w-full md:w-auto">
                            <div className="w-12 h-12 bg-yellow-200 rounded-full flex items-center justify-center shrink-0">
                                <span className="text-yellow-600 text-xl">📝</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-xl md:text-2xl text-gray-900 group-hover:text-brand-blue transition-colors">{art.title}</h3>
                                <p className="text-[10px] font-black uppercase text-gray-400 mt-2 tracking-widest">
                                    {art.category} • Soumis par {art.authorName} • {art.submittedAt ? new Date(art.submittedAt).toLocaleDateString() : ''}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-4 w-full md:w-auto">
                            <button onClick={() => handleEditArticle(art)} className="flex-1 md:flex-none px-4 md:px-8 py-4 bg-blue-50 text-brand-blue rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-blue hover:text-white transition-all">Examiner</button>
                            <button onClick={() => handleReviewSubmission(art.id, SubmissionStatus.APPROVED)} className="flex-1 md:flex-none px-4 md:px-8 py-4 bg-green-50 text-green-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-green-600 hover:text-white transition-all">Approuver</button>
                            <button onClick={() => handleReviewSubmission(art.id, SubmissionStatus.REJECTED)} className="flex-1 md:flex-none px-4 md:px-8 py-4 bg-red-50 text-red-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all">Rejeter</button>
                        </div>
                    </div>
                ))}
                {articles.filter(art => art.status === ArticleStatus.SUBMITTED).length === 0 && (
                    <div className="bg-white p-6 md:p-12 rounded-[35px] text-center">
                        <p className="text-gray-500 text-lg">Aucune soumission en attente</p>
                    </div>
                )}
            </div>
        )}

        {/* --- RUBRIQUES --- */}
        {activeTab === 'categories' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map(cat => (
                    <div key={cat.id} className="bg-white p-6 md:p-10 rounded-[40px] border border-gray-100 flex flex-col justify-between shadow-sm hover:shadow-xl transition-all group">
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
                    <div key={ad.id} className="bg-white p-6 md:p-10 rounded-[40px] border border-gray-100 flex flex-col justify-between shadow-sm group hover:shadow-xl transition-all">
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

        {/* --- MESSAGES (Admin Only) --- */}
        {activeTab === 'messages' && (
            <div className="space-y-4">
                {messages.length === 0 && <div className="text-center p-10 text-gray-400">Aucun message reçu.</div>}
                {messages.map(msg => (
                    <div key={msg.id} className={`bg-white p-6 rounded-[35px] border ${msg.status === 'UNREAD' ? 'border-l-8 border-l-brand-blue' : 'border-gray-100'} flex items-start justify-between group hover:shadow-xl transition-all`}>
                        <div className="flex-1 pr-8">
                            <div className="flex items-center gap-4 mb-2">
                                <h3 className={`font-bold text-xl ${msg.status === 'UNREAD' ? 'text-brand-dark' : 'text-gray-500'}`}>{msg.subject}</h3>
                                {msg.status === 'UNREAD' && <span className="bg-brand-blue text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded">Nouveau</span>}
                                <span className="text-xs text-gray-400">{new Date(msg.date).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-2 mb-4 text-sm text-gray-600 font-bold">
                                <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">👤</span>
                                {msg.name} <span className="text-gray-300 font-normal">&lt;{msg.email}&gt;</span>
                            </div>
                            <p className="text-gray-600 bg-gray-50 p-4 rounded-2xl text-sm leading-relaxed">{msg.message}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                            {msg.status === 'UNREAD' && (
                                <button onClick={() => handleMarkAsRead(msg.id)} className="px-6 py-3 bg-blue-50 text-brand-blue rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-blue hover:text-white transition-all whitespace-nowrap">Marquer lu</button>
                            )}
                            <button onClick={() => window.open(`mailto:${msg.email}?subject=Re: ${msg.subject}`)} className="px-6 py-3 bg-gray-50 text-gray-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all whitespace-nowrap">Répondre</button>
                            <button onClick={() => handleArchiveMessage(msg.id)} className="px-6 py-3 bg-red-50 text-brand-red rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-red hover:text-white transition-all whitespace-nowrap">Archiver</button>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* --- VIDÉOS --- */}
        {activeTab === 'videos' && (
            <div className="bg-white rounded-[50px] shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50/50 border-b">
                        <tr><th className="px-12 py-8 text-[11px] font-black uppercase text-gray-400 tracking-widest">Vidéo</th><th className="px-12 py-8 text-[11px] font-black uppercase text-gray-400 tracking-widest">Catégorie</th><th className="px-12 py-8 text-[11px] font-black uppercase text-gray-400 tracking-widest">ID YouTube</th><th className="px-12 py-8 text-right">Actions</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {videos.map(v => (
                            <tr key={v.id} className="hover:bg-blue-50/20 transition-all">
                                <td className="px-12 py-8">
                                    <div className="flex items-center gap-6">
                                        <img src={`https://img.youtube.com/vi/${v.youtubeId}/default.jpg`} className="w-24 h-16 object-cover rounded-xl shadow-md" alt="" />
                                        <p className="font-bold text-lg text-gray-900">{v.title}</p>
                                    </div>
                                </td>
                                <td className="px-12 py-8"><span className="bg-gray-100 text-gray-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">{v.category}</span></td>
                                <td className="px-12 py-8 font-mono text-xs text-gray-500">{v.youtubeId}</td>
                                <td className="px-12 py-8 text-right">
                                    <div className="flex justify-end gap-4">
                                        <button onClick={() => { setCurrentVideo(v); setIsVideoModalOpen(true); }} className="text-brand-blue font-black text-[11px] uppercase tracking-widest">Éditer</button>
                                        <button onClick={() => handleDeleteVideo(v.id)} className="text-brand-red font-black text-[11px] uppercase tracking-widest">Supprimer</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {videos.length === 0 && <div className="text-center p-10 text-gray-400">Aucune vidéo trouvée.</div>}
            </div>
        )}

        {/* --- RÉSEAUX SOCIAUX --- */}
        {activeTab === 'social' && (
            <div className="bg-white rounded-[50px] shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50/50 border-b">
                        <tr><th className="px-12 py-8 text-[11px] font-black uppercase text-gray-400 tracking-widest">Plateforme</th><th className="px-12 py-8 text-[11px] font-black uppercase text-gray-400 tracking-widest">URL</th><th className="px-12 py-8 text-[11px] font-black uppercase text-gray-400 tracking-widest">Aperçu</th><th className="px-12 py-8 text-right">Actions</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {socialLinks.map(link => (
                            <tr key={link.id} className="hover:bg-blue-50/20 transition-all">
                                <td className="px-12 py-8">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${link.bgColor} ${link.textColor}`}>
                                            <i className={link.iconClass}></i>
                                        </div>
                                        <span className="font-bold text-gray-900">{link.platform}</span>
                                    </div>
                                </td>
                                <td className="px-12 py-8 text-sm text-gray-600 truncate max-w-xs">{link.url}</td>
                                <td className="px-12 py-8">
                                     <div className={`w-8 h-8 rounded-full flex items-center justify-center ${link.bgColor} ${link.textColor}`}>
                                        <i className={link.iconClass}></i>
                                     </div>
                                </td>
                                <td className="px-12 py-8 text-right">
                                    <div className="flex justify-end gap-4">
                                        <button onClick={() => { setCurrentSocialLink(link); setIsSocialModalOpen(true); }} className="text-brand-blue font-black text-[11px] uppercase tracking-widest">Éditer</button>
                                        <button onClick={() => handleDeleteSocialLink(link.id)} className="text-brand-red font-black text-[11px] uppercase tracking-widest">Supprimer</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {socialLinks.length === 0 && <div className="text-center p-10 text-gray-400">Aucun réseau social configuré.</div>}
            </div>
        )}

        {/* --- PARAMÈTRES (Compteur Visiteurs) --- */}
        {activeTab === 'settings' && (
            <div className="bg-white p-10 rounded-[50px] shadow-sm border border-gray-100 max-w-2xl">
                <h3 className="text-2xl font-black text-brand-dark mb-6 uppercase tracking-tighter">Compteur de Visiteurs</h3>
                <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Nombre de visiteurs de base</label>
                        <input 
                            type="number" 
                            className="w-full p-6 bg-gray-50 rounded-[25px] font-bold text-xl outline-none border-2 border-transparent focus:border-brand-blue/10 transition-all"
                            value={visitorBaseCount}
                            onChange={(e) => setVisitorBaseCount(parseInt(e.target.value) || 0)}
                        />
                        <p className="text-xs text-gray-400 mt-2">
                            Ce nombre servira de base. Sur le site, un nombre aléatoire (simulant des visites en temps réel) sera ajouté à chaque rechargement.
                        </p>
                    </div>
                    <button 
                        onClick={handleSaveVisitorSettings}
                        className="w-full py-5 bg-brand-blue text-white rounded-[30px] font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all"
                    >
                        Sauvegarder
                    </button>
                </div>
            </div>
        )}
        {/* --- PERMISSIONS TABLE --- */}
        {activeTab === 'permissions' && (
            <div className="bg-white p-12 rounded-[35px] shadow-sm border border-gray-100">
                <div className="mb-8">
                    <h3 className="text-2xl font-bold mb-2">Matrice des Permissions</h3>
                    <p className="text-gray-500">Vue d'ensemble des droits d'accès pour chaque rôle système.</p>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="text-left py-6 text-xs font-black uppercase text-gray-400 tracking-widest w-1/3">Action</th>
                                <th className="text-center py-6 text-xs font-black uppercase text-brand-blue tracking-widest bg-blue-50/50 rounded-t-xl">
                                    <span className="block text-lg mb-1">👑</span>
                                    Admin
                                </th>
                                <th className="text-center py-6 text-xs font-black uppercase text-green-600 tracking-widest bg-green-50/50 rounded-t-xl">
                                    <span className="block text-lg mb-1">✍️</span>
                                    Éditeur
                                </th>
                                <th className="text-center py-6 text-xs font-black uppercase text-purple-600 tracking-widest bg-purple-50/50 rounded-t-xl">
                                    <span className="block text-lg mb-1">📝</span>
                                    Contributeur
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {Object.entries(PERMISSIONS).map(([key, checkFn]) => (
                                <tr key={key} className="hover:bg-gray-50 transition-colors">
                                    <td className="py-5 px-4 text-sm font-bold text-gray-700">
                                        {formatPermissionName(key)}
                                        <code className="block text-[9px] font-normal text-gray-300 mt-1 font-mono">{key}</code>
                                    </td>
                                    <td className="text-center py-5 bg-blue-50/20">
                                        {checkFn(UserRole.ADMIN) ? 
                                            <span className="inline-flex items-center justify-center w-8 h-8 bg-green-100 text-green-600 rounded-full text-lg shadow-sm">✓</span> : 
                                            <span className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 text-gray-300 rounded-full text-sm">✕</span>
                                        }
                                    </td>
                                    <td className="text-center py-5 bg-green-50/20">
                                        {checkFn(UserRole.EDITOR) ? 
                                            <span className="inline-flex items-center justify-center w-8 h-8 bg-green-100 text-green-600 rounded-full text-lg shadow-sm">✓</span> : 
                                            <span className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 text-gray-300 rounded-full text-sm">✕</span>
                                        }
                                    </td>
                                    <td className="text-center py-5 bg-purple-50/20">
                                        {checkFn(UserRole.CONTRIBUTOR) ? 
                                            <span className="inline-flex items-center justify-center w-8 h-8 bg-green-100 text-green-600 rounded-full text-lg shadow-sm">✓</span> : 
                                            <span className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 text-gray-300 rounded-full text-sm">✕</span>
                                        }
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

      </main>

      {/* --- MODAL VIDÉO --- */}
      {isVideoModalOpen && (
        <div className="fixed inset-0 bg-brand-dark/95 backdrop-blur-3xl z-[200] flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-lg rounded-[40px] p-10 shadow-2xl relative">
                <button onClick={() => setIsVideoModalOpen(false)} className="absolute top-6 right-6 text-gray-300 text-2xl hover:text-gray-500 transition-colors">✕</button>
                <h2 className="text-3xl font-serif font-black mb-8 text-brand-dark uppercase tracking-tighter">
                    {currentVideo.id ? 'Modifier la Vidéo' : 'Ajouter une Vidéo'}
                </h2>
                <form onSubmit={handleSaveVideo} className="space-y-6">
                    <input 
                        type="text" 
                        className="w-full p-5 bg-gray-50 rounded-[25px] font-bold outline-none border-2 border-transparent focus:border-brand-blue/10 transition-all" 
                        placeholder="Titre de la vidéo..." 
                        value={currentVideo.title || ''} 
                        onChange={e => setCurrentVideo({...currentVideo, title: e.target.value})} 
                        required
                    />
                    <input 
                        type="text" 
                        className="w-full p-5 bg-gray-50 rounded-[25px] font-bold outline-none border-2 border-transparent focus:border-brand-blue/10 transition-all" 
                        placeholder="ID YouTube ou Lien (ex: https://youtu.be/...)" 
                        value={currentVideo.youtubeId || ''} 
                        onChange={e => setCurrentVideo({...currentVideo, youtubeId: e.target.value})} 
                        required
                    />
                    <select 
                        className="w-full p-5 bg-gray-50 rounded-[25px] font-bold outline-none appearance-none border-2 border-transparent focus:border-brand-blue/10 transition-all"
                        value={currentVideo.category || ''} 
                        onChange={e => setCurrentVideo({...currentVideo, category: e.target.value})}
                        required
                    >
                        <option value="">Sélectionner une catégorie...</option>
                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                    <input 
                        type="text" 
                        className="w-full p-5 bg-gray-50 rounded-[25px] font-bold outline-none border-2 border-transparent focus:border-brand-blue/10 transition-all" 
                        placeholder="Durée (ex: 05:30) - Optionnel" 
                        value={currentVideo.duration || ''} 
                        onChange={e => setCurrentVideo({...currentVideo, duration: e.target.value})} 
                    />
                    <button type="submit" className="w-full py-5 bg-brand-blue text-white rounded-[30px] font-black uppercase tracking-widest shadow-2xl hover:scale-105 transition-all">
                        {currentVideo.id ? 'Mettre à jour' : 'Enregistrer la vidéo'}
                    </button>
                </form>
            </div>
        </div>
      )}

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
                    <div className="max-w-[850px] mx-auto">
                        {/* Title Section */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
                            <input 
                                type="text" 
                                placeholder="Saisissez votre titre ici" 
                                className="w-full text-3xl font-serif font-bold bg-transparent outline-none border-none text-brand-dark placeholder:text-gray-300"
                                value={currentArticle.title || ''}
                                onChange={e => setCurrentArticle({...currentArticle, title: e.target.value})}
                            />
                        </div>

                        {/* Media & AI Actions */}
                        <div className="flex items-center gap-4 mb-4">
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*" 
                                onChange={handleLocalImage} 
                            />
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-gray-50 text-gray-700 px-4 py-2 rounded border border-gray-300 text-xs font-bold uppercase hover:bg-white hover:border-gray-400 transition-all flex items-center gap-2"
                            >
                                <span>📷</span> Ajouter un média
                            </button>
                            <button 
                                onClick={handleAIFill}
                                className="bg-white text-brand-dark px-4 py-2 rounded border border-gray-300 text-xs font-bold uppercase hover:bg-brand-yellow/10 hover:border-brand-yellow transition-all flex items-center gap-2"
                                title="Générer un brouillon avec l'IA"
                            >
                                <span>✨</span> Générer avec l'IA
                            </button>
                        </div>

                        {/* Editor Section */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 min-h-[700px] flex flex-col relative overflow-hidden">
                            <style>{`
                                .ql-toolbar.ql-snow { border: none !important; border-bottom: 1px solid #e5e7eb !important; background: #f8f9fa; padding: 12px !important; }
                                .ql-container.ql-snow { border: none !important; font-family: 'Merriweather', serif; font-size: 16px; }
                                .ql-editor { min-height: 600px; padding: 32px !important; color: #1a202c; }
                            `}</style>
                            <ReactQuill 
                                theme="snow"
                                value={currentArticle.content || ''}
                                onChange={(content) => setCurrentArticle(prev => ({ ...prev, content }))}
                                modules={modules}
                                className="flex-1 flex flex-col"
                                placeholder="Commencez à écrire..."
                            /> 
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
                        <input 
                            type="file" 
                            ref={featuredImageRef} 
                            className="hidden" 
                            accept="image/*" 
                            onChange={handleFeaturedImage} 
                        />
                        <div className="flex gap-2">
                            <input type="text" className="flex-1 p-6 bg-gray-50 rounded-[25px] text-xs font-mono outline-none" value={currentArticle.imageUrl || ''} onChange={e => setCurrentArticle({...currentArticle, imageUrl: e.target.value})} placeholder="https://..." />
                            <button 
                                onClick={() => featuredImageRef.current?.click()}
                                className="w-16 bg-gray-100 hover:bg-brand-blue hover:text-white rounded-[25px] flex items-center justify-center transition-all"
                                title="Uploader une image locale"
                            >
                                📷
                            </button>
                        </div>
                        {currentArticle.imageUrl && <img src={currentArticle.imageUrl} className="w-full h-48 object-cover rounded-[35px] shadow-xl" alt="Aperçu" />}
                    </div>
                    <div className="bg-blue-50/40 p-10 rounded-[45px] space-y-6">
                        <div className="flex justify-between items-center">
                            <label className="text-[11px] font-black uppercase text-brand-blue tracking-widest">Chapeau (IA)</label>
                            <button onClick={handleAISummary} className="text-[9px] font-black bg-brand-dark text-white px-6 py-2 rounded-full hover:bg-brand-red transition-all">GÉNÉRER RÉSUMÉ</button>
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
                              <option value={AdType.SCRIPT}>Script HTML / Code</option>
                          </select>
                          <select className="w-full p-6 bg-gray-50 rounded-[25px] font-bold outline-none" value={currentAd.location || AdLocation.HEADER_LEADERBOARD} onChange={e => setCurrentAd({...currentAd, location: e.target.value as AdLocation})}>
                              <option value={AdLocation.HEADER_LEADERBOARD}>Haut de page</option>
                              <option value={AdLocation.SIDEBAR_SQUARE}>Sidebar (Carré)</option>
                              <option value={AdLocation.SIDEBAR_SKYSCRAPER}>Sidebar (Large)</option>
                          </select>
                      </div>

                      {/* Gestion dynamique du contenu selon le type */}
                      {currentAd.type === AdType.SCRIPT ? (
                          <textarea 
                            className="w-full p-8 bg-gray-900 text-green-400 rounded-[35px] font-mono text-xs outline-none h-44 border border-gray-700" 
                            placeholder="<!-- Collez votre code Script ou HTML ici -->" 
                            value={currentAd.content || ''} 
                            onChange={e => setCurrentAd({...currentAd, content: e.target.value})} 
                          />
                      ) : (
                          <div className="space-y-4">
                              <div className="flex gap-4">
                                  <input 
                                    type="text" 
                                    className="flex-1 p-6 bg-gray-50 rounded-[25px] font-bold outline-none text-xs" 
                                    placeholder="URL de l'image/vidéo..." 
                                    value={currentAd.content || ''} 
                                    onChange={e => setCurrentAd({...currentAd, content: e.target.value, imageUrl: e.target.value})} 
                                  />
                                  <label className="p-6 bg-brand-blue text-white rounded-[25px] font-bold cursor-pointer hover:bg-blue-700 transition-colors whitespace-nowrap">
                                      Upload 📤
                                      <input type="file" accept="image/*" className="hidden" onChange={handleAdImageUpload} />
                                  </label>
                              </div>
                              {currentAd.imageUrl && (
                                  <div className="w-full h-32 bg-gray-100 rounded-[25px] overflow-hidden border border-gray-200 flex items-center justify-center">
                                      <img src={currentAd.imageUrl} alt="Aperçu" className="h-full object-contain" />
                                  </div>
                              )}
                          </div>
                      )}

                      <input type="text" className="w-full p-6 bg-gray-50 rounded-[25px] font-bold outline-none" placeholder="Lien de redirection (Optionnel)..." value={currentAd.linkUrl || ''} onChange={e => setCurrentAd({...currentAd, linkUrl: e.target.value})} />
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

      {/* --- MODAL RÉSEAUX SOCIAUX --- */}
      {isSocialModalOpen && (
        <div className="fixed inset-0 bg-brand-dark/95 backdrop-blur-3xl z-[200] flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-lg rounded-[65px] p-16 shadow-2xl relative">
                <button onClick={() => setIsSocialModalOpen(false)} className="absolute top-12 right-12 text-gray-300 text-2xl">✕</button>
                <h2 className="text-4xl font-serif font-black mb-12 text-brand-dark uppercase tracking-tighter">Ajouter un Réseau</h2>
                <form onSubmit={handleSaveSocialLink} className="space-y-8">
                    <input 
                        type="text" 
                        className="w-full p-7 bg-gray-50 rounded-[35px] font-bold outline-none border-2 border-transparent focus:border-brand-blue/10 transition-all" 
                        placeholder="Plateforme (ex: Facebook)..." 
                        value={currentSocialLink.platform || ''} 
                        onChange={e => setCurrentSocialLink({...currentSocialLink, platform: e.target.value})} 
                        required
                    />
                    <input 
                        type="url" 
                        className="w-full p-7 bg-gray-50 rounded-[35px] font-bold outline-none border-2 border-transparent focus:border-brand-blue/10 transition-all" 
                        placeholder="URL du profil..." 
                        value={currentSocialLink.url || ''} 
                        onChange={e => setCurrentSocialLink({...currentSocialLink, url: e.target.value})} 
                        required
                    />
                    <div className="space-y-4">
                        <label className="text-xs font-bold text-gray-400 uppercase ml-4">Choisir une icône</label>
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                            {[
                                { name: 'Facebook', class: 'fab fa-facebook-f', color: 'bg-blue-600' },
                                { name: 'Twitter/X', class: 'fab fa-x-twitter', color: 'bg-black' },
                                { name: 'Instagram', class: 'fab fa-instagram', color: 'bg-pink-600' },
                                { name: 'LinkedIn', class: 'fab fa-linkedin-in', color: 'bg-blue-700' },
                                { name: 'YouTube', class: 'fab fa-youtube', color: 'bg-red-600' },
                                { name: 'TikTok', class: 'fab fa-tiktok', color: 'bg-black' },
                                { name: 'WhatsApp', class: 'fab fa-whatsapp', color: 'bg-green-500' },
                                { name: 'Email', class: 'fas fa-envelope', color: 'bg-gray-600' },
                                { name: 'Site Web', class: 'fas fa-globe', color: 'bg-gray-800' },
                            ].map((icon) => (
                                <button
                                    key={icon.name}
                                    type="button"
                                    onClick={() => setCurrentSocialLink({
                                        ...currentSocialLink,
                                        platform: icon.name,
                                        iconClass: icon.class,
                                        bgColor: icon.color
                                    })}
                                    className={`p-3 rounded-2xl flex flex-col items-center gap-2 transition-all border-2 ${currentSocialLink.iconClass === icon.class ? 'border-brand-blue bg-blue-50 text-brand-blue' : 'border-transparent bg-gray-50 hover:bg-gray-100 text-gray-500'}`}
                                >
                                    <i className={`${icon.class} text-xl`}></i>
                                    <span className="text-[9px] font-bold uppercase truncate w-full text-center">{icon.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <input 
                        type="text" 
                        className="w-full p-7 bg-gray-50 rounded-[35px] font-bold outline-none border-2 border-transparent focus:border-brand-blue/10 transition-all" 
                        placeholder="Ou saisissez une classe (ex: fab fa-facebook-f)..." 
                        value={currentSocialLink.iconClass || ''} 
                        onChange={e => setCurrentSocialLink({...currentSocialLink, iconClass: e.target.value})} 
                        required
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <input 
                            type="text" 
                            className="w-full p-7 bg-gray-50 rounded-[35px] font-bold outline-none border-2 border-transparent focus:border-brand-blue/10 transition-all" 
                            placeholder="Bg Color (ex: bg-blue-600)..." 
                            value={currentSocialLink.bgColor || ''} 
                            onChange={e => setCurrentSocialLink({...currentSocialLink, bgColor: e.target.value})} 
                        />
                        <input 
                            type="text" 
                            className="w-full p-7 bg-gray-50 rounded-[35px] font-bold outline-none border-2 border-transparent focus:border-brand-blue/10 transition-all" 
                            placeholder="Text Color (ex: text-white)..." 
                            value={currentSocialLink.textColor || ''} 
                            onChange={e => setCurrentSocialLink({...currentSocialLink, textColor: e.target.value})} 
                        />
                    </div>
                    <div className="flex items-center gap-4 justify-center p-4 bg-gray-50 rounded-2xl">
                        <span className="text-xs font-bold text-gray-400 uppercase">Aperçu :</span>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${currentSocialLink.bgColor || 'bg-gray-400'} ${currentSocialLink.textColor || 'text-white'}`}>
                            <i className={currentSocialLink.iconClass || 'fas fa-question'}></i>
                        </div>
                    </div>
                    <button type="submit" className="w-full py-7 bg-brand-blue text-white rounded-[40px] font-black uppercase tracking-widest shadow-2xl hover:scale-105 transition-all">
                        Enregistrer
                    </button>
                </form>
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