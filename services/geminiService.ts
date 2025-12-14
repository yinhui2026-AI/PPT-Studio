import { GoogleGenAI, Type } from "@google/genai";
import { SlideContent, SlideStyle } from '../types';
import { STYLES } from '../constants';

// Initialize the client
const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");
  return new GoogleGenAI({ apiKey });
};

export const generateOutline = async (
  text: string,
  count: number,
  style: SlideStyle
): Promise<Omit<SlideContent, 'isGenerating'>[]> => {
  const ai = getClient();
  const styleDef = STYLES.find(s => s.id === style);

  const prompt = `
    你是一位专业的演示文稿设计师。
    请分析以下文本内容，并将其拆分为正好 ${count} 页幻灯片。
    对于每一页幻灯片，请提取一个“标题”（Title），3-5个简洁的“要点”（Bullet Points），并编写一段详细的“视觉描述”（Visual Description），供AI图像生成器创建幻灯片背景和布局。
    
    目标风格：${styleDef?.name} (${styleDef?.description})。
    
    **重要要求**：
    1. 幻灯片的“标题”和“要点”必须使用与“源文本”相同的语言（如果源文本是中文，必须生成中文内容）。
    2. “视觉描述”（visualPrompt）必须使用**英文**编写，以便图像模型能更好地理解。描述应包含布局、颜色、意象和氛围。

    源文本：
    ${text.substring(0, 15000)} 
  `;

  // Schema for structured JSON output
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
        visualPrompt: { type: Type.STRING, description: "A detailed description in English of how the slide should look, including layout and imagery, suitable for an image generation model." }
      },
      required: ["title", "bulletPoints", "visualPrompt"]
    }
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
        systemInstruction: "你是一个帮助构建演示文稿内容的助手。请确保输出的JSON格式正确。"
      }
    });

    const rawData = JSON.parse(response.text || '[]');
    
    // Map to our app's internal structure
    return rawData.map((item: any, index: number) => ({
      id: `slide-${Date.now()}-${index}`,
      pageNumber: index + 1,
      title: item.title,
      bulletPoints: item.bulletPoints,
      visualPrompt: item.visualPrompt,
    }));

  } catch (error) {
    console.error("Error generating outline:", error);
    throw error;
  }
};

export const generateSlideImage = async (
  slide: SlideContent,
  style: SlideStyle
): Promise<string> => {
  const ai = getClient();
  const styleDef = STYLES.find(s => s.id === style);

  // Construct a prompt that asks the model to render the text onto the image
  // Gemini 3 Pro Image (Nano Banana Pro) has strong text rendering capabilities.
  const prompt = `
    ${styleDef?.promptModifier}
    
    Specific Content for this slide:
    TITLE: "${slide.title}"
    
    BULLET POINTS (Must be legible and clearly formatted as a list):
    ${slide.bulletPoints.map(bp => `- ${bp}`).join('\n')}
    
    VISUAL CONTEXT:
    ${slide.visualPrompt}
    
    REQUIREMENTS:
    1. The image MUST be a complete 16:9 presentation slide.
    2. The Title and Bullet Points MUST be visible and readable text on the image.
    3. Ensure high contrast between text and background.
    4. Do not include any UI elements (like browser bars), just the slide design.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview', // Nano Banana Pro equivalent
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: "2K" // High quality for PPT
        }
      }
    });

    // Extract image
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data returned");

  } catch (error) {
    console.error(`Error generating image for slide ${slide.pageNumber}:`, error);
    throw error;
  }
};