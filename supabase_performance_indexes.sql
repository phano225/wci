-- Script pour optimiser les performances de la base de données
-- Exécutez ce script dans l'éditeur SQL de votre tableau de bord Supabase

-- 1. Index pour accélérer le tri par date des articles (très important pour le journal)
CREATE INDEX IF NOT EXISTS idx_articles_createdat_desc ON articles (createdat DESC);

-- 2. Index composite pour les articles publiés (accélère la page d'accueil)
CREATE INDEX IF NOT EXISTS idx_articles_status_createdat ON articles (status, createdat DESC);

-- 3. Index sur les catégories pour filtrer rapidement par rubrique
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles (category);

-- 4. Index sur l'ID de l'auteur (accélère le tableau de bord des contributeurs)
CREATE INDEX IF NOT EXISTS idx_articles_authorid ON articles (authorid);

-- Analyse des tables pour mettre à jour les statistiques de l'optimiseur
ANALYZE articles;
