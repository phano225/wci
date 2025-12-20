-- Données de test pour Supabase
-- À exécuter dans l'onglet SQL Editor de Supabase APRÈS avoir configuré les RLS

-- Insérer des utilisateurs de test
INSERT INTO users (id, name, email, password, role, avatar) VALUES
('admin-001', 'Administrateur', 'admin@worldcanalinfo.com', 'admin', 'ADMIN', 'https://ui-avatars.com/api/?name=Admin&background=3B82F6&color=fff'),
('editor-001', 'Éditeur', 'editor@worldcanalinfo.com', 'editor', 'EDITOR', 'https://ui-avatars.com/api/?name=Editor&background=10B981&color=fff'),
('contrib-001', 'Contributeur', 'contrib@worldcanalinfo.com', 'contrib', 'CONTRIBUTOR', 'https://ui-avatars.com/api/?name=Contrib&background=F59E0B&color=fff')
ON CONFLICT (id) DO NOTHING;

-- Insérer des catégories de test
INSERT INTO categories (id, name, slug) VALUES
('cat-001', 'Actualités', 'actualites'),
('cat-002', 'Économie', 'economie'),
('cat-003', 'Politique', 'politique'),
('cat-004', 'Culture', 'culture')
ON CONFLICT (id) DO NOTHING;

-- Insérer des articles de test
INSERT INTO articles (id, title, excerpt, content, category, imageUrl, authorId, authorName, authorAvatar, status, views, createdAt, updatedAt) VALUES
('article-001', 'Bienvenue sur World Canal Info', 'Découvrez notre nouveau site d''information dédié au canal de Panama et à l''actualité internationale.', '<p>World Canal Info est votre source d''information de référence sur le canal de Panama et les événements mondiaux qui impactent le commerce maritime international.</p><p>Notre équipe de journalistes professionnels vous tient informé 24/7 des dernières actualités.</p>', 'Actualités', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800', 'admin-001', 'Administrateur', 'https://ui-avatars.com/api/?name=Admin&background=3B82F6&color=fff', 'PUBLISHED', 150, NOW(), NOW()),
('article-002', 'Expansion du Canal de Panama', 'Les travaux d''agrandissement du canal de Panama touchent à leur fin. Découvrez les impacts économiques de ce projet majeur.', '<h2>Un projet historique</h2><p>Les travaux d''agrandissement du canal de Panama, commencés en 2007, représentent l''un des plus grands projets d''infrastructure du XXIe siècle.</p><h3>Impacts économiques</h3><p>Cette expansion permettra d''accueillir des navires de plus grande capacité, augmentant ainsi les revenus du canal de manière significative.</p>', 'Économie', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800', 'editor-001', 'Éditeur', 'https://ui-avatars.com/api/?name=Editor&background=10B981&color=fff', 'PUBLISHED', 89, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insérer des publicités de test
INSERT INTO ads (id, title, location, type, content, linkUrl, active) VALUES
('ad-001', 'Publicité Header', 'HEADER_LEADERBOARD', 'IMAGE', 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=1200&h=200&fit=crop', 'https://example.com', true),
('ad-002', 'Sidebar Carré', 'SIDEBAR_SQUARE', 'IMAGE', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=300&fit=crop', 'https://example.com', true)
ON CONFLICT (id) DO NOTHING;