import { SlideStyle, StyleDefinition } from './types';
import { Layout, Palette, Briefcase, Zap, Feather } from 'lucide-react';

export const STYLES: StyleDefinition[] = [
  {
    id: SlideStyle.PROFESSIONAL,
    name: '商务专业风格',
    description: '干净、蓝灰色调、结构化布局，适合商务报告。',
    promptModifier: 'Create a professional, high-end corporate presentation slide. Use a clean layout with Sans-Serif typography. Color palette: Deep Blues, Greys, and White. The design should be trustworthy and organized.',
    previewColor: 'bg-blue-600'
  },
  {
    id: SlideStyle.CARTOON,
    name: '卡通趣味风格',
    description: '活泼、插画、有趣，适合创意提案或教育。',
    promptModifier: 'Create a fun, colorful, and illustrative presentation slide. Use a cartoonish 3D or 2D style. Vibrant colors, rounded shapes, and playful typography. Make it engaging and lively.',
    previewColor: 'bg-orange-500'
  },
  {
    id: SlideStyle.OFFICIAL_RED,
    name: '党政红白风格',
    description: '正式、权威，红金配色，适合政府或正式汇报。',
    promptModifier: 'Create a formal, authoritative presentation slide. Style: "Party and Government" aesthetic. Primary colors: Red, Gold, and White. Use strong, bold typography. The design should be solemn, grand, and rigorous.',
    previewColor: 'bg-red-700'
  },
  {
    id: SlideStyle.TECH_DARK,
    name: '深色科技风格',
    description: '未来感、深色模式、霓虹点缀，适合软硬件产品发布。',
    promptModifier: 'Create a futuristic technology presentation slide. Dark mode background (black/dark slate). Neon accents (cyan, purple). Sleek, modern grid layouts. Tech-inspired typography.',
    previewColor: 'bg-slate-900'
  },
  {
    id: SlideStyle.MINIMALIST,
    name: '极简禅意风格',
    description: '大量留白、优雅排版、简单视觉，适合高端展示。',
    promptModifier: 'Create an ultra-minimalist presentation slide. High fashion or architectural aesthetic. Lots of whitespace. Elegant, thin typography. Muted, pastel, or monochrome earth tones. Sophisticated simplicity.',
    previewColor: 'bg-stone-400'
  }
];

export const MAX_SLIDES = 50;
export const MIN_SLIDES = 1;