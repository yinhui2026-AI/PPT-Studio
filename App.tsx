import React, { useState, useEffect } from 'react';
import StepInput from './components/StepInput';
import StepOutline from './components/StepOutline';
import StepGeneration from './components/StepGeneration';
import { AppStep, GenerationConfig, SlideContent } from './types';
import { generateOutline, generateSlideImage } from './services/geminiService';
import { Layers, Key, ExternalLink, Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.API_KEY);
  const [config, setConfig] = useState<GenerationConfig | null>(null);
  const [slides, setSlides] = useState<SlideContent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingKey, setIsCheckingKey] = useState(true);

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
          // If not in AI Studio environment, assume env var is set and proceed
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
        // Assume success and proceed, or check again
        const hasKey = await aistudio.hasSelectedApiKey();
        if (hasKey) {
          setCurrentStep(AppStep.INPUT);
        }
      } catch (e) {
        console.error("Failed to select key:", e);
      }
    }
  };

  // Step 1 -> 2: Generate Outline
  const handleConfigSubmit = async (newConfig: GenerationConfig) => {
    setConfig(newConfig);
    setIsLoading(true);
    try {
      const outline = await generateOutline(newConfig.sourceText, newConfig.slideCount, newConfig.style);
      setSlides(outline.map(s => ({ ...s, isGenerating: false })));
      setCurrentStep(AppStep.OUTLINE);
    } catch (error) {
      console.error(error);
      alert("大纲生成失败。请确保您选择了正确的 API Key（支持 Gemini 3 Pro）。");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2 -> 3: Generate Images
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
        
        let errorMessage = e.message || "生成失败";
        if (errorMessage.includes("403") || errorMessage.includes("PERMISSION_DENIED")) {
           errorMessage = "权限不足：请检查 API Key 是否支持该模型或已启用计费。";
        }

        updateSlideState(slide.id, { 
          isGenerating: false, 
          error: errorMessage 
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
       let errorMessage = e.message || "重试失败";
        if (errorMessage.includes("403") || errorMessage.includes("PERMISSION_DENIED")) {
           errorMessage = "权限不足：请重新选择 API Key。";
        }
      handleUpdateSlide(id, { 
        isGenerating: false, 
        error: errorMessage
      });
    }
  };

  // Render API Key Selection Screen
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
              Gemini PPT 工作台使用高性能的 <strong>Gemini 3 Pro</strong> 模型生成图像。
              <br/>
              请选择一个关联了 Google Cloud 计费项目的 API 密钥以继续。
            </p>
          </div>

          <button
            onClick={handleSelectKey}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg shadow-blue-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            选择 API 密钥
          </button>

          <div className="pt-4 border-t border-slate-100">
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:text-blue-600 flex items-center justify-center gap-1 font-medium"
            >
              了解 API 计费详情
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    );
  }

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

          <div className="flex items-center gap-4">
             {/* Re-select key button for troubleshooting */}
             {(window as any).aistudio && (
                <button 
                  onClick={handleSelectKey}
                  className="text-xs text-slate-400 hover:text-slate-600 font-medium"
                >
                  切换 Key
                </button>
             )}
          </div>
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