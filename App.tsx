import React, { useState, useCallback } from 'react';
import StepInput from './components/StepInput';
import StepOutline from './components/StepOutline';
import StepGeneration from './components/StepGeneration';
import { AppStep, GenerationConfig, SlideContent } from './types';
import { generateOutline, generateSlideImage } from './services/geminiService';
import { Layers } from 'lucide-react';

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.INPUT);
  const [config, setConfig] = useState<GenerationConfig | null>(null);
  const [slides, setSlides] = useState<SlideContent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1 -> 2: Generate Outline
  const handleConfigSubmit = async (newConfig: GenerationConfig) => {
    setConfig(newConfig);
    setIsLoading(true);
    try {
      const outline = await generateOutline(newConfig.sourceText, newConfig.slideCount, newConfig.style);
      setSlides(outline.map(s => ({ ...s, isGenerating: false })));
      setCurrentStep(AppStep.OUTLINE);
    } catch (error) {
      alert("大纲生成失败。请检查您的 API Key 并重试。");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2 -> 3: Generate Images
  const handleOutlineConfirm = async () => {
    if (!config) return;
    setCurrentStep(AppStep.GENERATION);
    
    // Trigger generation for all slides sequentially (or small batches) to avoid rate limits
    // For better UX, we'll start them but the UI updates independently
    generateAllSlides(slides, config);
  };

  const generateAllSlides = async (currentSlides: SlideContent[], cfg: GenerationConfig) => {
    // Clone array to update state
    let updatedSlides = [...currentSlides];

    // Helper to update a specific slide in state
    const updateSlideState = (id: string, updates: Partial<SlideContent>) => {
      setSlides(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    // Process sequentially to be safe with rate limits
    for (const slide of currentSlides) {
      updateSlideState(slide.id, { isGenerating: true });
      try {
        const imageUrl = await generateSlideImage(slide, cfg.style);
        updateSlideState(slide.id, { isGenerating: false, generatedImageUrl: imageUrl });
      } catch (e) {
        console.error("Failed to generate slide", slide.id);
        updateSlideState(slide.id, { isGenerating: false }); // Leave as failed/empty
      }
    }
  };

  const handleUpdateSlide = (id: string, updates: Partial<SlideContent>) => {
    setSlides(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleRegenerateSlide = async (id: string) => {
    if (!config) return;
    const slide = slides.find(s => s.id === id);
    if (!slide) return;

    handleUpdateSlide(id, { isGenerating: true });
    try {
      const imageUrl = await generateSlideImage(slide, config.style);
      handleUpdateSlide(id, { isGenerating: false, generatedImageUrl: imageUrl });
    } catch (e) {
      handleUpdateSlide(id, { isGenerating: false });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-600">
            <Layers className="w-6 h-6" />
            <span className="font-bold text-lg tracking-tight">Gemini PPT 工作台</span>
          </div>
          
          {/* Progress Stepper */}
          <div className="hidden md:flex items-center gap-4 text-sm font-medium">
             <div className={`px-3 py-1 rounded-full ${currentStep === AppStep.INPUT ? 'bg-blue-100 text-blue-700' : 'text-slate-400'}`}>1. 输入素材</div>
             <div className="w-8 h-px bg-slate-200"></div>
             <div className={`px-3 py-1 rounded-full ${currentStep === AppStep.OUTLINE ? 'bg-blue-100 text-blue-700' : 'text-slate-400'}`}>2. 审核大纲</div>
             <div className="w-8 h-px bg-slate-200"></div>
             <div className={`px-3 py-1 rounded-full ${currentStep === AppStep.GENERATION ? 'bg-blue-100 text-blue-700' : 'text-slate-400'}`}>3. 生成幻灯片</div>
          </div>

          <div className="w-20"></div> {/* Spacer for balance */}
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {currentStep === AppStep.INPUT && (
          <StepInput onNext={handleConfigSubmit} isLoading={isLoading} />
        )}
        {currentStep === AppStep.OUTLINE && (
          <StepOutline 
            slides={slides} 
            onUpdateSlide={handleUpdateSlide} 
            onNext={handleOutlineConfirm}
            isLoading={isLoading}
          />
        )}
        {currentStep === AppStep.GENERATION && (
          <StepGeneration 
            slides={slides}
            onRegenerate={handleRegenerateSlide}
          />
        )}
      </main>
    </div>
  );
};

export default App;