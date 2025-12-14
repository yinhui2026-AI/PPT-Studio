export enum AppStep {
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
  visualPrompt: string; // The instruction for the image model
  generatedImageUrl?: string;
  isGenerating: boolean;
}

export interface GenerationConfig {
  sourceText: string;
  slideCount: number;
  style: SlideStyle;
  customStylePrompt?: string;
}

export interface StyleDefinition {
  id: SlideStyle;
  name: string;
  description: string;
  promptModifier: string;
  previewColor: string;
}