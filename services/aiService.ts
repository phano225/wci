import OpenAI from 'openai';

const getClient = () => {
    // Clé Agnes AI configurée dans .env / Vercel
    const apiKey = import.meta.env.VITE_AGNES_API_KEY;
    const baseURL = "https://apihub.agnes-ai.com/v1";

    return new OpenAI({
        apiKey: apiKey,
        baseURL: baseURL,
        dangerouslyAllowBrowser: true
    });
};

const getModel = () => {
    return "agnes-3.0-flash";
};

export const generateSEOMeta = async (title: string, content: string): Promise<string> => {
  try {
    const openai = getClient();
    const model = getModel();
    
    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: "Tu es un expert SEO et rédacteur web. Ta mission est de créer un 'chapeau' (résumé accrocheur) optimisé pour le référencement (SEO)." },
        { role: "user", content: `Génère un chapeau journalistique court (max 30-40 mots), percutant et optimisé SEO pour cet article. Il doit donner envie de lire la suite.
      Titre : ${title}
      Contexte/Contenu : ${content.substring(0, 1000)}` }
      ],
      temperature: 0.7
    });
    return completion.choices[0].message.content || "";
  } catch (error) {
    console.error("AI Error:", error);
    return "Erreur lors de la génération du résumé. Vérifiez votre clé API.";
  }
};

export const generateArticleDraft = async (title: string, category: string): Promise<string> => {
  try {
    const openai = getClient();
    const model = getModel();

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: "Tu es un journaliste senior. Ton style est factuel, engageant et parfaitement structuré. Tu écris en HTML direct (sans markdown)." },
        { role: "user", content: `Rédige un article d'actualité complet et détaillé en français sur le sujet : "${title}" (Rubrique: ${category}).
        
        Consignes de formatage :
        - Utilise des balises <p> pour les paragraphes.
        - Utilise des balises <h2> pour les sous-titres (au moins 2 ou 3 sous-parties).
        - Si pertinent, utilise <ul>/<li> pour des listes.
        - Pas de titre H1 (le titre est déjà géré).
        - Ton : Journalistique, professionnel, neutre mais captivant.
        - Longueur : Environ 400-600 mots.` }
      ],
      temperature: 0.7
    });
    return completion.choices[0].message.content || "";
  } catch (error) {
    console.error("AI Error:", error);
    return "<p>Impossible de générer le brouillon. Veuillez vérifier la configuration de la clé API.</p>";
  }
};
