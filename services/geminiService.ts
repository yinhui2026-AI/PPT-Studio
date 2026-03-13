
import { SlideContent, SlideStyle } from '../types';
import { STYLES } from '../constants';

const getHeaders = () => {
  const customKey = localStorage.getItem('custom_gemini_api_key');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (customKey) {
    headers['x-api-key'] = customKey;
  }
  return headers;
};

export const generateOutline = async (
  text: string,
  count: number,
  style: SlideStyle
): Promise<Omit<SlideContent, 'isGenerating'>[]> => {
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

  const response = await fetch('/api/generate-outline', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ prompt, count, styleName: styleDef?.name }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to generate outline");
  }

  const rawData = await response.json();
  return processRawData(rawData);
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
  const styleDef = STYLES.find(s => s.id === style);

  const prompt = `
    ${styleDef?.promptModifier}
    
    TASK: Create a professional slide page.
    TITLE: "${slide.title}"
    BULLET POINTS: ${slide.bulletPoints.join('; ')}
    INITIAL VISUAL CONCEPT: ${slide.visualPrompt}
    
    ${refinement ? `CRITICAL MODIFICATION REQUEST: "${refinement}". Please strictly follow this new user instruction while maintaining the original content and overall professional style.` : ""}
    
    ${userImageBase64 ? "USER PORTRAIT INTEGRATION: I have provided a photo. Identify the person and feature them as the professional speaker or central character. Integrate them naturally into the layout." : ""}
    
    MANDATORY: High-quality professional slide layout, legible Chinese text, aesthetic balance.
  `;

  const response = await fetch('/api/generate-image', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ prompt, userImageBase64 }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to generate image");
  }

  const { imageUrl } = await response.json();
  return imageUrl;
};
