-- Script pour ajouter les catégories par défaut
-- Exécutez ce script dans l'éditeur SQL de Supabase pour pré-remplir les catégories.

INSERT INTO categories (id, name, slug) VALUES
('cat_1', 'Politique', 'politique'),
('cat_2', 'Société', 'societe'),
('cat_3', 'Économie', 'economie'),
('cat_4', 'International', 'international'),
('cat_5', 'Sport', 'sport'),
('cat_6', 'Culture', 'culture'),
('cat_7', 'Faits Divers', 'faits-divers'),
('cat_8', 'Edito', 'edito')
ON CONFLICT (id) DO NOTHING;
