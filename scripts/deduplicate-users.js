import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function cleanDuplicates() {
  console.log("=== DÉMARRAGE DU NETTOYAGE DES DOUBLONS D'AUTEURS ===");

  // 1. Récupérer les utilisateurs d'authentification pour ne jamais casser un lien d'authentification
  const { data: { users: authUsers }, error: authErr } = await supabase.auth.admin.listUsers();
  if (authErr) {
    console.error("Erreur récupération auth.users:", authErr);
    return;
  }
  const authIdSet = new Set(authUsers.map(u => u.id));
  const authEmailMap = new Map();
  authUsers.forEach(u => {
    if (u.email) authEmailMap.set(u.email.toLowerCase().trim(), u.id);
  });

  // 2. Récupérer tous les utilisateurs de la table publique
  const { data: publicUsers, error: usersErr } = await supabase.from("users").select("*");
  if (usersErr) {
    console.error("Erreur récupération users:", usersErr);
    return;
  }
  console.log(`Nombre total d'utilisateurs avant nettoyage: ${publicUsers.length}`);

  // 3. Compter les articles par auteur
  const { data: articles, error: artErr } = await supabase.from("articles").select("id, authorId");
  if (artErr) {
    console.error("Erreur récupération articles:", artErr);
    return;
  }
  console.log(`Nombre total d'articles analysés: ${articles.length}`);
  const articleCounts = {};
  articles.forEach(a => {
    if (a.authorId) {
      articleCounts[a.authorId] = (articleCounts[a.authorId] || 0) + 1;
    }
  });

  // 4. Grouper par email
  const byEmail = {};
  publicUsers.forEach(u => {
    const emailNorm = (u.email || "").toLowerCase().trim();
    if (!byEmail[emailNorm]) byEmail[emailNorm] = [];
    byEmail[emailNorm].push({
      ...u,
      articlesCount: articleCounts[u.id] || 0,
      isAuth: authIdSet.has(u.id)
    });
  });

  let totalDeleted = 0;
  let articlesReassigned = 0;

  for (const [email, userGroup] of Object.entries(byEmail)) {
    if (userGroup.length <= 1) continue;

    console.log(`\nTraitement du groupe "${email}" (${userGroup.length} doublons) :`);

    // Sélectionner le compte canonique à garder :
    // Priorité 1 : Le compte qui correspond à auth.users.id
    // Priorité 2 : Le compte qui possède le plus d'articles
    // Priorité 3 : Le compte le plus récent
    let canonical = userGroup.find(u => u.isAuth);
    if (!canonical) {
      // Trier par nombre d'articles décroissant, puis par date décroissante
      userGroup.sort((a, b) => {
        if (b.articlesCount !== a.articlesCount) return b.articlesCount - a.articlesCount;
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
      canonical = userGroup[0];
    }

    console.log(`   -> Compte CANONIQUE conservé : ID ${canonical.id} ("${canonical.name}", ${canonical.articlesCount} articles)`);

    const toRemove = userGroup.filter(u => u.id !== canonical.id);

    for (const rem of toRemove) {
      // Si ce compte avait des articles rattachés, les réaffecter au compte canonique
      if (rem.articlesCount > 0) {
        console.log(`   -> Réaffectation de ${rem.articlesCount} articles depuis ID ${rem.id} vers ID ${canonical.id}...`);
        const { error: reassignErr } = await supabase
          .from("articles")
          .update({ authorId: canonical.id })
          .eq("authorId", rem.id);
        if (reassignErr) {
          console.error(`Erreur réaffectation articles pour ${rem.id}:`, reassignErr);
        } else {
          articlesReassigned += rem.articlesCount;
        }
      }

      // Supprimer le compte en doublon
      const { error: delErr } = await supabase
        .from("users")
        .delete()
        .eq("id", rem.id);

      if (delErr) {
        console.error(`   ❌ Erreur suppression doublon ${rem.id}:`, delErr.message);
      } else {
        console.log(`   -> Supprimé doublon ID ${rem.id} ("${rem.name}")`);
        totalDeleted++;
      }
    }
  }

  console.log("\n==========================================");
  console.log(`✅ Doublons supprimés: ${totalDeleted}`);
  console.log(`✅ Articles réaffectés: ${articlesReassigned}`);

  // 5. Vérifier le nombre final d'utilisateurs
  const { data: finalUsers } = await supabase.from("users").select("id, name, email, role");
  console.log(`✅ Nombre d'utilisateurs unique restants : ${finalUsers.length}`);
  console.log("Liste finale des auteurs et administrateurs :");
  finalUsers.forEach((u, i) => {
    console.log(`   ${i + 1}. ${u.name} (${u.email}) [${u.role}] - ID: ${u.id}`);
  });
}

cleanDuplicates().catch(console.error);
