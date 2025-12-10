import React, { useEffect, useState } from 'react';
import { PublicLayout } from '../components/PublicLayout';
import { getArticles } from '../services/mockDatabase';
import { Article, ArticleStatus, AdLocation } from '../types';
import { Link, useSearchParams } from 'react-router-dom';
import { AdDisplay } from '../components/AdDisplay';

export const HomePage = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [searchParams] = useSearchParams();
  const categoryFilter = searchParams.get('cat');

  useEffect(() => {
    // Only show PUBLISHED articles on the frontend
    const all = getArticles().filter(a => a.status === ArticleStatus.PUBLISHED);
    if (categoryFilter) {
        setArticles(all.filter(a => a.category === categoryFilter));
    } else {
        setArticles(all);
    }
  }, [categoryFilter]);

  const featured = articles[0];
  // Change slice to take 3 items for the row below (index 1, 2, 3)
  const subFeatured = articles.slice(1, 4);
  const list = articles.slice(4);

  // Mock "Popular" articles by taking a random slice or specific articles
  const popularArticles = articles.length > 0 ? articles.slice(0, 4) : [];

  return (
    <PublicLayout>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Main Content Area (8 cols) */}
        <div className="lg:col-span-8">
          
          {/* Featured Article - Hero */}
          {featured && (
            <Link to={`/article/${featured.id}`} className="block mb-8 group cursor-pointer relative">
               <div className="relative overflow-hidden h-[400px] rounded-lg shadow-sm">
                 <img src={featured.imageUrl} alt={featured.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                 <div className="absolute top-4 left-4 bg-brand-red text-white text-xs font-bold uppercase px-2 py-1">
                    {featured.category}
                 </div>
                 {featured.videoUrl && (
                     <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 text-white rounded-full p-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                     </div>
                 )}
               </div>
               <div className="mt-4">
                   <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 leading-tight group-hover:text-brand-blue transition-colors">
                    {featured.title}
                   </h2>
                   <p className="mt-2 text-gray-600 text-lg leading-relaxed line-clamp-2">
                    {featured.excerpt}
                   </p>
                   <div className="mt-3 flex items-center gap-2">
                      {featured.authorAvatar && (
                          <img src={featured.authorAvatar} alt={featured.authorName} className="w-8 h-8 rounded-full border border-gray-200" />
                      )}
                      <div className="text-xs text-gray-500 uppercase font-bold">
                          Par <span className="text-brand-dark">{featured.authorName}</span> • {new Date(featured.createdAt).toLocaleDateString()}
                      </div>
                   </div>
               </div>
            </Link>
          )}

          {/* Sub Featured Grid - Changed to 3 columns as requested */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-b border-gray-200 py-8 mb-8">
             {subFeatured.map(article => (
                <Link to={`/article/${article.id}`} key={article.id} className="flex flex-col group cursor-pointer">
                    <div className="overflow-hidden h-40 mb-3 relative rounded shadow-sm">
                        <img src={article.imageUrl} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                        <span className="absolute bottom-0 left-0 bg-brand-blue text-white text-xs font-bold px-2 py-1">{article.category}</span>
                    </div>
                    {/* CHANGED: Text red by default, blue on hover */}
                    <h3 className="text-lg font-serif font-bold leading-tight text-brand-red group-hover:text-brand-blue line-clamp-2 transition-colors">
                        {article.title}
                    </h3>
                    <div className="mt-2 text-xs text-gray-400">
                        {new Date(article.createdAt).toLocaleDateString()}
                    </div>
                </Link>
             ))}
          </div>

          {/* Recent List */}
          <div>
            <div className="flex items-center mb-6">
                <h3 className="text-xl font-bold uppercase border-b-4 border-brand-red pb-1 pr-4">Dernières Actualités</h3>
                <div className="flex-1 border-b border-gray-300"></div>
            </div>
            
            <div className="space-y-6">
                {list.length > 0 ? list.map(article => (
                    <Link to={`/article/${article.id}`} key={article.id} className="flex flex-col md:flex-row gap-4 border-b border-gray-100 pb-6 group cursor-pointer">
                        <div className="w-full md:w-1/3 h-40 overflow-hidden relative rounded shadow-sm">
                             <img src={article.imageUrl} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform"/>
                        </div>
                        <div className="w-full md:w-2/3 flex flex-col justify-between">
                            <div>
                                <span className="text-brand-red text-xs font-bold uppercase mb-1 block">{article.category}</span>
                                {/* CHANGED: Text red by default, blue on hover */}
                                <h3 className="text-lg font-bold font-serif text-brand-red group-hover:text-brand-blue transition-colors">
                                    {article.title}
                                </h3>
                                <p className="text-sm text-gray-500 mt-2 line-clamp-2">{article.excerpt}</p>
                            </div>
                            <div className="text-xs text-gray-400 mt-2">
                                {new Date(article.createdAt).toLocaleDateString()}
                            </div>
                        </div>
                    </Link>
                )) : (
                    <p className="text-gray-500 italic">Aucun autre article disponible pour le moment.</p>
                )}
            </div>
          </div>

        </div>

        {/* Sidebar (4 cols) */}
        <div className="lg:col-span-4 space-y-8 pl-0 lg:pl-8 border-l border-transparent lg:border-gray-100">
            
            {/* Widget: Search */}
            <div className="bg-gray-50 p-4 rounded">
                <input type="text" placeholder="Rechercher un article..." className="w-full p-2 border border-gray-300 rounded focus:border-brand-blue outline-none" />
            </div>

            {/* Ad Slot - Dynamic */}
            <div className="w-full flex items-center justify-center">
                <AdDisplay location={AdLocation.SIDEBAR_SQUARE} />
            </div>

            {/* Widget: Most Read (Fixed with Thumbnails) */}
            <div>
                 <div className="flex items-center mb-4">
                    <h3 className="text-lg font-bold uppercase border-l-4 border-brand-blue pl-3">Les plus lus</h3>
                </div>
                <ul className="space-y-4">
                    {popularArticles.map((article, index) => (
                        <li key={article.id} className="flex gap-3 group cursor-pointer border-b border-gray-100 pb-2">
                            <span className="text-3xl font-bold text-gray-200 group-hover:text-brand-red font-serif w-6 flex-shrink-0">{index + 1}</span>
                            <Link to={`/article/${article.id}`} className="flex gap-2 w-full">
                                <img src={article.imageUrl} alt={article.title} className="w-16 h-16 object-cover flex-shrink-0 rounded-sm" />
                                <div>
                                    {/* CHANGED: Text red by default, blue on hover */}
                                    <h4 className="text-sm font-bold leading-tight text-brand-red group-hover:text-brand-blue line-clamp-2 transition-colors">
                                        {article.title}
                                    </h4>
                                    <span className="text-xs text-gray-400 mt-1 block">Il y a 2 heures</span>
                                </div>
                            </Link>
                        </li>
                    ))}
                    {popularArticles.length === 0 && (
                        <li className="text-gray-400 text-sm italic">Aucun article populaire.</li>
                    )}
                </ul>
            </div>

            {/* Widget: Newsletter */}
            <div className="bg-brand-blue text-white p-6 text-center">
                <h3 className="font-serif font-bold text-xl mb-2">Abonnez-vous</h3>
                <p className="text-xs mb-4 text-blue-100">Recevez l'essentiel de l'actualité chaque matin.</p>
                <input type="email" placeholder="Votre email" className="w-full p-2 text-gray-900 text-sm mb-2" />
                <button className="w-full bg-brand-red py-2 font-bold uppercase text-xs tracking-wider hover:bg-red-700 transition-colors">S'inscrire</button>
            </div>

             {/* Ad Slot Skyscraper - Dynamic */}
             <div className="w-full flex items-center justify-center">
                <AdDisplay location={AdLocation.SIDEBAR_SKYSCRAPER} />
            </div>
        </div>

      </div>
    </PublicLayout>
  );
};