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

  // Handle Meta Tags for Social Sharing (WhatsApp, Facebook, X)
  useEffect(() => {
    if (article) {
        // Update Browser Title
        document.title = `${article.title} - World Canal Info`;

        // Helper function to set or create meta tags
        const setMeta = (attrName: string, attrValue: string, content: string) => {
            let element = document.querySelector(`meta[${attrName}="${attrValue}"]`);
            if (!element) {
                element = document.createElement('meta');
                element.setAttribute(attrName, attrValue);
                document.head.appendChild(element);
            }
            element.setAttribute('content', content);
        };

        // Open Graph (Facebook, WhatsApp, LinkedIn)
        setMeta('property', 'og:type', 'article');
        setMeta('property', 'og:site_name', 'World Canal Info');
        setMeta('property', 'og:title', article.title);
        setMeta('property', 'og:description', article.excerpt);
        setMeta('property', 'og:image', article.imageUrl);
        setMeta('property', 'og:url', window.location.href);

        // Twitter Card (X)
        setMeta('name', 'twitter:card', 'summary_large_image');
        setMeta('name', 'twitter:title', article.title);
        setMeta('name', 'twitter:description', article.excerpt);
        setMeta('name', 'twitter:image', article.imageUrl);

        // Cleanup: Reset title when leaving (Optional, but good practice)
        return () => {
            document.title = 'World Canal Info - L\'actualité en continu';
        };
    }
  }, [article]);

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

  // Current URL for sharing
  const shareUrl = window.location.href;
  const shareText = article.title;

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
            <div className="prose max-w-none text-gray-800 text-lg leading-relaxed mb-10">
                <div dangerouslySetInnerHTML={{ __html: article.content.replace(/\n/g, '<br/>') }} />
            </div>

            {/* Social Sharing Buttons */}
            <div className="border-t border-b border-gray-100 py-6 mb-8">
                <h4 className="font-bold text-gray-600 mb-3 uppercase text-sm">Partager cet article</h4>
                <div className="flex flex-wrap gap-3">
                    <a 
                        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="bg-[#1877F2] text-white px-4 py-2 rounded flex items-center gap-2 font-bold text-sm hover:opacity-90 transition-opacity"
                    >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                        Facebook
                    </a>
                    
                    <a 
                        href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="bg-[#25D366] text-white px-4 py-2 rounded flex items-center gap-2 font-bold text-sm hover:opacity-90 transition-opacity"
                    >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                        WhatsApp
                    </a>

                    <a 
                        href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="bg-black text-white px-4 py-2 rounded flex items-center gap-2 font-bold text-sm hover:opacity-80 transition-opacity"
                    >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                        X
                    </a>
                </div>
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
                             <div className="w-24 h-24 flex-shrink-0 bg-gray-200 rounded overflow-hidden">
                                 <img src={rel.imageUrl} alt={rel.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform"/>
                             </div>
                             <div>
                                 {/* CHANGED: Text red by default, blue on hover */}
                                 <h4 className="font-serif font-bold text-sm leading-tight text-brand-red group-hover:text-brand-blue transition-colors">
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