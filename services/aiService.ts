
import { GoogleGenAI } from "@google/genai";

export const generateSEOMeta = async (title: string, content: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Génère un résumé court et accrocheur pour cet article.
      Titre : ${title}
      Contenu : ${content.substring(0, 1000)}`,
      config: {
        systemInstruction: "Tu es un rédacteur web. Retourne uniquement le résumé en une ou deux phrases maximum, sans fioritures.",
      }
    });
    return response.text || "";
  } catch (error) {
    console.error("AI Error:", error);
    return "Erreur lors de la génération du résumé.";
  }
};

export const generateArticleDraft = async (title: string, category: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Rédige un article journalistique complet en français sur le sujet : "${title}" (Rubrique: ${category}).`,
      config: {
        systemInstruction: "Journaliste professionnel. Style informatif, structuré avec des paragraphes. Utilise des balises <p> pour les paragraphes et <h2> pour les sous-titres.",
      }
    });
    return response.text || "";
  } catch (error) {
    console.error("AI Error:", error);
    return "Impossible de générer le brouillon.";
  }
};
