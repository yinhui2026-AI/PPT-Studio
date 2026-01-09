
import { GoogleGenAI, Type } from "@google/genai";
import { SlideContent, SlideStyle } from '../types';
import { STYLES } from '../constants';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found. Please select an API Key first.");
  return new GoogleGenAI({ apiKey });
};

/**
 * Generates a high-depth PPT outline.
 * Implements a tiered fallback strategy:
 * 1. Gemini 3 Pro with Thinking (Best Quality)
 * 2. Gemini 3 Pro without Thinking (Robust Quality)
 * 3. Gemini 3 Flash (High Reliability/Speed)
 */
export const generateOutline = async (
  text: string,
  count: number,
  style: SlideStyle
): Promise<Omit<SlideContent, 'isGenerating'>[]> => {
  const ai = getClient();
  const styleDef = STYLES.find(s => s.id === style);

  // Keep a healthy amount of context (approx 25k chars)
  const truncatedText = text.length > 25000 ? text.substring(0, 25000) + "..." : text;

  const prompt = `
    你是一位顶尖的策略咨询顾问。基于提供的“原始素材”，制作一份深度、专业且全面的 PPT 大纲。
    
    **任务目标**：
    1. 逻辑解构素材，分布到正好 ${count} 页幻灯片中。
    2. 每一页必须包含核心事实、关键数据和逻辑细节。
    3. 每页幻灯片应包含 5-8 个详实的“要点”（Bullet Points）。
    4. 叙事流必须清晰连贯。

    **风格**：${styleDef?.name}。
    
    **技术要求**：
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
        bulletPoints: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING }
        },
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

  // Tier 1: Gemini 3 Pro with Thinking
  try {
    console.log("Tier 1: Gemini 3 Pro (Thinking)...");
    const rawData = await callModel('gemini-3-pro-preview', {
      maxOutputTokens: 16384, // Increased to support more slides
      thinkingConfig: { thinkingBudget: 8192 } 
    });
    return processRawData(rawData);
  } catch (err: any) {
    console.warn("Tier 1 failed (possibly 500 or budget error):", err);
    
    // Tier 2: Gemini 3 Pro (Standard)
    try {
      console.log("Tier 2: Gemini 3 Pro (Standard)...");
      const rawData = await callModel('gemini-3-pro-preview', {
        maxOutputTokens: 12000
      });
      return processRawData(rawData);
    } catch (err2: any) {
      console.warn("Tier 2 failed:", err2);

      // Tier 3: Gemini 3 Flash (Highest reliability)
      try {
        console.log("Tier 3: Gemini 3 Flash...");
        const rawData = await callModel('gemini-3-flash-preview', {
          maxOutputTokens: 12000
        });
        return processRawData(rawData);
      } catch (err3: any) {
        console.error("All generation tiers failed:", err3);
        throw new Error(`大纲生成失败。可能原因：API配额不足或服务器繁忙。详情：${err3.message}`);
      }
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
  style: SlideStyle
): Promise<string> => {
  const ai = getClient();
  const styleDef = STYLES.find(s => s.id === style);

  const prompt = `
    ${styleDef?.promptModifier}
    Slide: "${slide.title}"
    Points: ${slide.bulletPoints.join('; ')}
    Visuals: ${slide.visualPrompt}
    MANDATORY: High-quality professional slide layout.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: { aspectRatio: "16:9", imageSize: "1K" }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("No image data");
  } catch (error: any) {
    console.error(`Image error:`, error);
    throw error;
  }
};
