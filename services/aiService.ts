
import { GoogleGenAI } from "@google/genai";

// Fonction pour générer un résumé (chapeau) SEO
export const generateSEOMeta = async (title: string, content: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Tu es un rédacteur en chef expert. Génère un résumé (chapeau) accrocheur et professionnel pour cet article. 
      Titre : ${title}
      Contenu : ${content.substring(0, 1500)}`,
      config: {
        systemInstruction: "Tu es un journaliste de presse écrite. Génère uniquement le texte du chapeau (environ 150-200 caractères), sans guillemets, ni introduction type 'Voici le résumé'.",
      }
    });
    return response.text || "";
  } catch (error) {
    console.error("Gemini Error (Summary):", error);
    return "L'IA est temporairement indisponible. Veuillez rédiger un court résumé manuellement.";
  }
};

// Fonction pour aider à la rédaction d'un article complet
export const generateArticleDraft = async (title: string, category: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Rédige un article de journal complet et structuré en français sur le sujet suivant : "${title}" pour la rubrique "${category}".`,
      config: {
        systemInstruction: "Tu es un journaliste d'investigation de haut niveau. Structure ton article avec des paragraphes clairs. Utilise un ton journalistique sérieux, factuel et informatif. N'inclus pas le titre dans le corps du texte. Retourne uniquement le texte de l'article formatté proprement.",
      }
    });
    return response.text || "";
  } catch (error) {
    console.error("Gemini Error (Draft):", error);
    return "L'IA n'a pas pu générer de brouillon pour le moment. Vérifiez votre connexion ou réessayez.";
  }
};
