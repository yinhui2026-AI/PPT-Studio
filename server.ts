import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 8080;

  app.use(express.json({ limit: '50mb' }));

  // Gemini API Setup
  const getAiClient = (req: express.Request) => {
    const apiKey = req.headers['x-api-key'] as string || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not found in environment or headers");
    }
    return new GoogleGenAI({ apiKey });
  };

  // API Routes
  app.post("/api/generate-outline", async (req, res) => {
    try {
      const { prompt, count, styleName } = req.body;
      const ai = getAiClient(req);

      const schema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            bulletPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
            visualPrompt: { type: Type.STRING }
          },
          required: ["title", "bulletPoints", "visualPrompt"],
        }
      };

      const callModel = async (modelName: string, configOverrides: any) => {
        const config = {
          responseMimeType: 'application/json',
          responseSchema: schema,
          systemInstruction: "你是一个专业的PPT架构师。只输出JSON格式内容。",
          ...configOverrides
        };
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [{ parts: [{ text: prompt }] }],
          config
        });
        if (!response.text) throw new Error("Empty response");
        return JSON.parse(response.text.trim());
      };

      let rawData;
      try {
        rawData = await callModel('gemini-3.1-pro-preview', {
          maxOutputTokens: 16384,
          thinkingConfig: { thinkingBudget: 8192 } 
        });
      } catch (err) {
        try {
          rawData = await callModel('gemini-3.1-pro-preview', { maxOutputTokens: 12000 });
        } catch {
          rawData = await callModel('gemini-3-flash-preview', { maxOutputTokens: 12000 });
        }
      }

      res.json(rawData);
    } catch (error: any) {
      console.error("Outline generation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/generate-image", async (req, res) => {
    try {
      const { prompt, userImageBase64 } = req.body;
      const ai = getAiClient(req);

      const parts: any[] = [{ text: prompt }];
      if (userImageBase64) {
        parts.push({
          inlineData: {
            data: userImageBase64.split(',')[1] || userImageBase64,
            mimeType: 'image/jpeg'
          }
        });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: { parts },
        config: {
          imageConfig: { aspectRatio: "16:9", imageSize: "1K" }
        }
      });

      let imageUrl = null;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      if (!imageUrl) throw new Error("No image data returned from model");
      res.json({ imageUrl });
    } catch (error: any) {
      console.error("Image generation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server started on port ${PORT}`);
  });
}

startServer();
