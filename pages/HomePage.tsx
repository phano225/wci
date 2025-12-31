import React, { useEffect, useState } from 'react';
import { PublicLayout } from '../components/PublicLayout';
import { getArticles, getVideos } from '../services/api';
import { Article, ArticleStatus, AdLocation, Video } from '../types';
import { Link } from 'react-router-dom';
import { AdDisplay } from '../components/AdDisplay';

export const HomePage = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [editoArticle, setEditoArticle] = useState<Article | null>(null);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
        const [allArticles, allVideos] = await Promise.all([
            getArticles(),
            getVideos()
        ]);
        
        const published = allArticles.filter(a => a.status === ArticleStatus.PUBLISHED);
        published.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        // Find the latest Edito
        const edito = published.find(a => a.category === 'Edito' || a.category === 'Édito');
        setEditoArticle(edito || null);
        
        // Filter out Edito from main lists if desired, or keep it. Usually Edito is separate.
        // Let's keep it in the main list too unless we want to hide it. 
        // For now, we just select it.
        
        setArticles(published);
        setVideos(allVideos);
        setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
      return (
          <PublicLayout>
              <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-red"></div>
              </div>
          </PublicLayout>
      );
  }

  const getByCategory = (cat: string) => articles.filter(a => a.category === cat);

  const featured = articles[0]; 
  const recentGrid = articles.slice(1, 7); // 6 articles for the grid below hero
  
  const politique = getByCategory('Politique');
  const societe = getByCategory('Société');
  const economie = getByCategory('Économie');
  const international = getByCategory('International');
  const sport = getByCategory('Sport');

  // Reusable Category Section Component
  const CategorySection = ({ title, data, color = 'red' }: { title: string, data: Article[], color?: string }) => {
      if (!data || data.length === 0) return null;
      const main = data[0];
      const side = data.slice(1, 5); // 4 small articles

      return (
        <section className="mb-12">
            <div className="flex items-center mb-6">
                <h2 className="text-sm font-bold uppercase text-white bg-brand-red px-4 py-2 shadow-sm">{title}</h2>
                <div className="h-0.5 flex-1 bg-gray-200"></div>
                <Link to={`/?cat=${title}`} className="text-xs font-bold text-brand-red uppercase ml-2 hover:underline">Voir plus de {title} &rarr;</Link>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Main Article (Left/Top) - Spans 7 cols */}
                <div className="lg:col-span-7">
                    <Link to={`/article/${main.id}`} className="group block h-full">
                        <div className="relative h-[300px] lg:h-[400px] overflow-hidden mb-4">
                            <img src={main.imageUrl} alt={main.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                            <div className="absolute top-4 left-4">
                                <span className="bg-brand-red text-white text-xs font-bold uppercase px-2 py-1 shadow-md">{main.category}</span>
                            </div>
                        </div>
                        <h3 className="text-2xl md:text-3xl font-serif font-bold text-gray-900 group-hover:text-brand-red leading-tight mb-3">
                            {main.title}
                        </h3>
                        <p className="text-gray-600 leading-relaxed line-clamp-3">{main.excerpt}</p>
                    </Link>
                </div>

                {/* Side Grid (Right) - Spans 5 cols */}
                <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {side.map(article => (
                        <Link to={`/article/${article.id}`} key={article.id} className="group block flex flex-col h-full">
                             <div className="h-32 overflow-hidden mb-2 relative">
                                <img src={article.imageUrl} alt={article.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                <span className="absolute bottom-0 left-0 bg-brand-red text-white text-[10px] font-bold uppercase px-1">
                                    {article.category}
                                </span>
                             </div>
                             <h4 className="text-sm font-bold leading-snug group-hover:text-brand-red transition-colors line-clamp-3">
                                {article.title}
                             </h4>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
      );
  };

  return (
    <PublicLayout>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
        
        {/* === MAIN HERO AREA (Left 8 cols) === */}
        <div className="lg:col-span-8">
            
            {/* BIG FEATURED ARTICLE */}
            <div className="mb-8 relative group">
                {featured && (
                    <Link to={`/article/${featured.id}`} className="block h-[450px] md:h-[550px] relative overflow-hidden">
                        <img src={featured.imageUrl} alt={featured.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90"></div>
                        <div className="absolute bottom-0 left-0 p-6 md:p-10 w-full">
                            <span className="bg-brand-red text-white text-xs font-bold uppercase px-3 py-1 mb-3 inline-block shadow-sm">
                                {featured.category}
                            </span>
                            <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-white leading-tight mb-3 drop-shadow-md">
                                {featured.title}
                            </h1>
                            <div className="flex items-center text-gray-300 text-xs font-bold uppercase tracking-widest gap-2">
                                <span className="text-brand-red">●</span>
                                <span>{new Date(featured.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </Link>
                )}
            </div>

            {/* GRID OF RECENT ARTICLES (3x2) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {recentGrid.map(article => (
                    <Link to={`/article/${article.id}`} key={article.id} className="group block">
                        <div className="h-40 overflow-hidden mb-3 relative">
                            <img src={article.imageUrl} alt={article.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                            <span className="absolute top-0 left-0 bg-brand-red text-white text-[10px] font-bold uppercase px-2 py-0.5">
                                {article.category}
                            </span>
                        </div>
                        <h3 className="text-base font-bold text-gray-900 group-hover:text-brand-red leading-tight line-clamp-3">
                            {article.title}
                        </h3>
                    </Link>
                ))}
            </div>

        </div>

        {/* === SIDEBAR (Right 4 cols) === */}
        <div className="lg:col-span-4 space-y-8">
            
            {/* EDITO WIDGET */}
            <div className="bg-white border border-gray-200 shadow-sm">
                <div className="bg-brand-red text-white text-sm font-bold uppercase px-4 py-2 flex items-center justify-between">
                    <span>{editoArticle ? `L'Édito de ${editoArticle.authorName}` : "L'Édito de Bernard Kra"}</span>
                    <i className="fas fa-pen-nib"></i>
                </div>
                <div className="p-6 text-center">
                    {editoArticle ? (
                        <>
                            <div className="inline-block relative mb-4">
                                <img src={editoArticle.authorAvatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Editor"} alt={editoArticle.authorName} className="w-24 h-24 rounded-full border-4 border-gray-100 shadow-sm" />
                                <div className="absolute bottom-0 right-0 bg-brand-red text-white text-xs p-1 rounded-full">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                </div>
                            </div>
                            <h4 className="font-serif font-bold text-xl leading-tight mb-2 text-gray-900">{editoArticle.title}</h4>
                            <p className="text-sm text-gray-600 italic leading-relaxed mb-4 line-clamp-4">
                                "{editoArticle.excerpt}"
                            </p>
                            <Link to={`/article/${editoArticle.id}`} className="text-xs font-bold text-brand-red uppercase hover:underline">Lire l'édito &rarr;</Link>
                        </>
                    ) : (
                        <>
                            <div className="inline-block relative mb-4">
                                 <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Editor" alt="Editor" className="w-24 h-24 rounded-full border-4 border-gray-100 shadow-sm" />
                                 <div className="absolute bottom-0 right-0 bg-brand-red text-white text-xs p-1 rounded-full">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                 </div>
                            </div>
                            <h4 className="font-serif font-bold text-xl leading-tight mb-2 text-gray-900">Le chant du cygne et le temps des regrets</h4>
                            <p className="text-sm text-gray-600 italic leading-relaxed mb-4 line-clamp-4">
                                "L'opposition ivoirienne semble chercher son souffle dans un contexte politique en pleine mutation..."
                            </p>
                            <button className="text-xs font-bold text-brand-red uppercase hover:underline">Lire l'édito &rarr;</button>
                        </>
                    )}
                </div>
            </div>

            {/* LES TOPS DE LA SEMAINE */}
            <div>
                 <div className="flex items-center mb-4 border-b-2 border-brand-red pb-1">
                    <span className="text-brand-red font-bold uppercase text-sm mr-2"><i className="fas fa-chart-line"></i></span>
                    <h3 className="text-brand-red font-bold uppercase text-sm">Les Tops de la semaine</h3>
                 </div>
                 <div className="space-y-4">
                    {articles.slice(8, 13).map((article, idx) => (
                        <Link to={`/article/${article.id}`} key={article.id} className="block group border-b border-gray-100 pb-3 last:border-0">
                            <span className="bg-brand-red text-white text-[10px] font-bold px-1 mb-1 inline-block uppercase">{article.category}</span>
                            <h4 className="text-sm font-medium text-gray-800 group-hover:text-brand-red leading-snug">
                                {article.title}
                            </h4>
                        </Link>
                    ))}
                 </div>
            </div>

            {/* SKYSCRAPER AD */}
            <div className="flex justify-center">
                 <AdDisplay location={AdLocation.SIDEBAR_SKYSCRAPER} />
            </div>

            {/* AD RECTANGLE */}
            <div className="flex justify-center">
                <AdDisplay location={AdLocation.SIDEBAR_SQUARE} />
            </div>

        </div>

      </div>

      {/* === VIDEO STRIP (Full Width) === */}
      <section className="bg-black py-8 -mx-4 md:mx-0 px-4 md:px-8 mb-12 shadow-inner">
            <div className="container mx-auto">
                <div className="flex items-center mb-6 border-b border-gray-800 pb-2">
                     <span className="w-3 h-3 bg-red-600 rounded-full animate-pulse mr-2"></span>
                     <h3 className="text-white font-bold uppercase text-sm tracking-wider">Vidéos à la une</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                    {videos.map((video) => (
                        <div key={video.id} className="group cursor-pointer" onClick={() => setPlayingVideoId(video.id)}>
                            <div className="relative h-40 bg-gray-900 mb-3 overflow-hidden border border-gray-800">
                                {playingVideoId === video.id ? (
                                    <iframe 
                                        width="100%" 
                                        height="100%" 
                                        src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1`} 
                                        title={video.title} 
                                        frameBorder="0" 
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                        allowFullScreen
                                        className="absolute inset-0 w-full h-full"
                                    ></iframe>
                                ) : (
                                    <>
                                        <div className="absolute inset-0 flex items-center justify-center z-10">
                                            <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white border-2 border-white group-hover:scale-110 transition-transform shadow-lg">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-0.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                                            </div>
                                        </div>
                                        <img src={`https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`} alt={video.title} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-500" />
                                        {video.duration && <span className="absolute bottom-2 right-2 bg-black text-white text-[10px] font-bold px-1.5 py-0.5 rounded">{video.duration}</span>}
                                    </>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <span className="text-red-500 text-[10px] font-bold uppercase mt-1">{video.category}</span>
                                <p className="text-gray-300 text-sm font-bold leading-snug group-hover:text-white line-clamp-2">
                                    {video.title}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
      </section>

      {/* === CATEGORY SECTIONS === */}
      <div className="space-y-4">
        <CategorySection title="Politique" data={politique} />
        <CategorySection title="Économie" data={economie} color="blue" />
        <CategorySection title="Société" data={societe} color="green" />
        <CategorySection title="International" data={international} />
      </div>

    </PublicLayout>
  );
};
