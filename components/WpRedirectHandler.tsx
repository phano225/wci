import React, { useEffect, useState } from 'react';
import { Navigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '../supabase-config';

// Ce composant intercepte les anciennes URLs WordPress et cherche l'article correspondant
export const WpRedirectHandler = () => {
  const location = useLocation();
  const [redirectId, setRedirectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const findArticle = async () => {
      // 1. Essayer de trouver par ?p=123
      const params = new URLSearchParams(location.search);
      const postId = params.get('p');
      
      // 2. Essayer de trouver par slug dans l'URL (ex: /2026/04/05/mon-super-article/)
      // Le slug est généralement la dernière partie de l'URL
      const pathParts = location.pathname.split('/').filter(Boolean);
      const slug = pathParts[pathParts.length - 1];

      if (!postId && !slug) {
        setLoading(false);
        return;
      }

      try {
        // La méthode la plus robuste est de chercher le titre/slug généré
        // Comme nous n'avons pas stocké le slug exact de WP, on peut utiliser une recherche ILIKE sur le titre 
        // formaté ou chercher l'URL de l'image si elle contient la date.
        // Pour être sûr à 100%, on peut aussi rediriger vers la page d'accueil si non trouvé
        
        let query = supabase.from('articles').select('id').limit(1);
        
        // C'est une approche best-effort. L'idéal aurait été d'importer l'ID WP ou le slug WP.
        // Si on a un slug (ex: "mon-article-titre"), on cherche un article dont le titre y ressemble
        if (slug) {
          const searchTitle = slug.replace(/-/g, ' ').replace(/\d+/g, '').trim();
          if (searchTitle.length > 3) {
            query = query.ilike('title', `%${searchTitle}%`);
          } else {
             setLoading(false); return;
          }
        } else {
          setLoading(false); return;
        }

        const { data, error } = await query;

        if (data && data.length > 0) {
          setRedirectId(data[0].id);
        }
      } catch (e) {
        console.error('Erreur redirection WP:', e);
      }
      setLoading(false);
    };

    findArticle();
  }, [location]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div></div>;
  }

  if (redirectId) {
    return <Navigate to={`/article/${redirectId}`} replace />;
  }

  // Fallback si on ne trouve rien : retour à l'accueil
  return <Navigate to="/" replace />;
};
