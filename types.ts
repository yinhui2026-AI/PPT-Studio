
export enum AppStep {
  API_KEY = 'API_KEY',
  INPUT = 'INPUT',
  OUTLINE = 'OUTLINE',
  GENERATION = 'GENERATION',
  FINISH = 'FINISH'
}

export enum SlideStyle {
  PROFESSIONAL = 'PROFESSIONAL',
  CARTOON = 'CARTOON',
  OFFICIAL_RED = 'OFFICIAL_RED',
  MINIMALIST = 'MINIMALIST',
  TECH_DARK = 'TECH_DARK'
}

export interface SlideContent {
  id: string;
  pageNumber: number;
  title: string;
  bulletPoints: string[];
  visualPrompt: string; 
  generatedImageUrl?: string;
  isGenerating: boolean;
  error?: string;
}

export interface GenerationConfig {
  sourceText: string;
  slideCount: number;
  style: SlideStyle;
  userImage?: string; // Base64 encoded user image
  customStylePrompt?: string;
}

export interface HistoryRecord {
  id: string;
  timestamp: number;
  config: GenerationConfig;
  slides: SlideContent[];
}

export interface StyleDefinition {
  id: SlideStyle;
  name: string;
  description: string;
  promptModifier: string;
  previewColor: string;
}
