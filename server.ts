import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import PptxGenJS from "pptxgenjs";
import { Storage } from "@google-cloud/storage";

console.log("Server script starting...");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  console.log("Initializing Express application...");
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '100mb' }));

  const storage = new Storage();
  const BUCKET_NAME = "pptgen0313";

  // Gemini API Setup
  const getAiClient = (req: express.Request) => {
    const apiKey = req.headers['x-api-key'] as string || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not found in environment or headers");
    }
    return new GoogleGenAI({ apiKey });
  };

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

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
          const buffer = Buffer.from(part.inlineData.data, 'base64');
          const filename = `img_${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
          const bucket = storage.bucket(BUCKET_NAME);
          const file = bucket.file(`images/${filename}`);
          await file.save(buffer, {
            metadata: { contentType: "image/png" }
          });
          
          imageUrl = `/api/image/${filename}`;
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

  app.get("/api/image/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      const bucket = storage.bucket(BUCKET_NAME);
      const file = bucket.file(`images/${filename}`);

      const [exists] = await file.exists();
      if (!exists) {
        return res.status(404).json({ error: "Image not found" });
      }

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      
      file.createReadStream()
        .on('error', (err) => {
          console.error("Image stream error:", err);
          if (!res.headersSent) {
            res.status(500).json({ error: err.message });
          }
        })
        .pipe(res);
    } catch (error: any) {
      console.error("Image fetch error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message });
      }
    }
  });

  app.post("/api/save-ppt", async (req, res) => {
    try {
      const { outline, title } = req.body;
      if (!outline || !Array.isArray(outline)) {
        return res.status(400).json({ error: "Invalid outline data" });
      }

      const pptx = new PptxGenJS();
      pptx.layout = "LAYOUT_16x9";
      const bucket = storage.bucket(BUCKET_NAME);

      // Add slides
      for (const item of outline) {
        const slide = pptx.addSlide();
        
        if (item.generatedImageUrl) {
          try {
            // Extract filename from our local API URL
            const match = item.generatedImageUrl.match(/\/api\/image\/(img_[^?]+)/);
            if (match) {
              const filename = `images/${match[1]}`;
              const file = bucket.file(filename);
              const [buffer] = await file.download();
              const base64 = `data:image/png;base64,${buffer.toString('base64')}`;
              slide.addImage({ data: base64, x: 0, y: 0, w: "100%", h: "100%" });
            } else if (item.generatedImageUrl.startsWith('data:image')) {
              // Fallback for old base64 data
              slide.addImage({ data: item.generatedImageUrl, x: 0, y: 0, w: "100%", h: "100%" });
            } else {
              // Fallback to URL path
              slide.addImage({ path: item.generatedImageUrl, x: 0, y: 0, w: "100%", h: "100%" });
            }
          } catch (imgErr) {
            console.error("Failed to embed image:", imgErr);
            slide.addText("Image failed to load", { x: 0.5, y: 0.5, w: "90%", fontSize: 24, color: "FF0000" });
          }
        } else {
          slide.addText(item.title || "Untitled Slide", {
            x: 0.5,
            y: 0.5,
            w: "90%",
            fontSize: 24,
            bold: true,
            color: "363636",
          });

          if (item.bulletPoints && Array.isArray(item.bulletPoints)) {
            slide.addText(item.bulletPoints.map((p: string) => `• ${p}`).join("\n"), {
              x: 0.5,
              y: 1.2,
              w: "90%",
              fontSize: 14,
              color: "666666",
            });
          }
        }
      }

      const buffer = await pptx.write({ outputType: "nodebuffer" }) as Buffer;
      const timestamp = new Date().getTime();
      const safeTitle = (title || "presentation").replace(/[^a-z0-9]/gi, "_").toLowerCase();
      const filename = `ppt_${timestamp}_${safeTitle}.pptx`;

      const file = bucket.file(filename);

      await file.save(buffer, {
        metadata: {
          contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        },
      });

      // Cleanup: keep only last 10
      const [files] = await bucket.getFiles();
      const sortedFiles = files.sort((a, b) => {
        const timeA = parseInt(a.name.split("_")[1]) || 0;
        const timeB = parseInt(b.name.split("_")[1]) || 0;
        return timeB - timeA;
      });

      if (sortedFiles.length > 10) {
        const filesToDelete = sortedFiles.slice(10);
        await Promise.all(filesToDelete.map(f => f.delete()));
      }

      res.json({ success: true, filename });
    } catch (error: any) {
      console.error("PPT save error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/list-history", async (req, res) => {
    try {
      const bucket = storage.bucket(BUCKET_NAME);
      const [files] = await bucket.getFiles();
      
      const history = files
        .map(f => ({
          name: f.name,
          created: parseInt(f.name.split("_")[1]) || 0,
          url: `/api/download-ppt/${f.name}`
        }))
        .sort((a, b) => b.created - a.created)
        .slice(0, 10);

      res.json(history);
    } catch (error: any) {
      console.error("List history error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/download-ppt/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      const bucket = storage.bucket(BUCKET_NAME);
      const file = bucket.file(filename);

      const [exists] = await file.exists();
      if (!exists) {
        return res.status(404).json({ error: "File not found" });
      }

      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
      
      file.createReadStream()
        .on('error', (err) => {
          console.error("Stream error:", err);
          if (!res.headersSent) {
            res.status(500).json({ error: err.message });
          }
        })
        .pipe(res);
    } catch (error: any) {
      console.error("Download error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message });
      }
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
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
    console.log(`>>> Server is listening on 0.0.0.0:${PORT}`);
    console.log(`>>> NODE_ENV: ${process.env.NODE_ENV}`);
  });
}

startServer().catch(err => {
  console.error("CRITICAL: Failed to start server:", err);
  process.exit(1);
});
