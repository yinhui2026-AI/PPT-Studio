
import { GoogleGenAI, Type } from "@google/genai";
import { SlideContent, SlideStyle } from '../types';
import { STYLES } from '../constants';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found. Please select an API Key first.");
  return new GoogleGenAI({ apiKey });
};

export const generateOutline = async (
  text: string,
  count: number,
  style: SlideStyle
): Promise<Omit<SlideContent, 'isGenerating'>[]> => {
  const ai = getClient();
  const styleDef = STYLES.find(s => s.id === style);
  const truncatedText = text.length > 25000 ? text.substring(0, 25000) + "..." : text;

  const prompt = `
    你是一位顶尖的策略咨询顾问。基于提供的“原始素材”，制作一份深度、专业且全面的 PPT 大纲。
    页数：${count}
    风格：${styleDef?.name}。
    
    技术要求：
    - JSON 数组输出。
    - Title & Bullet Points: 中文。
    - Visual Description: 英文（用于生成背景图的指令）。
    
    素材：
    ${truncatedText}
  `;

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

  try {
    const rawData = await callModel('gemini-3-pro-preview', {
      maxOutputTokens: 16384,
      thinkingConfig: { thinkingBudget: 8192 } 
    });
    return processRawData(rawData);
  } catch (err) {
    try {
      const rawData = await callModel('gemini-3-pro-preview', { maxOutputTokens: 12000 });
      return processRawData(rawData);
    } catch {
      const rawData = await callModel('gemini-3-flash-preview', { maxOutputTokens: 12000 });
      return processRawData(rawData);
    }
  }
};

const processRawData = (rawData: any[]): Omit<SlideContent, 'isGenerating'>[] => {
  return rawData.map((item: any, index: number) => ({
    id: `slide-${Date.now()}-${index}`,
    pageNumber: index + 1,
    title: item.title || `Slide ${index + 1}`,
    bulletPoints: Array.isArray(item.bulletPoints) ? item.bulletPoints : [],
    visualPrompt: item.visualPrompt || "Professional background",
  }));
};

export const generateSlideImage = async (
  slide: SlideContent,
  style: SlideStyle,
  userImageBase64?: string,
  refinement?: string
): Promise<string> => {
  const ai = getClient();
  const styleDef = STYLES.find(s => s.id === style);

  const textPart = {
    text: `
      ${styleDef?.promptModifier}
      
      TASK: Create a professional slide page.
      TITLE: "${slide.title}"
      BULLET POINTS: ${slide.bulletPoints.join('; ')}
      INITIAL VISUAL CONCEPT: ${slide.visualPrompt}
      
      ${refinement ? `CRITICAL MODIFICATION REQUEST: "${refinement}". Please strictly follow this new user instruction while maintaining the original content and overall professional style.` : ""}
      
      ${userImageBase64 ? "USER PORTRAIT INTEGRATION: I have provided a photo. Identify the person and feature them as the professional speaker or central character. Integrate them naturally into the layout." : ""}
      
      MANDATORY: High-quality professional slide layout, legible Chinese text, aesthetic balance.
    `
  };

  const parts: any[] = [textPart];
  if (userImageBase64) {
    parts.push({
      inlineData: {
        data: userImageBase64.split(',')[1] || userImageBase64,
        mimeType: 'image/jpeg'
      }
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts },
      config: {
        imageConfig: { aspectRatio: "16:9", imageSize: "1K" }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("No image data");
  } catch (error) {
    console.error(`Image generation error:`, error);
    throw error;
  }
};
