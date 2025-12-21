
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PublicLayout } from '../components/PublicLayout';
import { getArticleById, getArticles, incrementArticleViews } from '../services/mockDatabase';
import { Article, ArticleStatus, AdLocation } from '../types';
import { AdDisplay } from '../components/AdDisplay';

export const ArticlePage = () => {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<Article | undefined>();
  const [related, setRelated] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
        if (id) {
            setLoading(true);
            // Incrémentation des vues pour le SEO et les stats
            await incrementArticleViews(id);
            
            const found = await getArticleById(id);
            setArticle(found);
            
            if (found) {
                const all = await getArticles();
                const rel = all.filter(a => 
                    a.status === ArticleStatus.PUBLISHED && 
                    a.category === found.category && 
                    a.id !== found.id
                ).slice(0, 3);
                setRelated(rel);
            }
            setLoading(false);
        }
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    if (article) {
        document.title = `${article.title} - World Canal Info`;
        const setMeta = (attrName: string, attrValue: string, content: string) => {
            let element = document.querySelector(`meta[${attrName}="${attrValue}"]`);
            if (!element) {
                element = document.createElement('meta');
                element.setAttribute(attrName, attrValue);
                document.head.appendChild(element);
            }
            element.setAttribute('content', content);
        };
        setMeta('property', 'og:type', 'article');
        setMeta('property', 'og:site_name', 'World Canal Info');
        setMeta('property', 'og:title', article.title);
        setMeta('property', 'og:description', article.excerpt);
        setMeta('property', 'og:image', article.imageUrl);
        setMeta('property', 'og:url', window.location.href);
        setMeta('name', 'twitter:card', 'summary_large_image');
        setMeta('name', 'twitter:title', article.title);
        setMeta('name', 'twitter:description', article.excerpt);
        setMeta('name', 'twitter:image', article.imageUrl);

        return () => {
            document.title = 'World Canal Info - L\'actualité en continu';
        };
    }
  }, [article]);

  if (loading) {
      return <PublicLayout><div className="flex justify-center h-64 items-center">Chargement de l'article...</div></PublicLayout>;
  }

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

  const shareUrl = window.location.href;
  const shareText = article.title;

  return (
    <PublicLayout>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <div className="lg:col-span-8">
            <div className="mb-6 flex justify-between items-center border-b border-gray-100 pb-4">
                <span className="bg-brand-red text-white text-[10px] font-bold uppercase px-3 py-1 rounded-full tracking-wider shadow-sm">{article.category}</span>
                <div className="flex items-center gap-2 text-gray-400 bg-gray-50 px-3 py-1 rounded-full" title="Nombre de lecteurs">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-brand-blue">
                      <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                      <path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs font-bold font-mono">{article.views || 0}</span>
                </div>
            </div>
            <h1 className="text-3xl md:text-5xl font-serif font-bold text-gray-900 leading-tight mb-6">
                {article.title}
            </h1>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-sm text-gray-500 mb-8 border-b border-gray-100 pb-6">
                <div className="flex items-center gap-2">
                    {article.authorAvatar && (
                        <img src={article.authorAvatar} alt={article.authorName} className="w-10 h-10 rounded-full border border-gray-200 object-cover" />
                    )}
                    <div className="font-bold text-brand-dark">Par {article.authorName}</div>
                </div>
                <div className="hidden sm:block">•</div>
                <div>{new Date(article.createdAt).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>

            <div className="mb-8">
                {article.videoUrl ? (
                    <div className="w-full aspect-video bg-black rounded overflow-hidden shadow-lg mb-4">
                       {article.videoUrl.startsWith('data:') || article.videoUrl.endsWith('.mp4') ? (
                           <video controls className="w-full h-full">
                               <source src={article.videoUrl} type="video/mp4" />
                               Votre navigateur ne supporte pas la balise vidéo.
                           </video>
                       ) : (
                           <iframe 
                                className="w-full h-full"
                                src={article.videoUrl.replace('watch?v=', 'embed/')} 
                                title={article.title}
                                frameBorder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowFullScreen
                           ></iframe>
                       )}
                    </div>
                ) : (
                    <div className="w-full max-h-[500px] overflow-hidden rounded shadow-sm">
                         <img src={article.imageUrl} alt={article.title} className="w-full h-full object-cover" />
                    </div>
                )}
            </div>

            <div className="prose max-w-none text-gray-800 text-lg leading-relaxed mb-10">
                <div dangerouslySetInnerHTML={{ __html: article.content.replace(/\n/g, '<br/>') }} />
            </div>

            <div className="border-t border-b border-gray-100 py-6 mb-8">
                <h4 className="font-bold text-gray-600 mb-3 uppercase text-sm">Partager cet article</h4>
                <div className="flex flex-wrap gap-3">
                    <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noreferrer" className="bg-[#1877F2] text-white px-4 py-2 rounded flex items-center gap-2 font-bold text-sm hover:opacity-90 transition-opacity">
                        Facebook
                    </a>
                    <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`} target="_blank" rel="noreferrer" className="bg-[#25D366] text-white px-4 py-2 rounded flex items-center gap-2 font-bold text-sm hover:opacity-90 transition-opacity">
                        WhatsApp
                    </a>
                    <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer" className="bg-black text-white px-4 py-2 rounded flex items-center gap-2 font-bold text-sm hover:opacity-80 transition-opacity">
                        X
                    </a>
                </div>
            </div>
        </div>

        <div className="lg:col-span-4 space-y-8 lg:pl-8 lg:border-l lg:border-gray-100">
             <div>
                <h3 className="font-bold uppercase text-lg border-b-2 border-brand-blue mb-4 pb-1">Rubrique {article.category}</h3>
                <div className="space-y-4">
                    {related.map(rel => (
                        <Link to={`/article/${rel.id}`} key={rel.id} className="flex gap-4 group">
                             <div className="w-20 h-20 flex-shrink-0 bg-gray-200 rounded overflow-hidden shadow-sm">
                                 <img src={rel.imageUrl} alt={rel.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform"/>
                             </div>
                             <div>
                                 <h4 className="font-serif font-bold text-sm leading-tight text-brand-red group-hover:text-brand-blue transition-colors">
                                     {rel.title}
                                 </h4>
                                 <span className="text-[10px] text-gray-400">{rel.views || 0} vues</span>
                             </div>
                        </Link>
                    ))}
                    {related.length === 0 && <p className="text-gray-400 text-sm">Aucun autre article dans cette rubrique.</p>}
                </div>
             </div>
             <div className="w-full flex items-center justify-center sticky top-20">
                <AdDisplay location={AdLocation.SIDEBAR_SQUARE} />
            </div>
        </div>

      </div>
    </PublicLayout>
  );
};
