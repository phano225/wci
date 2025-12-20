-- Ajout des colonnes pour le workflow de soumission et révision
ALTER TABLE articles
ADD COLUMN IF NOT EXISTS submitted_by text,
ADD COLUMN IF NOT EXISTS submitted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS submission_status text DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS reviewed_by text,
ADD COLUMN IF NOT EXISTS reviewed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS review_comments text;
