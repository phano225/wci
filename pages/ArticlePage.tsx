import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PublicLayout } from '../components/PublicLayout';
import { getArticleById, getArticles } from '../services/mockDatabase';
import { Article, ArticleStatus, AdLocation } from '../types';
import { AdDisplay } from '../components/AdDisplay';

export const ArticlePage = () => {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<Article | undefined>();
  const [related, setRelated] = useState<Article[]>([]);

  useEffect(() => {
    if (id) {
      const found = getArticleById(id);
      setArticle(found);
      
      // Fetch related articles (same category, excluding current)
      if (found) {
        const all = getArticles();
        const rel = all.filter(a => 
            a.status === ArticleStatus.PUBLISHED && 
            a.category === found.category && 
            a.id !== found.id
        ).slice(0, 3);
        setRelated(rel);
      }
    }
  }, [id]);

  if (!article) {
    return (
      <PublicLayout>
        <div className="text-center py-20">
            <h1 className="text-3xl font-serif font-bold text-gray-800">Article non trouvé</h1>
            <Link to="/" className="text-brand-blue underline mt-4 block">Retour à l'accueil</Link>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Main Content */}
        <div className="lg:col-span-8">
            <div className="mb-4">
                <span className="bg-brand-red text-white text-xs font-bold uppercase px-2 py-1">{article.category}</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-serif font-bold text-gray-900 leading-tight mb-6">
                {article.title}
            </h1>
            
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-8 border-b border-gray-100 pb-6">
                <div className="flex items-center gap-2">
                    {article.authorAvatar && (
                        <img src={article.authorAvatar} alt={article.authorName} className="w-10 h-10 rounded-full border border-gray-200" />
                    )}
                    <div className="font-bold text-brand-dark">Par {article.authorName}</div>
                </div>
                <div>•</div>
                <div>{new Date(article.createdAt).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>

            {/* Media Area */}
            <div className="mb-8">
                {/* Check if video exists, otherwise show image */}
                {article.videoUrl ? (
                    <div className="w-full aspect-video bg-black rounded overflow-hidden shadow-lg mb-4">
                       {article.videoUrl.startsWith('data:') || article.videoUrl.endsWith('.mp4') ? (
                           <video controls className="w-full h-full">
                               <source src={article.videoUrl} type="video/mp4" />
                               Votre navigateur ne supporte pas la balise vidéo.
                           </video>
                       ) : (
                           // Basic Youtube Embed support (naive implementation)
                           <iframe 
                                className="w-full h-full"
                                src={article.videoUrl.replace('watch?v=', 'embed/')} 
                                title={article.title}
                                frameBorder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowFullScreen
                           ></iframe>
                       )}
                       <p className="text-xs text-gray-500 mt-2 italic">Vidéo associée à l'article</p>
                    </div>
                ) : (
                    <div className="w-full h-[400px] overflow-hidden rounded shadow-sm">
                         <img src={article.imageUrl} alt={article.title} className="w-full h-full object-cover" />
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="prose max-w-none text-gray-800 text-lg leading-relaxed">
                <p className="font-bold text-xl mb-6">{article.excerpt}</p>
                {article.content.split('\n').map((paragraph, idx) => (
                    <p key={idx} className="mb-4">{paragraph}</p>
                ))}
            </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-8 lg:pl-8 lg:border-l lg:border-gray-100">
             {/* Related Articles */}
             <div>
                <h3 className="font-bold uppercase text-lg border-b-2 border-brand-blue mb-4 pb-1">Dans la même rubrique</h3>
                <div className="space-y-4">
                    {related.map(rel => (
                        <Link to={`/article/${rel.id}`} key={rel.id} className="flex gap-4 group">
                             <div className="w-24 h-24 flex-shrink-0 bg-gray-200">
                                 <img src={rel.imageUrl} alt={rel.title} className="w-full h-full object-cover"/>
                             </div>
                             <div>
                                 <h4 className="font-serif font-bold text-sm leading-tight group-hover:text-brand-blue transition-colors">
                                     {rel.title}
                                 </h4>
                             </div>
                        </Link>
                    ))}
                    {related.length === 0 && <p className="text-gray-400 text-sm">Aucun article similaire.</p>}
                </div>
             </div>

             {/* Ad */}
             <div className="w-full flex items-center justify-center">
                <AdDisplay location={AdLocation.SIDEBAR_SQUARE} />
            </div>
        </div>

      </div>
    </PublicLayout>
  );
};