import React, { useEffect, useState } from 'react';
import { PublicLayout } from '../components/PublicLayout';
import { getArticles } from '../services/mockDatabase';
import { Article, ArticleStatus, AdLocation } from '../types';
import { Link } from 'react-router-dom';
import { AdDisplay } from '../components/AdDisplay';

export const HomePage = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
        const all = await getArticles();
        const published = all.filter(a => a.status === ArticleStatus.PUBLISHED);
        published.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setArticles(published);
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
                    <span>L'Édito de Bernard Kra</span>
                    <i className="fas fa-pen-nib"></i>
                </div>
                <div className="p-6 text-center">
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

            {/* TITROLOGIE WIDGET */}
            <div className="bg-gray-50 border border-gray-200 p-4">
                <div className="flex items-center mb-4 border-b border-gray-200 pb-2">
                     <span className="bg-brand-red w-2 h-2 mr-2"></span>
                     <h3 className="font-bold uppercase text-sm text-gray-800">Titrologie</h3>
                </div>
                <div className="mb-2">
                    <p className="text-xs text-gray-500 mb-2 font-bold uppercase">Quotidien L'AVENIR du {new Date().toLocaleDateString()}</p>
                    <div className="aspect-[3/4] bg-gray-200 w-full relative group cursor-pointer overflow-hidden shadow-md">
                        {/* Placeholder for Newspaper Cover */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 bg-gray-100">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-2 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                             </svg>
                             <span className="font-serif font-bold text-2xl text-gray-800">L'AVENIR</span>
                             <span className="text-[10px] uppercase tracking-widest mt-1">Le Journal</span>
                        </div>
                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                            <span className="bg-brand-red text-white text-xs font-bold px-3 py-1 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                                Aperçu
                            </span>
                        </div>
                    </div>
                </div>
                <button className="w-full bg-brand-red text-white font-bold uppercase text-xs py-3 hover:bg-red-700 transition-colors shadow-sm flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" /></svg>
                    Acheter le journal
                </button>
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
                    {[
                        '1529101091760-61df6be5d18b', 
                        '1498676077434-d5474e2a3854', 
                        '1576091160399-112ba8d25d1d', 
                        '1460317442991-0ec209397118'
                    ].map((photoId, i) => (
                        <div key={i} className="group cursor-pointer">
                            <div className="relative h-40 bg-gray-900 mb-3 overflow-hidden border border-gray-800">
                                <div className="absolute inset-0 flex items-center justify-center z-10">
                                    <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white border-2 border-white group-hover:scale-110 transition-transform shadow-lg">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-0.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                                    </div>
                                </div>
                                <img src={`https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&q=80&w=400`} alt="Video thumb" className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-500" />
                                <span className="absolute bottom-2 right-2 bg-black text-white text-[10px] font-bold px-1.5 py-0.5 rounded">02:30</span>
                            </div>
                            <div className="flex gap-2">
                                <span className="text-red-500 text-[10px] font-bold uppercase mt-1">Politique</span>
                                <p className="text-gray-300 text-sm font-bold leading-snug group-hover:text-white line-clamp-2">
                                    Déclaration exclusive : Les nouvelles mesures du gouvernement pour 2024
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
