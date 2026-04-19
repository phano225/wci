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
    getArticleById,
    getCategoryOrder,
    saveCategoryOrder
} from '../services/api';
import { generateSEOMeta, generateArticleDraft } from '../services/aiService';
import { Article, ArticleStatus, Category, Ad, AdType, AdLocation, UserRole, User, PERMISSIONS, SubmissionStatus, ContactMessage, Video, SocialLink } from '../types';
import { useNavigate, Link } from 'react-router-dom';
import { LoginPage } from './LoginPage';
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

const sortCategoriesForDisplay = (list: Category[]) =>
  [...list].sort((a, b) => {
    const pa = typeof a.position === 'number' ? a.position : 9999;
    const pb = typeof b.position === 'number' ? b.position : 9999;
    if (pa !== pb) return pa - pb;
    return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
  });

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
  const [isMobileEditorSettingsOpen, setIsMobileEditorSettingsOpen] = useState(false);
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
  const [selectedArticleIds, setSelectedArticleIds] = useState<string[]>([]);
  const [bulkCategoryTarget, setBulkCategoryTarget] = useState<string>('');
  const [categoryOrderEdits, setCategoryOrderEdits] = useState<Record<string, number>>({});
  
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
    if (user) {
      loadData();
    }
  }, [user, activeTab]);

  if (!user) {
      return <LoginPage />;
  }

  const loadData = async () => {
    setIsProcessing(true);
    
    // Safety timeout to prevent infinite spinner
    const timeoutId = setTimeout(() => {
        setIsProcessing(false);
    }, 15000);

    try {
        const [arts, cats, adsList, userList, msgList, videoList, socialList, orderIds] = await Promise.all([
            getArticles(user?.role === UserRole.CONTRIBUTOR ? { authorId: user.id, limit: 500 } : { limit: 500 }),
            getCategories(),
            getAds(),
            getUsers(),
            getMessages(),
            getVideos(),
            getSocialLinks(),
            getCategoryOrder()
        ]);

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
        
        clearTimeout(timeoutId); // Clear timeout if successful

        setArticles(arts);

        let sortedCats = sortCategoriesForDisplay(cats);
        if (orderIds && orderIds.length > 0) {
          sortedCats = [...cats].sort((a, b) => {
            const ia = orderIds.indexOf(a.id);
            const ib = orderIds.indexOf(b.id);
            if (ia === -1 && ib === -1) return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
            if (ia === -1) return 1;
            if (ib === -1) return -1;
            return ia - ib;
          });
        }

        setCategories(sortedCats);
        const orderMap: Record<string, number> = {};
        sortedCats.forEach((c, idx) => {
          orderMap[c.id] = idx + 1;
        });
        setCategoryOrderEdits(orderMap);
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
        /* no-op */
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
        
        await saveVideo(videoToSave);
        
        // Optimistic update or partial reload for speed
        const updatedVideos = await getVideos();
        setVideos(updatedVideos);
        
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
        alert('L\'opération prend trop de temps. Vérifiez votre connexion.');
    }, 30000);

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

      await saveArticle(articleToSave);
      
      // OPTIMIZATION: Only reload articles, not everything
      // And we use the lightweight getArticles() which excludes content
      const updatedArticles = await getArticles(user?.role === UserRole.CONTRIBUTOR ? { authorId: user.id, limit: 500 } : { limit: 500 });
      setArticles(updatedArticles);
      
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
        const existing = currentCategory.id ? categories.find(c => c.id === currentCategory.id) : undefined;
        const oldName = existing?.name;
        let position = existing?.position;
        if (position === undefined) {
          const maxPos = categories.reduce((max, c) => (typeof c.position === 'number' && c.position > max ? c.position : max), -1);
          position = maxPos + 1;
        }

        await saveCategory({
            id: currentCategory.id || Date.now().toString(),
            name: currentCategory.name,
            slug: currentCategory.name.toLowerCase().replace(/\s+/g, '-'),
            position
        });

        // Propager le renommage aux articles référencés par l'ancien nom
        if (oldName && oldName !== currentCategory.name) {
            const toUpdate = articles.filter(a => a.category === oldName);
            for (const art of toUpdate) {
                const updated: Article = { ...art, category: currentCategory.name, updatedAt: new Date().toISOString() };
                await saveArticle(updated);
            }
        }

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
              alert("Veuillez sélectionner une action pour les articles.");
              setIsProcessing(false);
              return;
          }

          if (targetCategoryForReassign !== '__delete__') {
            let targetCatName = targetCategoryForReassign;

            if (targetCategoryForReassign === '__new__') {
                const newCatName = prompt("Nom de la nouvelle catégorie :");
                if (!newCatName) { setIsProcessing(false); return; }

                let position = categories.reduce((max, c) => (typeof c.position === 'number' && c.position > max ? c.position : max), -1);
                position += 1;
                const newCat: Category = {
                    id: Date.now().toString(),
                    name: newCatName,
                    slug: newCatName.toLowerCase().replace(/\s+/g, '-'),
                    position
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

  const toggleArticleSelection = (id: string) => {
    setSelectedArticleIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const resetArticleSelection = () => {
    setSelectedArticleIds([]);
    setBulkCategoryTarget('');
  };

  const handleBulkChangeCategory = async () => {
    if (!bulkCategoryTarget) {
      alert('Veuillez choisir une rubrique de destination.');
      return;
    }
    if (selectedArticleIds.length === 0) {
      alert('Sélectionnez au moins un article.');
      return;
    }
    setIsProcessing(true);
    try {
      for (const id of selectedArticleIds) {
        const article = articles.find(a => a.id === id);
        if (!article) continue;
        const updated: Article = { ...article, category: bulkCategoryTarget, updatedAt: new Date().toISOString() };
        await saveArticle(updated);
      }
      resetArticleSelection();
      await loadData();
      alert('Rubrique mise à jour pour les articles sélectionnés.');
    } catch (error) {
      console.error('Erreur lors du transfert de rubrique:', error);
      alert('Erreur lors du transfert de rubrique.');
    } finally {
      setIsProcessing(false);
    }
  };

  const persistCategoryOrder = async (ordered: Category[]) => {
    setIsProcessing(true);
    try {
      const ids = ordered.map(c => c.id);
      await saveCategoryOrder(ids);
      await loadData();
    } catch (error) {
      console.error('Erreur lors du réordonnancement des rubriques:', error);
      alert('Erreur lors de la mise à jour de l’ordre des rubriques.');
    } finally {
      setIsProcessing(false);
    }
  };

  const moveCategory = async (id: string, direction: 'up' | 'down') => {
    if (categories.length < 2) return;
    const list = [...categories];
    const index = list.findIndex(c => c.id === id);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;
    setCategories(list);
    await persistCategoryOrder(list);
  };

  const handleCategoryOrderChange = (id: string, value: number) => {
    if (!Number.isFinite(value)) return;
    setCategoryOrderEdits(prev => ({
      ...prev,
      [id]: value,
    }));
  };

  const applyCategoryOrder = async () => {
    if (categories.length < 2) return;
    const list = [...categories].sort((a, b) => {
      const va = categoryOrderEdits[a.id] ?? 9999;
      const vb = categoryOrderEdits[b.id] ?? 9999;
      if (va !== vb) return va - vb;
      return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
    });
    setCategories(list);
    await persistCategoryOrder(list);
    alert('Ordre des rubriques mis à jour.');
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
  
  const handleUserAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    try {
      const url = await uploadImage(file);
      setCurrentEditUser(prev => ({ ...prev, avatar: url }));
    } catch (error) {
      console.error('Erreur upload avatar:', error);
      alert("Échec de l'upload de la photo de profil.");
    } finally {
      setIsProcessing(false);
    }
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
      <div className="md:hidden bg-white text-brand-dark p-3 px-4 flex justify-between items-center sticky top-0 z-50 shadow-sm border-b border-gray-100">
          <div className="flex items-center gap-3">
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-xl text-brand-dark focus:outline-none">
                  <i className={`fas ${isMobileMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
              </button>
              <h2 className="text-xl font-serif font-black text-brand-blue tracking-tighter">WCI Admin</h2>
          </div>
          {['articles', 'categories', 'users', 'ads', 'videos', 'social'].includes(activeTab) && (
              <button onClick={() => { 
                  if(activeTab === 'articles') { setCurrentArticle({}); setIsEditorOpen(true); } 
                  else if(activeTab === 'categories') { setCurrentCategory({}); setIsCategoryModalOpen(true); } 
                  else if(activeTab === 'users') { setCurrentEditUser({}); setIsUserModalOpen(true); }
                  else if(activeTab === 'ads') { setCurrentAd({ location: AdLocation.HEADER_LEADERBOARD, type: AdType.IMAGE, active: true }); setIsAdModalOpen(true); }
                  else if(activeTab === 'videos') { setCurrentVideo({}); setIsVideoModalOpen(true); }
                  else if(activeTab === 'social') { setCurrentSocialLink({}); setIsSocialModalOpen(true); }
              }} className="w-10 h-10 bg-brand-blue text-white rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform">
                  <i className="fas fa-plus"></i>
              </button>
          )}
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

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
            <button onClick={() => { setActiveTab('articles'); setIsMobileMenuOpen(false); }} className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-bold transition-all ${activeTab === 'articles' ? 'bg-brand-blue shadow-md text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                <i className="fas fa-file-alt w-5 text-center"></i> Articles
            </button>
            
            {PERMISSIONS.canReviewSubmissions(user?.role!) && (
                <button onClick={() => { setActiveTab('submissions'); setIsMobileMenuOpen(false); }} className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between text-sm font-bold transition-all ${activeTab === 'submissions' ? 'bg-brand-blue shadow-md text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                    <div className="flex items-center gap-3"><i className="fas fa-tasks w-5 text-center"></i> Soumissions</div>
                    {articles.filter(a => a.status === ArticleStatus.SUBMITTED).length > 0 && (
                        <span className="bg-brand-red text-white text-[10px] px-2 py-0.5 rounded-full">{articles.filter(a => a.status === ArticleStatus.SUBMITTED).length}</span>
                    )}
                </button>
            )}
            
            {PERMISSIONS.canManageCategories(user?.role!) && <button onClick={() => { setActiveTab('categories'); setIsMobileMenuOpen(false); }} className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-bold transition-all ${activeTab === 'categories' ? 'bg-brand-blue shadow-md text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                <i className="fas fa-tags w-5 text-center"></i> Rubriques
            </button>}
            
            {PERMISSIONS.canManageAds(user?.role!) && <button onClick={() => { setActiveTab('ads'); setIsMobileMenuOpen(false); }} className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-bold transition-all ${activeTab === 'ads' ? 'bg-brand-blue shadow-md text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                <i className="fas fa-ad w-5 text-center"></i> Publicités
            </button>}
            
            <button onClick={() => { setActiveTab('videos'); setIsMobileMenuOpen(false); }} className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-bold transition-all ${activeTab === 'videos' ? 'bg-brand-blue shadow-md text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                <i className="fas fa-video w-5 text-center"></i> Vidéos
            </button>

            {PERMISSIONS.canManageUsers(user?.role!) && <button onClick={() => { setActiveTab('users'); setIsMobileMenuOpen(false); }} className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-brand-blue shadow-md text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                <i className="fas fa-users w-5 text-center"></i> Équipe
            </button>}
            
            {PERMISSIONS.canManageUsers(user?.role!) && <button onClick={() => { setActiveTab('messages'); setIsMobileMenuOpen(false); }} className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between text-sm font-bold transition-all ${activeTab === 'messages' ? 'bg-brand-blue shadow-md text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                <div className="flex items-center gap-3"><i className="fas fa-envelope w-5 text-center"></i> Messages</div>
                {messages.filter(m => m.status === 'UNREAD').length > 0 && (
                    <span className="bg-brand-red text-white text-[10px] px-2 py-0.5 rounded-full">{messages.filter(m => m.status === 'UNREAD').length}</span>
                )}
            </button>}

            {PERMISSIONS.canManageUsers(user?.role!) && <button onClick={() => { setActiveTab('social'); setIsMobileMenuOpen(false); }} className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-bold transition-all ${activeTab === 'social' ? 'bg-brand-blue shadow-md text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                <i className="fas fa-share-alt w-5 text-center"></i> Réseaux Sociaux
            </button>}

            {PERMISSIONS.canManageAds(user?.role!) && <button onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }} className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-bold transition-all ${activeTab === 'settings' ? 'bg-brand-blue shadow-md text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                <i className="fas fa-cog w-5 text-center"></i> Paramètres
            </button>}

            <button onClick={() => { setActiveTab('permissions'); setIsMobileMenuOpen(false); }} className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-bold transition-all ${activeTab === 'permissions' ? 'bg-brand-blue shadow-md text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                <i className="fas fa-shield-alt w-5 text-center"></i> Permissions
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

      <main className="flex-1 p-4 md:p-8 lg:p-12 overflow-y-auto w-full">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-10 gap-4 md:gap-0">
            <h1 className="text-2xl md:text-4xl font-serif font-black text-brand-dark uppercase tracking-tighter">
                {activeTab === 'articles' ? 'Mes Articles' : activeTab === 'submissions' ? 'Attente de Validation' : activeTab === 'categories' ? 'Rubriques' : activeTab === 'ads' ? 'Régie Pub' : activeTab === 'messages' ? 'Messagerie' : activeTab === 'videos' ? 'Vidéos' : activeTab === 'social' ? 'Réseaux Sociaux' : activeTab === 'permissions' ? 'Permissions' : activeTab === 'settings' ? 'Paramètres' : 'Équipe'}
            </h1>
            
            <button onClick={() => { 
                if(activeTab === 'articles') { setCurrentArticle({}); setIsEditorOpen(true); } 
                else if(activeTab === 'categories' && PERMISSIONS.canManageCategories(user?.role!)) { setCurrentCategory({}); setIsCategoryModalOpen(true); }
                else if(activeTab === 'ads' && PERMISSIONS.canManageAds(user?.role!)) { setCurrentAd({active: true, location: AdLocation.HEADER_LEADERBOARD, type: AdType.IMAGE}); setIsAdModalOpen(true); }
                else if(activeTab === 'users' && PERMISSIONS.canManageUsers(user?.role!)) { setCurrentEditUser({}); setIsUserModalOpen(true); }
                else if(activeTab === 'videos') { setCurrentVideo({}); setIsVideoModalOpen(true); }
                else if(activeTab === 'social') { setCurrentSocialLink({}); setIsSocialModalOpen(true); }
            }} className={`hidden md:flex px-6 py-3 bg-brand-blue text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg hover:bg-blue-700 active:scale-95 transition-all items-center justify-center gap-2 ${(
                (activeTab === 'categories' && !PERMISSIONS.canManageCategories(user?.role!)) ||
                (activeTab === 'ads' && !PERMISSIONS.canManageAds(user?.role!)) ||
                (activeTab === 'users' && !PERMISSIONS.canManageUsers(user?.role!)) ||
                (activeTab === 'submissions') ||
                (activeTab === 'messages') ||
                (activeTab === 'permissions') ||
                (activeTab === 'settings')
            ) ? '!hidden' : ''}`}>
                <i className="fas fa-plus"></i> Ajouter
            </button>
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
                {articles.length > 0 && (
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="text-[11px] font-black uppercase tracking-widest text-gray-500">
                      {selectedArticleIds.length > 0 ? `${selectedArticleIds.length} article(s) sélectionné(s)` : `${articles.length} article(s)`}
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        className="p-3 rounded-2xl bg-white border border-gray-200 text-xs font-bold uppercase tracking-widest"
                        value={bulkCategoryTarget}
                        onChange={e => setBulkCategoryTarget(e.target.value)}
                      >
                        <option value="">Transférer vers...</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={handleBulkChangeCategory}
                        className="px-4 py-3 bg-brand-blue text-white rounded-2xl text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
                        disabled={selectedArticleIds.length === 0}
                      >
                        Transférer
                      </button>
                      {selectedArticleIds.length > 0 && (
                        <button
                          onClick={resetArticleSelection}
                          className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-700"
                        >
                          Réinitialiser
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {articles.map(art => (
                    <div key={art.id} className="bg-white p-3 md:p-5 rounded-2xl border border-gray-100 flex flex-row items-center gap-3 md:gap-5 hover:shadow-md transition-all group relative overflow-hidden">
                        {/* Status Strip */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                            art.status === ArticleStatus.PUBLISHED ? 'bg-green-500' : 
                            art.status === ArticleStatus.SUBMITTED ? 'bg-yellow-500' : 'bg-gray-300'
                        }`} />
                        
                        <input
                          type="checkbox"
                          className="w-5 h-5 text-brand-blue border-gray-300 rounded shrink-0 cursor-pointer ml-1"
                          checked={selectedArticleIds.includes(art.id)}
                          onChange={() => toggleArticleSelection(art.id)}
                        />
                        
                        <img src={art.imageUrl} className="w-16 h-16 md:w-28 md:h-24 rounded-xl object-cover shadow-sm bg-gray-50 shrink-0 hidden sm:block" alt="" />
                        
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                 <span className={`px-2 py-0.5 rounded text-[9px] md:text-[10px] font-black uppercase tracking-widest ${
                                    art.status === ArticleStatus.PUBLISHED ? 'bg-green-50 text-green-600 border border-green-100' : 
                                    art.status === ArticleStatus.SUBMITTED ? 'bg-yellow-50 text-yellow-600 border border-yellow-100' : 
                                    'bg-gray-50 text-gray-500 border border-gray-200'
                                }`}>
                                    {art.status === ArticleStatus.SUBMITTED ? 'EN ATTENTE' : art.status === 'PUBLISHED' ? 'PUBLIÉ' : 'BROUILLON'}
                                </span>
                                <span className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase tracking-wider">{art.category}</span>
                            </div>
                            <h3 className="font-bold text-sm md:text-lg text-gray-900 line-clamp-2 group-hover:text-brand-blue transition-colors font-serif leading-tight">{art.title}</h3>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-[10px] md:text-xs text-gray-400 font-medium uppercase tracking-wide">
                                <span className="flex items-center gap-1" title="Vues"><i className="fas fa-eye"></i> {art.views || 0}</span>
                                <span className="flex items-center gap-1" title="Date de modification"><i className="far fa-calendar-alt"></i> {new Date(art.updatedAt || art.createdAt).toLocaleDateString()}</span>
                                {art.authorName && <span className="flex items-center gap-1 truncate max-w-[100px] md:max-w-none" title="Auteur"><i className="far fa-user"></i> {art.authorName}</span>}
                            </div>
                            {art.reviewComments && (
                                <p className="text-red-500 text-[10px] md:text-xs mt-2 bg-red-50 p-2 rounded-lg border border-red-100">💬 Note: {art.reviewComments}</p>
                            )}
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-2 shrink-0">
                            <button onClick={() => handleEditArticle(art)} className="w-8 h-8 sm:w-auto sm:h-auto sm:px-4 sm:py-2 bg-blue-50 text-brand-blue rounded-lg font-bold text-[10px] sm:text-xs uppercase hover:bg-brand-blue hover:text-white transition-all flex items-center justify-center">
                                <i className="fas fa-pen sm:hidden"></i>
                                <span className="hidden sm:inline">Éditer</span>
                            </button>
                            <button onClick={() => { if(confirm('Supprimer cet article ?')) deleteArticle(art.id).then(loadData); }} className="w-8 h-8 sm:w-10 sm:h-10 bg-red-50 text-red-500 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition-all">
                                <i className="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                ))}
                {articles.length === 0 && (
                    <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[35px] border border-dashed border-gray-300 text-center">
                        <div className="text-4xl mb-4">📄</div>
                        <p className="text-gray-500 font-medium">Aucun article trouvé.</p>
                        <button onClick={() => { setCurrentArticle({}); setIsEditorOpen(true); }} className="mt-4 text-brand-blue font-bold hover:underline">Créer votre premier article</button>
                    </div>
                )}
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
            <div className="space-y-8">
                <div className="bg-white rounded-[30px] border border-gray-100 p-6 md:p-8 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-gray-500">Ordre des rubriques</h3>
                            <p className="text-xs text-gray-400 mt-1">Choisissez la position (1, 2, 3, ...) de chaque rubrique puis validez.</p>
                        </div>
                        <button
                          onClick={applyCategoryOrder}
                          className="px-6 py-3 bg-brand-blue text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-dark transition-all"
                          disabled={categories.length === 0}
                        >
                          Valider l&apos;ordre
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {categories.map((cat, idx) => (
                            <div key={cat.id} className="flex items-center justify-between gap-3 bg-gray-50/60 rounded-2xl px-3 py-2">
                                <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-white border border-gray-200 text-[11px] font-black flex items-center justify-center">
                                        {categoryOrderEdits[cat.id] ?? (idx + 1)}
                                    </span>
                                    <span className="text-xs font-semibold text-gray-800 uppercase tracking-widest truncate max-w-[140px]">{cat.name}</span>
                                </div>
                                <input
                                  type="number"
                                  min={1}
                                  max={categories.length}
                                  value={categoryOrderEdits[cat.id] ?? (idx + 1)}
                                  onChange={(e) => handleCategoryOrderChange(cat.id, parseInt(e.target.value, 10))}
                                  className="w-16 px-2 py-1 text-xs text-center border border-gray-200 rounded-xl font-semibold"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categories.map((cat, index) => (
                        <div
                          key={cat.id}
                          className="bg-white p-6 md:p-10 rounded-[40px] border border-gray-100 flex flex-col justify-between shadow-sm hover:shadow-xl transition-all group"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h3 className="text-3xl font-black text-brand-dark uppercase tracking-tighter leading-none">{cat.name}</h3>
                                    <p className="text-xs font-mono text-gray-400 mt-2">/{cat.slug}</p>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <button
                                      onClick={() => moveCategory(cat.id, 'up')}
                                      disabled={index === 0}
                                      className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold ${index === 0 ? 'opacity-30 cursor-default' : 'hover:bg-gray-100'}`}
                                    >
                                      ↑
                                    </button>
                                    <button
                                      onClick={() => moveCategory(cat.id, 'down')}
                                      disabled={index === categories.length - 1}
                                      className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold ${index === categories.length - 1 ? 'opacity-30 cursor-default' : 'hover:bg-gray-100'}`}
                                    >
                                      ↓
                                    </button>
                                </div>
                            </div>
                            <div className="mt-8 flex gap-4">
                                <button onClick={() => { setCurrentCategory(cat); setIsCategoryModalOpen(true); }} className="flex-1 py-4 bg-gray-50 text-brand-blue rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-blue hover:text-white transition-all">Modifier</button>
                                <button onClick={() => { setCurrentCategory(cat); setTargetCategoryForReassign(''); setIsDeleteCategoryModalOpen(true); }} className="px-6 py-4 bg-red-50 text-brand-red rounded-2xl font-black hover:bg-brand-red hover:text-white transition-all">✕</button>
                            </div>
                        </div>
                    ))}
                </div>
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
        <div className="fixed inset-0 bg-[#0a0a0a] z-[100] flex flex-col animate-in slide-in-from-bottom duration-500 overflow-hidden">
            <header className="px-4 py-3 md:px-12 md:py-6 border-b border-gray-800 flex flex-row justify-between items-center bg-[#0a0a0a] z-10 shadow-sm gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => setIsEditorOpen(false)} className="w-10 h-10 md:w-12 md:h-12 rounded-full hover:bg-gray-800 text-white flex items-center justify-center text-xl md:text-3xl transition-all">✕</button>
                    <div>
                        <h2 className="text-lg md:text-2xl font-serif font-black text-white uppercase tracking-tighter truncate max-w-[150px] md:max-w-none">Éditeur</h2>
                        {user?.role === UserRole.CONTRIBUTOR && (
                            <span className="text-[10px] md:text-xs text-orange-500 font-bold block">Mode Contributeur</span>
                        )}
                    </div>
                </div>
                
                {/* Desktop Actions */}
                <div className="hidden md:flex gap-2">
                    <button onClick={() => handleSaveArticle(ArticleStatus.DRAFT)} className="px-8 py-4 border-2 border-gray-700 text-gray-300 rounded-2xl font-black text-xs uppercase hover:bg-gray-800 whitespace-nowrap">Brouillon</button>
                    
                    {PERMISSIONS.canPublishArticle(user?.role!) && (
                        <button onClick={() => handleSaveArticle(ArticleStatus.PUBLISHED)} className="px-12 py-4 bg-[#fbbf24] text-black rounded-2xl font-black text-xs uppercase shadow-2xl hover:scale-105 active:scale-95 transition-all whitespace-nowrap">ENREGISTRER</button>
                    )}
                    
                    {PERMISSIONS.canSubmitForReview(user?.role!) && !PERMISSIONS.canPublishArticle(user?.role!) && (
                        <button onClick={() => handleSaveArticle(ArticleStatus.SUBMITTED)} className="px-12 py-4 bg-brand-yellow text-brand-dark rounded-2xl font-black text-xs uppercase shadow-2xl hover:scale-105 active:scale-95 transition-all whitespace-nowrap">SOUMETTRE</button>
                    )}
                </div>

                {/* Mobile Settings Toggle */}
                <button 
                    onClick={() => setIsMobileEditorSettingsOpen(!isMobileEditorSettingsOpen)}
                    className="md:hidden w-10 h-10 rounded-full bg-gray-800 text-white flex items-center justify-center text-xl shrink-0"
                >
                    ⚙️
                </button>
            </header>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-[#0a0a0a] relative">
                <div className="flex-1 overflow-y-auto p-2 md:py-12 md:px-8 pb-24 md:pb-12">
                    <div className="max-w-[850px] mx-auto">
                        {/* Title Section */}
                        <div className="bg-[#141414] p-3 md:p-6 rounded-lg shadow-sm border border-gray-800 mb-4 md:mb-6">
                            <input 
                                type="text" 
                                placeholder="Saisissez votre titre ici" 
                                className="w-full text-lg md:text-3xl font-serif font-bold bg-transparent outline-none border-none text-white placeholder:text-gray-600"
                                value={currentArticle.title || ''}
                                onChange={e => setCurrentArticle({...currentArticle, title: e.target.value})}
                            />
                        </div>

                        {/* Media & AI Actions */}
                        <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-4">
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*" 
                                onChange={handleLocalImage} 
                            />
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-[#141414] text-gray-300 px-4 py-2 rounded border border-gray-700 text-[10px] md:text-xs font-bold uppercase hover:bg-[#1a1a1a] hover:border-gray-600 transition-all flex items-center gap-2"
                            >
                                <span>📷</span> Média
                            </button>
                            <button 
                                onClick={handleAIFill}
                                className="bg-[#141414] text-gray-300 px-4 py-2 rounded border border-gray-700 text-[10px] md:text-xs font-bold uppercase hover:bg-brand-yellow/10 hover:border-brand-yellow transition-all flex items-center gap-2"
                                title="Générer un brouillon avec l'IA"
                            >
                                <span>✨</span> IA
                            </button>
                        </div>

                        {/* Editor Section - DARK THEME */}
                        <div className="bg-[#0a0a0a] rounded-lg shadow-2xl border border-gray-800 min-h-[500px] md:min-h-[700px] flex flex-col relative overflow-visible">
                            <style>{`
                                /* Toolbar Dark Theme */
                                .ql-toolbar.ql-snow { 
                                    border: none !important; 
                                    border-bottom: 1px solid #333 !important; 
                                    background: #141414; 
                                    padding: 12px 8px !important;
                                    position: sticky;
                                    top: 0;
                                    z-index: 30;
                                    display: flex;
                                    flex-wrap: wrap;
                                    justify-content: center;
                                    border-top-left-radius: 0.5rem;
                                    border-top-right-radius: 0.5rem;
                                }
                                
                                /* Icons Color Fix */
                                .ql-snow .ql-stroke { stroke: #a3a3a3 !important; }
                                .ql-snow .ql-fill { fill: #a3a3a3 !important; }
                                .ql-snow .ql-picker { color: #a3a3a3 !important; }
                                .ql-snow .ql-picker-options { background-color: #1a1a1a !important; color: #a3a3a3 !important; border: 1px solid #333 !important; }
                                
                                /* Hover States */
                                .ql-snow .ql-picker:hover { color: #fff !important; }
                                .ql-snow .ql-picker:hover .ql-picker-label { color: #fff !important; }
                                .ql-snow .ql-picker-label:hover { color: #fff !important; }
                                .ql-snow .ql-picker-item:hover { color: #fff !important; background-color: #333 !important; }
                                button.ql-active .ql-stroke { stroke: #fbbf24 !important; } /* Active Gold */
                                button.ql-active .ql-fill { fill: #fbbf24 !important; }
                                button:hover .ql-stroke { stroke: #fff !important; }
                                button:hover .ql-fill { fill: #fff !important; }

                                .ql-formats { margin-right: 15px !important; border-right: 1px solid #333; padding-right: 15px; }
                                .ql-formats:last-child { border-right: none; }
                                
                                .ql-snow .ql-picker-label { padding-left: 4px !important; }
                                .ql-container.ql-snow { border: none !important; font-family: 'Merriweather', serif; font-size: 18px; background-color: #0a0a0a; }
                                
                                .ql-editor { 
                                    min-height: 300px; 
                                    padding: 15px !important; 
                                    color: #e5e5e5; 
                                    line-height: 1.8;
                                }
                                .ql-editor.ql-blank::before { color: #555 !important; font-style: italic; }

                                @media (min-width: 768px) {
                                    .ql-toolbar.ql-snow { padding: 16px !important; justify-content: flex-start; gap: 5px; }
                                    .ql-editor { min-height: 600px; padding: 40px !important; max-width: 900px; margin: 0 auto; }
                                }
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

                {/* Mobile Bottom Action Bar */}
                <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0a0a0a] border-t border-gray-800 p-3 z-40 flex gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)]">
                    <button onClick={() => handleSaveArticle(ArticleStatus.DRAFT)} className="flex-1 py-3 border border-gray-700 bg-transparent rounded-xl font-black text-[10px] uppercase text-gray-300">Brouillon</button>
                    
                    {PERMISSIONS.canPublishArticle(user?.role!) && (
                        <button onClick={() => handleSaveArticle(ArticleStatus.PUBLISHED)} className="flex-[2] py-3 bg-[#fbbf24] text-black rounded-xl font-black text-xs uppercase shadow-lg">ENREGISTRER</button>
                    )}
                    
                    {PERMISSIONS.canSubmitForReview(user?.role!) && !PERMISSIONS.canPublishArticle(user?.role!) && (
                        <button onClick={() => handleSaveArticle(ArticleStatus.SUBMITTED)} className="flex-[2] py-3 bg-brand-yellow text-brand-dark rounded-xl font-black text-xs uppercase shadow-lg">SOUMETTRE</button>
                    )}
                </div>

                {/* Sidebar - Responsive Overlay on Mobile */}
                <aside className={`
                    fixed inset-0 z-50 bg-[#0a0a0a] overflow-y-auto p-6 transition-transform duration-300 ease-in-out
                    md:static md:translate-x-0 md:w-[450px] md:border-l md:border-gray-800 md:p-12 md:space-y-12 md:shadow-2xl md:z-10
                    ${isMobileEditorSettingsOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
                `}>
                    <div className="flex justify-between items-center mb-8 md:hidden">
                        <h3 className="text-2xl font-serif font-black text-white uppercase">Paramètres</h3>
                        <button onClick={() => setIsMobileEditorSettingsOpen(false)} className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-xl text-white">✕</button>
                    </div>

                    <div className="space-y-4 mb-8 md:mb-0">
                        <label className="block text-[11px] font-black uppercase text-gray-400 tracking-widest">Rubrique</label>
                        <select className="w-full p-6 bg-[#141414] text-white rounded-[25px] font-bold outline-none border-2 border-transparent focus:border-brand-yellow/30 transition-all" value={currentArticle.category || ''} onChange={e => setCurrentArticle({...currentArticle, category: e.target.value})}>
                            <option value="">Sélectionner...</option>
                            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-4 mb-8 md:mb-0">
                        <label className="block text-[11px] font-black uppercase text-gray-400 tracking-widest">Image de Une (URL)</label>
                        <input 
                            type="file" 
                            ref={featuredImageRef} 
                            className="hidden" 
                            accept="image/*" 
                            onChange={handleFeaturedImage} 
                        />
                        <div className="flex gap-2">
                            <input type="text" className="flex-1 p-6 bg-[#141414] text-white rounded-[25px] text-xs font-mono outline-none" value={currentArticle.imageUrl || ''} onChange={e => setCurrentArticle({...currentArticle, imageUrl: e.target.value})} placeholder="https://..." />
                            <button 
                                onClick={() => featuredImageRef.current?.click()}
                                className="w-16 bg-[#141414] text-white hover:bg-brand-blue hover:text-white rounded-[25px] flex items-center justify-center transition-all border border-gray-800"
                                title="Uploader une image locale"
                            >
                                📷
                            </button>
                        </div>
                        {currentArticle.imageUrl && <img src={currentArticle.imageUrl} className="w-full h-48 object-cover rounded-[35px] shadow-xl" alt="Aperçu" />}
                    </div>
                    <div className="bg-[#141414] p-10 rounded-[45px] space-y-6 mb-8 md:mb-0 border border-gray-800">
                        <div className="flex justify-between items-center">
                            <label className="text-[11px] font-black uppercase text-gray-400 tracking-widest">Chapeau (IA)</label>
                            <button onClick={handleAISummary} className="text-[9px] font-black bg-brand-yellow text-black px-6 py-2 rounded-full hover:bg-white transition-all">GÉNÉRER RÉSUMÉ</button>
                        </div>
                        <textarea className="w-full p-6 bg-[#0a0a0a] text-gray-300 rounded-[35px] text-base italic font-serif border-none outline-none h-40 resize-none shadow-sm" value={currentArticle.excerpt || ''} onChange={e => setCurrentArticle({...currentArticle, excerpt: e.target.value})} placeholder="Court résumé de l'article..." />
                    </div>
                    <div className="space-y-4">
                        <label className="block text-[11px] font-black uppercase text-gray-400 tracking-widest">Vidéo (URL)</label>
                        <input type="text" className="w-full p-6 bg-[#141414] text-white rounded-[25px] text-xs font-mono outline-none" placeholder="Lien vidéo..." value={currentArticle.videoUrl || ''} onChange={e => setCurrentArticle({...currentArticle, videoUrl: e.target.value})} />
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
          <div className="fixed inset-0 bg-brand-dark/95 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-lg rounded-3xl p-6 md:p-10 shadow-2xl relative max-h-[90vh] flex flex-col">
                  <div className="flex justify-between items-center mb-6 shrink-0">
                      <h2 className="text-2xl md:text-3xl font-serif font-black text-brand-dark uppercase tracking-tighter">Profil Staff</h2>
                      <button onClick={() => setIsUserModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-brand-red transition-colors">
                          <i className="fas fa-times text-xl"></i>
                      </button>
                  </div>
                  
                  <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar flex-1 pb-4">
                      {/* Avatar */}
                      <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                          <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 border border-gray-200">
                              <img 
                                src={currentEditUser.avatar || 'https://via.placeholder.com/80?text=Avatar'} 
                                alt="Avatar" 
                                className="w-full h-full object-cover" 
                              />
                          </div>
                          <div>
                              <label className="block text-[11px] font-black uppercase text-gray-500 mb-2">Photo de profil</label>
                              <input type="file" accept="image/*" onChange={handleUserAvatarUpload} />
                          </div>
                      </div>

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
        <div className="fixed inset-0 bg-brand-dark/95 backdrop-blur-sm z-[200] flex items-center justify-center p-4 sm:p-6">
            <div className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-10 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                <button onClick={() => setIsSocialModalOpen(false)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors z-10">
                  <i className="fas fa-times"></i>
                </button>
                <h2 className="text-2xl sm:text-3xl font-serif font-black mb-6 sm:mb-8 text-brand-dark uppercase tracking-tighter mt-4 sm:mt-0">Ajouter un Réseau</h2>
                <form onSubmit={handleSaveSocialLink} className="space-y-5 sm:space-y-6">
                    <input 
                        type="text" 
                        className="w-full p-4 sm:p-5 bg-gray-50 rounded-2xl text-sm sm:text-base font-bold outline-none border-2 border-transparent focus:border-brand-blue/30 transition-all" 
                        placeholder="Plateforme (ex: Facebook)..." 
                        value={currentSocialLink.platform || ''} 
                        onChange={e => setCurrentSocialLink({...currentSocialLink, platform: e.target.value})} 
                        required
                    />
                    <input 
                        type="url" 
                        className="w-full p-4 sm:p-5 bg-gray-50 rounded-2xl text-sm sm:text-base font-bold outline-none border-2 border-transparent focus:border-brand-blue/30 transition-all" 
                        placeholder="URL du profil..." 
                        value={currentSocialLink.url || ''} 
                        onChange={e => setCurrentSocialLink({...currentSocialLink, url: e.target.value})} 
                        required
                    />
                    <div className="space-y-3 sm:space-y-4">
                        <label className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase ml-2 sm:ml-4">Choisir une icône</label>
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
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
                                    className={`p-2 sm:p-3 rounded-xl flex flex-col items-center gap-1 sm:gap-2 transition-all border-2 ${currentSocialLink.iconClass === icon.class ? 'border-brand-blue bg-blue-50 text-brand-blue' : 'border-transparent bg-gray-50 hover:bg-gray-100 text-gray-500'}`}
                                >
                                    <i className={`${icon.class} text-lg sm:text-xl`}></i>
                                    <span className="text-[8px] sm:text-[9px] font-bold uppercase truncate w-full text-center">{icon.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <input 
                        type="text" 
                        className="w-full p-4 sm:p-5 bg-gray-50 rounded-2xl text-sm sm:text-base font-bold outline-none border-2 border-transparent focus:border-brand-blue/30 transition-all" 
                        placeholder="Ou saisissez une classe..." 
                        value={currentSocialLink.iconClass || ''} 
                        onChange={e => setCurrentSocialLink({...currentSocialLink, iconClass: e.target.value})} 
                        required
                    />
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <input 
                            type="text" 
                            className="w-full p-4 sm:p-5 bg-gray-50 rounded-2xl text-xs sm:text-sm font-bold outline-none border-2 border-transparent focus:border-brand-blue/30 transition-all" 
                            placeholder="Bg Color..." 
                            value={currentSocialLink.bgColor || ''} 
                            onChange={e => setCurrentSocialLink({...currentSocialLink, bgColor: e.target.value})} 
                        />
                        <input 
                            type="text" 
                            className="w-full p-4 sm:p-5 bg-gray-50 rounded-2xl text-xs sm:text-sm font-bold outline-none border-2 border-transparent focus:border-brand-blue/30 transition-all" 
                            placeholder="Text Color..." 
                            value={currentSocialLink.textColor || ''} 
                            onChange={e => setCurrentSocialLink({...currentSocialLink, textColor: e.target.value})} 
                        />
                    </div>
                    <div className="flex items-center gap-4 justify-center p-3 sm:p-4 bg-gray-50 rounded-2xl">
                        <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase">Aperçu :</span>
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${currentSocialLink.bgColor || 'bg-gray-400'} ${currentSocialLink.textColor || 'text-white'}`}>
                            <i className={currentSocialLink.iconClass || 'fas fa-question'}></i>
                        </div>
                    </div>
                    <button type="submit" className="w-full py-4 sm:py-5 bg-brand-blue text-white rounded-2xl text-sm sm:text-base font-black uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-all">
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
