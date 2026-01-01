import OpenAI from 'openai';

const getClient = () => {
    // Prefer GROK_API_KEY, fallback to API_KEY if it happens to be the Grok one, 
    // but really we expect GROK_API_KEY to be set in .env
    const apiKey = process.env.GROK_API_KEY; 
    
    if (!apiKey) {
        console.warn("GROK_API_KEY is missing. AI features may not work.");
    }

    const isGroq = apiKey?.startsWith('gsk_');
    const baseURL = isGroq ? "https://api.groq.com/openai/v1" : "https://api.x.ai/v1";

    return new OpenAI({
        apiKey: apiKey || 'dummy-key', // Prevent crash on init, fail on request if missing
        baseURL: baseURL,
        dangerouslyAllowBrowser: true 
    });
};

const getModel = () => {
    const apiKey = process.env.GROK_API_KEY;
    const isGroq = apiKey?.startsWith('gsk_');
    return isGroq ? "llama-3.3-70b-versatile" : "grok-beta";
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
