import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ParsedSession } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const responseSchema: Schema = {
  type: Type.ARRAY,
  description: "A list of sessions identified in the PDF with detailed metadata about callers and receivers.",
  items: {
    type: Type.OBJECT,
    properties: {
      target: { type: Type.STRING, description: "The main monitored target number (Alvo) of the file." },
      
      sourceNumber: { type: Type.STRING, description: "The originating phone number (Origem/Chamador)." },
      sourceName: { type: Type.STRING, description: "Name of the caller if available (e.g. from 'Origem: 9123 (Rui)')." },
      
      destinationNumber: { type: Type.STRING, description: "The destination phone number (Destino/Receptor)." },
      destinationName: { type: Type.STRING, description: "Name of the receiver if available." },

      sessionId: { type: Type.STRING, description: "The session ID (ID/Sessão)." },
      date: { type: Type.STRING, description: "Date in DD.MM.YYYY format." },
      startTime: { type: Type.STRING, description: "Start time (HH:mm:ss)." },
      endTime: { type: Type.STRING, description: "End time (HH:mm:ss)." },
      duration: { type: Type.STRING, description: "Duration." },
      type: { type: Type.STRING, enum: ["AUDIO", "SMS"], description: "Type of communication." },
      startPage: { type: Type.INTEGER, description: "Start page number." },
      endPage: { type: Type.INTEGER, description: "End page number." },
      content: { 
        type: Type.STRING, 
        description: "Transcribed text. CRITICAL: Insert '\\n' before every speaker change. Keep speaker names at start of line." 
      },
    },
    required: ["target", "sessionId", "date", "type", "startPage", "endPage", "content"],
  },
};

export const parseDocumentWithGemini = async (base64Data: string, fileName: string): Promise<ParsedSession[]> => {
  try {
    const modelId = "gemini-2.5-flash";

    const prompt = `
      Analise este ficheiro PDF de transcrições legais (Escutas/SMS).
      
      TAREFA:
      1. Identifique cada sessão de comunicação.
      2. **Metadados Cruciais**:
         - **Origem/Source**: Quem liga ou envia a mensagem. Se houver nome associado (ex: "91000 (João)"), extraia o número para 'sourceNumber' e o nome para 'sourceName'.
         - **Destino/Destination**: Quem recebe. Extraia 'destinationNumber' e 'destinationName'.
         - **Alvo/Target**: O número sob escuta principal (geralmente indicado no cabeçalho do documento).
      
      3. **Conteúdo**:
         - Extraia o diálogo.
         - **Formatação**: Cada intervenção deve estar numa nova linha.
         - Mantenha o identificador do orador (ex: "Alvo:", "H:", "Rui:") no início da linha.
      
      Retorne JSON estrito.
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "application/pdf",
                data: base64Data
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.0,
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text) as ParsedSession[];
      // Enrich with source filename
      return data.map(item => ({...item, sourceFileName: fileName}));
    } else {
      throw new Error("No response text received from Gemini.");
    }

  } catch (error) {
    console.error("Error analyzing PDF with Gemini:", error);
    throw error;
  }
};