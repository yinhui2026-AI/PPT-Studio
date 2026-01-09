
import React, { useState, useEffect } from 'react';
import StepInput from './components/StepInput';
import StepOutline from './components/StepOutline';
import StepGeneration from './components/StepGeneration';
import { AppStep, GenerationConfig, SlideContent } from './types';
import { generateOutline, generateSlideImage } from './services/geminiService';
import { Layers, Key, ExternalLink, Loader2, AlertCircle } from 'lucide-react';

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.API_KEY);
  const [config, setConfig] = useState<GenerationConfig | null>(null);
  const [slides, setSlides] = useState<SlideContent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingKey, setIsCheckingKey] = useState(true);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Check for API Key on mount
  useEffect(() => {
    const checkKey = async () => {
      try {
        const aistudio = (window as any).aistudio;
        if (aistudio) {
          const hasKey = await aistudio.hasSelectedApiKey();
          if (hasKey) {
            setCurrentStep(AppStep.INPUT);
          } else {
            setCurrentStep(AppStep.API_KEY);
          }
        } else {
          setCurrentStep(AppStep.INPUT);
        }
      } catch (e) {
        console.error("Error checking API key:", e);
        setCurrentStep(AppStep.INPUT);
      } finally {
        setIsCheckingKey(false);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      try {
        await aistudio.openSelectKey();
        setCurrentStep(AppStep.INPUT); // Assume success per race condition rules
      } catch (e) {
        console.error("Failed to select key:", e);
      }
    }
  };

  const handleConfigSubmit = async (newConfig: GenerationConfig) => {
    setGlobalError(null);
    setConfig(newConfig);
    setIsLoading(true);
    try {
      const outline = await generateOutline(newConfig.sourceText, newConfig.slideCount, newConfig.style);
      if (outline && outline.length > 0) {
        setSlides(outline.map(s => ({ ...s, isGenerating: false })));
        setCurrentStep(AppStep.OUTLINE);
      } else {
        throw new Error("生成大纲内容为空，请尝试更换素材或减少生成页数。");
      }
    } catch (error: any) {
      console.error(error);
      setGlobalError(error.message || "生成大纲时遇到未知错误");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOutlineConfirm = async () => {
    if (!config) return;
    setCurrentStep(AppStep.GENERATION);
    generateAllSlides(slides, config);
  };

  const generateAllSlides = async (currentSlides: SlideContent[], cfg: GenerationConfig) => {
    const updateSlideState = (id: string, updates: Partial<SlideContent>) => {
      setSlides(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    for (const slide of currentSlides) {
      updateSlideState(slide.id, { isGenerating: true, error: undefined });
      try {
        const imageUrl = await generateSlideImage(slide, cfg.style);
        updateSlideState(slide.id, { isGenerating: false, generatedImageUrl: imageUrl });
      } catch (e: any) {
        console.error("Failed to generate slide", slide.id, e);
        updateSlideState(slide.id, { 
          isGenerating: false, 
          error: e.message?.includes("403") ? "API 权限不足，请确认 Key 是否支持 Pro 模型" : "生成幻灯片失败，请重试"
        });
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

    handleUpdateSlide(id, { isGenerating: true, error: undefined });
    try {
      const imageUrl = await generateSlideImage(slide, config.style);
      handleUpdateSlide(id, { isGenerating: false, generatedImageUrl: imageUrl });
    } catch (e: any) {
      handleUpdateSlide(id, { isGenerating: false, error: "重试失败，请检查网络或 Key 权限" });
    }
  };

  if (isCheckingKey) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (currentStep === AppStep.API_KEY) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
            <Key className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">需要 API 授权</h1>
            <p className="text-slate-500 text-sm leading-relaxed">
              请选择一个关联了 Google Cloud 计费项目的 API 密钥。
              <br/>推荐使用 Gemini 3 系列以获得最佳效果。
            </p>
          </div>
          <button
            onClick={handleSelectKey}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg shadow-blue-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            选择 API 密钥
          </button>
          <div className="pt-4 border-t border-slate-100">
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:text-blue-600 flex items-center justify-center gap-1">
              了解 API 计费详情 <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-600">
            <Layers className="w-6 h-6" />
            <span className="font-bold text-lg tracking-tight">Gemini PPT 工作台</span>
          </div>
          <div className="hidden md:flex items-center gap-4 text-sm font-medium">
             <div className={`px-3 py-1 rounded-full ${currentStep === AppStep.INPUT ? 'bg-blue-100 text-blue-700' : 'text-slate-400'}`}>1. 输入素材</div>
             <div className="w-8 h-px bg-slate-200"></div>
             <div className={`px-3 py-1 rounded-full ${currentStep === AppStep.OUTLINE ? 'bg-blue-100 text-blue-700' : 'text-slate-400'}`}>2. 审核大纲</div>
             <div className="w-8 h-px bg-slate-200"></div>
             <div className={`px-3 py-1 rounded-full ${currentStep === AppStep.GENERATION ? 'bg-blue-100 text-blue-700' : 'text-slate-400'}`}>3. 生成幻灯片</div>
          </div>
          <button onClick={handleSelectKey} className="text-xs text-slate-400 hover:text-slate-600 font-medium">切换 Key</button>
        </div>
      </header>

      {globalError && (
        <div className="max-w-4xl mx-auto mt-6 px-6">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-red-800">生成失败</h3>
              <p className="text-xs text-red-600 mt-1 leading-relaxed">{globalError}</p>
              <button 
                onClick={() => setGlobalError(null)} 
                className="mt-2 text-xs font-bold text-red-700 hover:underline"
              >
                关闭提示并重试
              </button>
            </div>
          </div>
        </div>
      )}

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
