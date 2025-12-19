
import { GoogleGenAI } from "@google/genai";

export const generateSEOMeta = async (title: string, content: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Tu es un expert SEO. Génère un résumé accrocheur (max 150 caractères) pour cet article de journal. 
      Titre: ${title}
      Contenu: ${content.substring(0, 1000)}`,
      config: {
        systemInstruction: "Tu génères uniquement le texte du résumé, sans guillemets ni introduction.",
      }
    });
    return response.text || "";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "";
  }
};
