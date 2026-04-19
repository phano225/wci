
import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { PublicLayout } from '../components/PublicLayout';
import { getArticleById, getArticles, getVideos, getSocialLinks, getUsers, incrementArticleViews } from '../services/api';
import { Article, ArticleStatus, AdLocation, SocialLink, Video, User } from '../types';
import { AdDisplay } from '../components/AdDisplay';

// Proxy WordPress images to avoid ORB
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

export const ArticlePage = () => {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<Article | undefined>();
  const [related, setRelated] = useState<Article[]>([]);
  const [also, setAlso] = useState<Article[]>([]);
  const [carouselItems, setCarouselItems] = useState<Article[]>([]);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [videos, setVideos] = useState<Video[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [authorProfile, setAuthorProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const queueRef = useRef<SpeechSynthesisUtterance[]>([]);
  const idxRef = useRef(0);

  useEffect(() => {
    const fetchData = async () => {
        if (id) {
            setLoading(true);
            // Incrémentation des vues pour le SEO et les stats
            await incrementArticleViews(id);
            
            const found = await getArticleById(id);
            setArticle(found);
            
            if (found) {
                const all = await getArticles({ status: ArticleStatus.PUBLISHED, limit: 100 });
                const rel = all.filter(a => 
                    a.category === found.category && 
                    a.id !== found.id
                ).slice(0, 3);
                setRelated(rel);
                const others = all.filter(a => a.id !== found.id && a.category !== found.category).slice(0, 3);
                setAlso(rel.length > 0 ? rel : others);
                setCarouselItems(all.filter(a => a.id !== found.id).slice(0, 10));
                const vids = await getVideos();
                setVideos(vids.slice(0, 4));
                const socials = await getSocialLinks();
                setSocialLinks(socials);
                if (found.authorId) {
                  const users = await getUsers();
                  const au = users.find(u => u.id === found.authorId) || null;
                  setAuthorProfile(au);
                } else {
                  setAuthorProfile(null);
                }
            }
            setLoading(false);
        }
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    if (carouselItems.length === 0) return;
    const t = setInterval(() => setCarouselIndex(i => (i + 1) % carouselItems.length), 5000);
    return () => clearInterval(t);
  }, [carouselItems.length]);

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
      queueRef.current = [];
      idxRef.current = 0;
    };
  }, [id]);

  const canTTS = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

  const extractTextFromHtml = (html: string) => {
    const el = document.createElement('div');
    el.innerHTML = html;
    const t = el.textContent || '';
    return t.replace(/\s+/g, ' ').trim();
  };

  const chunkText = (text: string) => {
    const maxLen = 180;
    const sentences = text.split(/(?<=[.!?])\s+/);
    const chunks: string[] = [];
    let acc = '';
    for (const s of sentences) {
      const next = acc ? acc + ' ' + s : s;
      if (next.length <= maxLen) {
        acc = next;
      } else {
        if (acc) chunks.push(acc);
        if (s.length <= maxLen) {
          acc = s;
        } else {
          let rest = s;
          while (rest.length > maxLen) {
            chunks.push(rest.slice(0, maxLen));
            rest = rest.slice(maxLen);
          }
          acc = rest;
        }
      }
    }
    if (acc) chunks.push(acc);
    return chunks;
  };

  const speakNext = () => {
    const i = idxRef.current;
    const q = queueRef.current;
    if (i >= q.length) {
      setIsSpeaking(false);
      setIsPaused(false);
      return;
    }
    const u = q[i];
    u.onend = () => {
      idxRef.current = i + 1;
      speakNext();
    };
    window.speechSynthesis.speak(u);
  };

  const startSpeak = () => {
    if (!article || !canTTS) return;
    const text = `${article.title}. ${extractTextFromHtml(article.content)}`;
    if (!text) return;
    const chunks = chunkText(text);
    queueRef.current = chunks.map(c => {
      const u = new SpeechSynthesisUtterance(c);
      u.lang = 'fr-FR';
      u.rate = 1;
      u.pitch = 1;
      return u;
    });
    idxRef.current = 0;
    setIsSpeaking(true);
    setIsPaused(false);
    speakNext();
  };

  const toggleSpeak = () => {
    if (!canTTS) return;
    if (isSpeaking && !isPaused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    } else if (isSpeaking && isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    } else {
      startSpeak();
    }
  };

  const stopSpeak = () => {
    if (!canTTS) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    queueRef.current = [];
    idxRef.current = 0;
  };

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

  const getAbsoluteUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const shareBaseUrl = `${window.location.origin}/article/${article.id}`;
  const shareOgUrl = `${window.location.origin}/api/og/${article.id}?title=${encodeURIComponent(article.title)}&desc=${encodeURIComponent(article.excerpt || '')}&image=${encodeURIComponent(getAbsoluteUrl(article.imageUrl))}`;
  const shareText = article.title;

  return (
    <PublicLayout>
      {article && (
        <Helmet>
          <title>{`${article.title} | WCI`}</title>
          <meta name="description" content={article.excerpt} />
          
          {/* Open Graph / Facebook */}
          <meta property="og:type" content="article" />
          <meta property="og:url" content={window.location.href} />
          <meta property="og:title" content={article.title} />
          <meta property="og:description" content={article.excerpt} />
          <meta property="og:image" content={getAbsoluteUrl(article.imageUrl)} />
          <meta property="og:image:alt" content={article.title} />

          {/* Twitter */}
          <meta property="twitter:card" content="summary_large_image" />
          <meta property="twitter:url" content={window.location.href} />
          <meta property="twitter:title" content={article.title} />
          <meta property="twitter:description" content={article.excerpt} />
          <meta property="twitter:image" content={getAbsoluteUrl(article.imageUrl)} />

          {/* Schema.org JSON-LD */}
          <script type="application/ld+json">
            {JSON.stringify({
              "@context": "https://schema.org",
              "@type": "NewsArticle",
              "headline": article.title,
              "image": [getAbsoluteUrl(article.imageUrl)],
              "datePublished": article.createdAt,
              "author": [{
                  "@type": "Person",
                  "name": article.authorName || "WCI Rédaction"
              }],
              "publisher": {
                  "@type": "Organization",
                  "name": "WCI",
                  "logo": {
                      "@type": "ImageObject",
                      "url": window.location.origin + "/logo.png"
                  }
              },
              "description": article.excerpt
            })}
          </script>
        </Helmet>
      )}
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
            <h1 className="text-3xl md:text-5xl font-serif font-bold text-gray-900 leading-tight mb-2">
                {article.title}
            </h1>
            <div className="mb-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleSpeak}
                  disabled={!canTTS}
                  className={`${canTTS ? 'bg-brand-blue text-white hover:opacity-90' : 'bg-gray-200 text-gray-400 cursor-not-allowed'} px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest`}
                >
                  {isSpeaking ? (isPaused ? 'Reprendre la lecture' : 'Pause lecture') : 'Écouter l’article'}
                </button>
                {isSpeaking && (
                  <button
                    onClick={stopSpeak}
                    className="px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest bg-gray-100 text-gray-700 hover:bg-gray-200"
                  >
                    Arrêter
                  </button>
                )}
              </div>
            </div>
            
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

            {/* --- À LIRE AUSSI (suggestions au-dessus du contenu) --- */}
            {also.length > 0 && (
              <div className="mb-8 border border-gray-100 rounded-xl p-4">
                <h3 className="font-bold uppercase text-sm text-gray-600 mb-4">À LIRE AUSSI</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {also.map(a => (
                    <Link to={`/article/${a.id}`} key={a.id} className="group block">
                      <div className="h-28 overflow-hidden rounded mb-2">
                        <img src={a.imageUrl} alt={a.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      </div>
                      <div className="text-[10px] font-black uppercase text-brand-red tracking-widest">{a.category}</div>
                      <div className="text-sm font-bold leading-snug text-gray-900 group-hover:text-brand-blue line-clamp-2">{a.title}</div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

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
                         <img 
                           src={resolveImage(article.imageUrl, { w: 1200, h: 600 })} 
                           alt={article.title} 
                           className="w-full h-full object-cover" 
                           referrerPolicy="no-referrer"
                           crossOrigin="anonymous"
                           onError={(e) => { 
                             const img = e.currentTarget as HTMLImageElement; 
                             img.onerror = null; 
                             img.src = 'https://via.placeholder.com/1200x600?text=Image+indisponible'; 
                           }}
                         />
                    </div>
                )}
            </div>

            <div className="prose max-w-none text-gray-800 text-lg leading-relaxed mb-10">
                <div dangerouslySetInnerHTML={{ __html: article.content.replace(/\n/g, '<br/>') }} />
            </div>

            {/* --- Auteur (signature) --- */}
            <div className="flex items-center gap-4 bg-white border border-gray-100 rounded-2xl p-4 mb-8">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                <img
                  src={authorProfile?.avatar || article.authorAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=journalist'}
                  alt={article.authorName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const img = e.currentTarget as HTMLImageElement;
                    img.onerror = null;
                    img.src = 'https://via.placeholder.com/128?text=Auteur';
                  }}
                />
              </div>
              <div>
                <div className="text-sm text-gray-500">Par</div>
                <div className="font-serif text-xl font-bold text-brand-dark">{article.authorName}</div>
                {authorProfile?.role && <div className="text-xs text-gray-400 mt-1">{authorProfile.role === 'EDITOR' ? 'Éditeur' : authorProfile.role === 'CONTRIBUTOR' ? 'Contributeur' : 'Rédaction'}</div>}
              </div>
            </div>

            <div className="border-t border-b border-gray-100 py-6 mb-8">
                <h4 className="font-bold text-gray-600 mb-3 uppercase text-sm">Partager cet article</h4>
                <div className="flex flex-wrap gap-3">
                    <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareOgUrl)}`} target="_blank" rel="noreferrer" className="bg-[#1877F2] text-white px-4 py-2 rounded flex items-center gap-2 font-bold text-sm hover:opacity-90 transition-opacity">
                        Facebook
                    </a>
                    <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + shareOgUrl)}`} target="_blank" rel="noreferrer" className="bg-[#25D366] text-white px-4 py-2 rounded flex items-center gap-2 font-bold text-sm hover:opacity-90 transition-opacity">
                        WhatsApp
                    </a>
                    <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareBaseUrl)}&text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer" className="bg-black text-white px-4 py-2 rounded flex items-center gap-2 font-bold text-sm hover:opacity-80 transition-opacity">
                        X
                    </a>
                </div>
            </div>
        </div>

        <div className="lg:col-span-4 space-y-8 lg:pl-8 lg:border-l lg:border-gray-100">
            {/* Bloc Pub (Carré) */}
            <div className="flex justify-center">
              <AdDisplay location={AdLocation.SIDEBAR_SQUARE} />
            </div>

            {/* Carousel Articles */}
            <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="bg-gray-50 px-4 py-2 text-[11px] font-black uppercase text-gray-500 tracking-widest">Articles à la une</div>
              {carouselItems.length > 0 ? (
                <div className="relative h-64">
                  <Link to={`/article/${carouselItems[carouselIndex].id}`} className="block h-full">
                    <img src={carouselItems[carouselIndex].imageUrl} alt={carouselItems[carouselIndex].title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
                    <span className="absolute top-2 left-2 bg-brand-red text-white text-[10px] font-black uppercase px-2 py-1">{carouselItems[carouselIndex].category}</span>
                    <div className="absolute bottom-0 left-0 p-4">
                      <h4 className="text-white font-serif font-bold leading-tight line-clamp-3">{carouselItems[carouselIndex].title}</h4>
                    </div>
                  </Link>
                  <button onClick={() => setCarouselIndex(i => (i - 1 + carouselItems.length) % carouselItems.length)} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white w-8 h-8 rounded-full flex items-center justify-center">‹</button>
                  <button onClick={() => setCarouselIndex(i => (i + 1) % carouselItems.length)} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white w-8 h-8 rounded-full flex items-center justify-center">›</button>
                </div>
              ) : (
                <div className="p-6 text-center text-gray-400 text-sm">Aucun article disponible.</div>
              )}
            </div>

            {/* Bloc Vidéo (Carré) */}
            <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="bg-gray-50 px-4 py-2 text-[11px] font-black uppercase text-gray-500 tracking-widest">Vidéo</div>
              {videos.length > 0 ? (
                <div className="w-full aspect-square bg-black relative">
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src={`https://www.youtube.com/embed/${videos[0].youtubeId}`}
                    title={videos[0].title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              ) : (
                <div className="p-6 text-center text-gray-400 text-sm">Aucune vidéo</div>
              )}
            </div>

            {/* Réseaux Sociaux */}
            <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="bg-gray-50 px-4 py-2 text-[11px] font-black uppercase text-gray-500 tracking-widest">Suivez-nous</div>
              <div className="grid grid-cols-2 gap-3 p-4">
                {socialLinks.map(s => (
                  <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer" className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-bold ${s.bgColor || 'bg-gray-700'}`}>
                    <i className={s.iconClass}></i>
                    <span className="text-xs uppercase">{s.platform}</span>
                  </a>
                ))}
                {socialLinks.length === 0 && <div className="text-gray-400 text-sm col-span-2">Aucun lien social défini</div>}
              </div>
            </div>

            {/* Bloc Pub (Carré) - Bas */}
            <div className="flex justify-center">
              <AdDisplay location={AdLocation.SIDEBAR_SQUARE} />
            </div>
        </div>

      </div>
    </PublicLayout>
  );
};
