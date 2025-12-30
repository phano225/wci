import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('❌ Erreur: Clés Supabase manquantes dans .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkSchema() {
    console.log('🔍 Vérification de la structure de la base de données...');

    // Liste des tables à vérifier
    const tables = ['articles', 'categories', 'users', 'videos', 'social_links', 'messages'];
    const missingTables = [];

    for (const table of tables) {
        // On essaie de lire 1 ligne (même s'il n'y en a pas, si pas d'erreur, la table existe)
        const { error } = await supabase.from(table).select('id').limit(1);
        
        if (error) {
            // Code 42P01 = relation does not exist (PostgreSQL)
            // Mais l'API Supabase retourne souvent juste un message
            if (error.code === '42P01' || error.message.includes('does not exist')) {
                console.log(`❌ Table manquante : ${table}`);
                missingTables.push(table);
            } else {
                console.log(`⚠️ Erreur d'accès à ${table}:`, error.message);
                // On suppose qu'elle existe mais qu'il y a un autre souci (RLS ou autre)
                // Avec service_role, on devrait tout voir.
            }
        } else {
            console.log(`✅ Table présente : ${table}`);
        }
    }

    if (missingTables.length > 0) {
        console.log('\n⚠️ ATTENTION : Ce nouveau projet semble vide.');
        console.log('Vous devez exécuter le script SQL de création des tables.');
    } else {
        console.log('\n✅ Toutes les tables semblent présentes.');
    }
}

checkSchema();
