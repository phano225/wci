import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { PublicLayout } from '../components/PublicLayout';
import { getArticles, getVideos } from '../services/api';
import { Article, ArticleStatus, AdLocation, Video } from '../types';
import { Link, useSearchParams } from 'react-router-dom';
import { decode } from 'html-entities';
import { AdDisplay } from '../components/AdDisplay';

// Transforme les URLs d'images WordPress pour éviter ORB via proxy
const resolveImage = (url?: string, opts?: { w?: number; h?: number }) => {
  if (!url) return '';
  try {
    const u = new URL(url);
    if (u.hostname.includes('worldcanalinfo.com') && u.pathname.startsWith('/wp-content/')) {
      const base = `${u.hostname}${u.pathname}${u.search}`;
      const params = new URLSearchParams();
      if (opts?.w) params.set('w', String(opts.w));
      if (opts?.h) params.set('h', String(opts.h));
      params.set('fit', 'cover');
      return `https://images.weserv.nl/?url=${encodeURIComponent(base)}${params.toString() ? `&${params.toString()}` : ''}`;
    }
    return url;
  } catch {
    return url;
  }
};

export const HomePage = () => {
  const [searchParams] = useSearchParams();
  const selectedCat = searchParams.get('cat') || '';
  const [articles, setArticles] = useState<Article[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [editoArticle, setEditoArticle] = useState<Article | null>(null);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [carouselIndex, setCarouselIndex] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
        const [publishedArticles, allVideos] = await Promise.all([
            getArticles({ status: ArticleStatus.PUBLISHED, limit: 200 }),
            getVideos()
        ]);
        
        // Find the latest Edito
        const edito = publishedArticles.find(a => a.category === 'Edito' || a.category === 'Édito');
        setEditoArticle(edito || null);
        
        setArticles(publishedArticles);
        setVideos(allVideos);
        setLoading(false);
    };
    fetchData();
  }, []);

  const carouselItems = articles.slice(0, 5);
  useEffect(() => {
    if (carouselItems.length === 0) return;
    const t = setInterval(() => {
      setCarouselIndex(i => (i + 1) % carouselItems.length);
    }, 5000);
    return () => clearInterval(t);
  }, [carouselItems.length]);

  const isNew = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    return diff < 24 * 60 * 60 * 1000;
  };

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
  const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const catParam = selectedCat ? normalize(selectedCat) : '';
  const catArticles = catParam ? articles.filter(a => normalize(a.category) === catParam) : [];

  const featured = articles[0]; 
  const recentGrid = articles.slice(1, 7); // 6 articles for the grid below hero
  
  const politique = getByCategory('Politique');
  const societe = getByCategory('Société');
  const economie = getByCategory('Économie');
  const international = getByCategory('International');
  const sport = getByCategory('Sport');
  const culture = getByCategory('Culture');
  const primaryCats = new Set(['Politique','Société','Économie','International','Sport','Culture','Edito','Édito']);
  const otherCats = Array.from(new Set(articles.map(a => a.category))).filter(c => c && !primaryCats.has(c));
  const otherSections = otherCats
      .map(cat => ({ title: cat, data: getByCategory(cat) }))
      .filter(s => s.data && s.data.length > 0)
      .slice(0, 6);
  const usedIds = new Set<string>();
  if (featured) usedIds.add(featured.id);
  recentGrid.forEach(a => usedIds.add(a.id));
  const otherArticles = articles.filter(a => !primaryCats.has(a.category) && !usedIds.has(a.id)).slice(0, 8);

  // Reusable Category Section Component
  const CategorySection = ({ title, data, color = 'red' }: { title: string, data: Article[], color?: string }) => {
      if (!data || data.length === 0) return null;
      const items = data.slice(0, 4); // Take first 4 articles

      return (
        <section className="mb-12 border-b border-gray-100 pb-8 last:border-0">
            <div className="flex items-center mb-6">
                <h2 className={`text-sm font-bold uppercase text-white px-5 py-2.5 rounded-r-lg shadow-md ${color === 'green' ? 'bg-gradient-to-r from-[var(--secondary)] to-[#007a2e]' : 'bg-gradient-to-r from-[var(--primary)] to-[#e55314]'}`}>{decode(title)}</h2>
                <div className="h-px flex-1 bg-gradient-to-r from-gray-300 to-transparent ml-4"></div>
                <Link to={`/?cat=${title}`} className="text-xs font-bold text-[var(--primary)] uppercase ml-2 hover:underline tracking-wide">Voir plus &rarr;</Link>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {items.map(article => (
                    <Link to={`/article/${article.id}`} key={article.id} className="glass-card group h-full flex flex-col overflow-hidden">
                        <div className="relative h-48 img-reveal border-b border-[var(--glass-border)]">
                            <img 
                              src={resolveImage(article.imageUrl, { w: 800, h: 450 })} 
                              alt={article.title} 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                              crossOrigin="anonymous"
                              onError={(e) => { 
                                const img = e.currentTarget as HTMLImageElement; 
                                img.onerror = null; 
                                img.src = 'https://via.placeholder.com/800x450?text=Image+indisponible'; 
                              }} 
                            />
                            <div className="absolute top-3 left-3">
                                <span className={`badge-category ${color === 'green' ? 'green' : ''}`}>{decode(article.category)}</span>
                            </div>
                        </div>
                        <div className="p-4 flex flex-col flex-1">
                            <h3 className="text-[1.1rem] font-serif font-bold text-gray-900 group-hover:text-[var(--primary)] leading-snug mb-2 line-clamp-2 transition-colors">
                                {decode(article.title)}
                            </h3>
                            <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-1">{article.excerpt}</p>
                            <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                <i className="far fa-clock"></i> {new Date(article.createdAt).toLocaleDateString()}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </section>
      );
  };

  if (selectedCat) {
    return (
      <PublicLayout>
        <Helmet>
          <title>{`${selectedCat} | WCI`}</title>
          <meta name="description" content={`Derniers articles de ${selectedCat} sur WCI`} />
        </Helmet>
        <div className="mb-8 flex justify-center">
          <AdDisplay location={AdLocation.HEADER_LEADERBOARD} />
        </div>
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex items-center mb-6">
            <h2 className="text-sm font-bold uppercase text-white bg-brand-red px-4 py-2 shadow-sm">{selectedCat}</h2>
            <div className="h-0.5 flex-1 bg-gray-200"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {catArticles.map(article => (
              <Link to={`/article/${article.id}`} key={article.id} className="group block">
                <div className="h-40 overflow-hidden mb-3 relative">
                  <img 
                    src={resolveImage(article.imageUrl, { w: 600, h: 400 })} 
                    alt={article.title} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                    onError={(e) => { 
                      const img = e.currentTarget as HTMLImageElement; 
                      img.onerror = null; 
                      img.src = 'https://via.placeholder.com/600x400?text=Image+indisponible'; 
                    }}
                  />
                  <span className="absolute top-0 left-0 bg-brand-red text-white text-[10px] font-bold uppercase px-2 py-0.5">
                    {decode(article.category)}
                  </span>
                </div>
                <h3 className="text-base font-bold text-gray-900 group-hover:text-brand-red leading-tight line-clamp-3">
                  {decode(article.title)}
                </h3>
              </Link>
            ))}
          </div>
          {catArticles.length === 0 && (
            <div className="text-center text-gray-500 py-20">Aucun article dans cette rubrique pour le moment.</div>
          )}
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <Helmet>
        <title>{`WCI | L'actualité en continu`}</title>
        <meta name="description" content="Articles, vidéos et reportages — l’actualité en continu sur WCI." />
      </Helmet>
      
      {/* HEADER AD */}
      <div className="mb-8 flex justify-center">
        <AdDisplay location={AdLocation.HEADER_LEADERBOARD} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
        
        {/* === MAIN HERO AREA (Left 8 cols) === */}
        <div className="lg:col-span-8">
            
            {/* BIG FEATURED ARTICLE */}
            <div className="mb-8 relative group">
                {featured && (
                    <Link to={`/article/${featured.id}`} className="block h-[450px] md:h-[550px] relative img-reveal shadow-md" style={{ borderRadius: 'var(--radius-lg)' }}>
                        <img 
                          src={resolveImage(featured.imageUrl, { w: 1200, h: 600 })} 
                          alt={featured.title} 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                          crossOrigin="anonymous"
                          onError={(e) => { 
                            const img = e.currentTarget as HTMLImageElement; 
                            img.onerror = null; 
                            img.src = 'https://via.placeholder.com/1200x600?text=Image+indisponible'; 
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-[#1a1a1a]/40 to-transparent opacity-90"></div>
                        <div className="absolute bottom-0 left-0 p-6 md:p-10 w-full">
                            <span className="badge-category mb-4 inline-block">
                                {decode(featured.category)}
                            </span>
                            <h1 className="text-2xl md:text-4xl font-serif font-bold text-white leading-tight mb-4 drop-shadow-lg" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                                {decode(featured.title)}
                            </h1>
                            <div className="flex items-center text-gray-300 text-sm font-bold uppercase tracking-widest gap-3">
                                <span style={{ color: 'var(--primary)' }}>●</span>
                                <span>{new Date(featured.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </Link>
                )}
            </div>

            {/* GRID OF RECENT ARTICLES (3x2) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {recentGrid.map(article => (
                    <Link to={`/article/${article.id}`} key={article.id} className="glass-card group h-full flex flex-col overflow-hidden">
                        <div className="relative h-40 img-reveal border-b border-[var(--glass-border)]">
                            <img 
                              src={resolveImage(article.imageUrl, { w: 600, h: 400 })} 
                              alt={article.title} 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer"
                              crossOrigin="anonymous"
                              onError={(e) => { 
                                const img = e.currentTarget as HTMLImageElement; 
                                img.onerror = null; 
                                img.src = 'https://via.placeholder.com/600x400?text=Image+indisponible'; 
                              }}
                            />
                            <div className="absolute top-2 left-2">
                                <span className="badge-category" style={{ padding: '2px 8px', fontSize: '0.65rem' }}>
                                    {decode(article.category)}
                                </span>
                            </div>
                        </div>
                        <div className="p-4 flex flex-col flex-1">
                            <h3 className="text-sm font-bold text-gray-900 group-hover:text-[var(--primary)] leading-tight line-clamp-3 transition-colors">
                                {decode(article.title)}
                            </h3>
                            <div className="mt-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                <i className="far fa-clock"></i> {new Date(article.createdAt).toLocaleDateString()}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {otherArticles.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center mb-4">
                  <h2 className="text-sm font-bold uppercase text-white bg-brand-blue px-4 py-2">Autres rubriques</h2>
                  <div className="h-0.5 flex-1 bg-gray-200"></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {otherArticles.map(article => (
                    <Link to={`/article/${article.id}`} key={article.id} className="group block h-full">
                      <div className="relative h-40 overflow-hidden mb-3">
                        <img 
                          src={resolveImage(article.imageUrl, { w: 600, h: 400 })} 
                          alt={article.title} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                          referrerPolicy="no-referrer"
                          crossOrigin="anonymous"
                          onError={(e) => { 
                            const img = e.currentTarget as HTMLImageElement; 
                            img.onerror = null; 
                            img.src = 'https://via.placeholder.com/600x400?text=Image+indisponible'; 
                          }}
                        />
                        <span className="absolute top-0 left-0 bg-gray-900/80 text-white text-[10px] font-bold uppercase px-2 py-0.5">
                          {decode(article.category)}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-gray-900 group-hover:text-brand-blue leading-tight line-clamp-3">
                        {decode(article.title)}
                      </h3>
                    </Link>
                  ))}
                </div>
              </div>
            )}

        </div>

        {/* === SIDEBAR (Right 4 cols) === */}
        <div className="lg:col-span-4 space-y-8">
            {/* Zone mise en avant (remplace l'ancien Édito si dispo) */}
            {carouselItems.length > 0 ? (
              <div className="glass-card relative overflow-hidden">
                <div className="bg-gradient-to-r from-[var(--primary)] to-[#e55314] text-white text-sm font-bold uppercase px-5 py-3 flex items-center justify-between shadow-md">
                  <span>À la une</span>
                  <span className="text-[10px] tracking-widest bg-white/20 px-2 py-1 rounded">Derniers articles</span>
                </div>
                <div className="relative h-72 img-reveal">
                  <Link to={`/article/${carouselItems[carouselIndex].id}`} className="block h-full">
                    <img 
                      src={resolveImage(carouselItems[carouselIndex].imageUrl, { w: 800, h: 450 })} 
                      alt={carouselItems[carouselIndex].title} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      onError={(e) => { 
                        const img = e.currentTarget as HTMLImageElement; 
                        img.onerror = null; 
                        img.src = 'https://via.placeholder.com/800x450?text=Image+indisponible'; 
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a]/90 via-[#1a1a1a]/30 to-transparent"></div>
                    <div className="absolute top-3 left-3">
                        <span className="badge-category">
                          {decode(carouselItems[carouselIndex].category)}
                        </span>
                    </div>
                    {isNew(carouselItems[carouselIndex].createdAt) && (
                      <span className="absolute top-2 right-2 flex items-center gap-1 bg-yellow-400 text-black text-[10px] font-extrabold uppercase px-2 py-1 shadow animate-pulse">
                        <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                        À lire urgent
                      </span>
                    )}
                    <div className="absolute bottom-0 left-0 p-4">
                      <h3 className="text-white font-serif font-bold text-lg leading-tight line-clamp-3 drop-shadow">{decode(carouselItems[carouselIndex].title)}</h3>
                    </div>
                  </Link>
                  <button onClick={() => setCarouselIndex(i => (i - 1 + carouselItems.length) % carouselItems.length)} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/70">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M12.293 15.707a1 1 0 010-1.414L15.586 11H4a1 1 0 110-2h11.586l-3.293-3.293a1 1 0 111.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd"/></svg>
                  </button>
                  <button onClick={() => setCarouselIndex(i => (i + 1) % carouselItems.length)} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/70">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M7.707 4.293a1 1 0 010 1.414L4.414 9H16a1 1 0 110 2H4.414l3.293 3.293a1 1 0 11-1.414 1.414l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                  </button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                    {carouselItems.map((_, idx) => (
                      <button key={idx} onClick={() => setCarouselIndex(idx)} className={`w-2 h-2 rounded-full ${idx === carouselIndex ? 'bg-white' : 'bg-white/50'}`}></button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
            /* EDITO WIDGET (fallback) */
            <div className="bg-white border border-gray-200 shadow-sm">
                <div className="bg-brand-red text-white text-sm font-bold uppercase px-4 py-2 flex items-center justify-between">
                    <span>{editoArticle ? `L'Édito de ${editoArticle.authorName}` : "L'Édito de Bernard Kra"}</span>
                    <i className="fas fa-pen-nib"></i>
                </div>
                <div className="p-6 text-center">
                    {editoArticle ? (
                        <>
                            <div className="inline-block relative mb-4">
                                <img 
                                  src={resolveImage(editoArticle.authorAvatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Editor", { w: 96, h: 96 })} 
                                  alt={editoArticle.authorName} 
                                  className="w-24 h-24 rounded-full border-4 border-gray-100 shadow-sm" 
                                  referrerPolicy="no-referrer"
                                  crossOrigin="anonymous"
                                  onError={(e) => { 
                                    const img = e.currentTarget as HTMLImageElement; 
                                    img.onerror = null; 
                                    img.src = 'https://via.placeholder.com/96?text=NA'; 
                                  }}
                                />
                                <div className="absolute bottom-0 right-0 bg-brand-red text-white text-xs p-1 rounded-full">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                </div>
                            </div>
                            <h4 className="font-serif font-bold text-xl leading-tight mb-2 text-gray-900">{decode(editoArticle.title)}</h4>
                            <p className="text-sm text-gray-600 italic leading-relaxed mb-4 line-clamp-4">
                                "{decode(editoArticle.excerpt)}"
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
            )}

            {/* LES TOPS DE LA SEMAINE */}
            <div className="glass-card p-6">
                 <div className="flex items-center mb-6 border-b border-gray-200 pb-3">
                    <span className="text-[var(--primary)] font-bold uppercase text-lg mr-3"><i className="fas fa-chart-line"></i></span>
                    <h3 className="text-gray-900 font-bold uppercase text-sm tracking-wide">Les Tops de la semaine</h3>
                 </div>
                 <div className="space-y-4">
                    {articles.slice(8, 13).map((article, idx) => (
                        <Link to={`/article/${article.id}`} key={article.id} className="group flex gap-4 border-b border-gray-100 pb-4 last:border-0 hover:bg-gray-50/50 p-2 -mx-2 rounded transition-colors">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-bold text-sm">
                                {idx + 1}
                            </div>
                            <div>
                                <span className="text-[var(--primary)] text-[10px] font-bold uppercase tracking-wider mb-1 block">{decode(article.category)}</span>
                                <h4 className="text-sm font-medium text-gray-800 group-hover:text-[var(--primary)] leading-snug transition-colors">
                                    {decode(article.title)}
                                </h4>
                            </div>
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
                                <span className="text-red-500 text-[10px] font-bold uppercase mt-1">{decode(video.category)}</span>
                                <p className="text-gray-300 text-sm font-bold leading-snug group-hover:text-white line-clamp-2">
                                    {decode(video.title)}
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
        <CategorySection title="Sport" data={sport} />
        <CategorySection title="Culture" data={culture} />
        {otherSections.map(sec => (
          <CategorySection key={sec.title} title={sec.title} data={sec.data} />
        ))}
      </div>

    </PublicLayout>
  );
};
