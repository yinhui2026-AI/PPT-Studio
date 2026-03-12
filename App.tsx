
import React, { useState, useEffect } from 'react';
import StepInput from './components/StepInput';
import StepOutline from './components/StepOutline';
import StepGeneration from './components/StepGeneration';
import HistorySidebar from './components/HistorySidebar';
import { AppStep, GenerationConfig, SlideContent, HistoryRecord } from './types';
import { generateOutline, generateSlideImage } from './services/geminiService';
import { Layers, Loader2 } from 'lucide-react';

const HISTORY_KEY = 'gemini_ppt_history';

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.API_KEY);
  const [config, setConfig] = useState<GenerationConfig | null>(null);
  const [slides, setSlides] = useState<SlideContent[]>([]);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingKey, setIsCheckingKey] = useState(true);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [customApiKey, setCustomApiKey] = useState('');

  useEffect(() => {
    // Load history from localStorage
    const saved = localStorage.getItem(HISTORY_KEY);
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }

    const savedKey = localStorage.getItem('custom_gemini_api_key');
    if (savedKey) {
      setCustomApiKey(savedKey);
    }

    const checkKey = async () => {
      try {
        const aistudio = (window as any).aistudio;
        if (aistudio && await aistudio.hasSelectedApiKey()) {
          setCurrentStep(AppStep.INPUT);
        } else if (savedKey) {
          setCurrentStep(AppStep.INPUT);
        } else {
          setCurrentStep(AppStep.API_KEY);
        }
      } catch {
        if (savedKey) {
          setCurrentStep(AppStep.INPUT);
        } else {
          setCurrentStep(AppStep.API_KEY);
        }
      } finally {
        setIsCheckingKey(false);
      }
    };
    checkKey();
  }, []);

  const handleSaveCustomKey = () => {
    if (customApiKey.trim()) {
      localStorage.setItem('custom_gemini_api_key', customApiKey.trim());
      setCurrentStep(AppStep.INPUT);
    } else {
      alert("请输入有效的 API Key");
    }
  };

  const saveToHistory = (newSlides: SlideContent[], newConfig: GenerationConfig) => {
    const newRecord: HistoryRecord = {
      id: `hist-${Date.now()}`,
      timestamp: Date.now(),
      config: JSON.parse(JSON.stringify(newConfig)), // Deep clone to preserve state
      slides: newSlides
    };
    
    setHistory(prev => {
      // Avoid duplicate recent entries with same content
      const isDuplicate = prev[0]?.config.sourceText === newConfig.sourceText && 
                          prev[0]?.config.slideCount === newConfig.slideCount;
      
      if (isDuplicate) return prev;

      const updated = [newRecord, ...prev].slice(0, 10);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const deleteHistory = (id: string) => {
    setHistory(prev => {
      const updated = prev.filter(r => r.id !== id);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleSelectHistory = (record: HistoryRecord) => {
    // Fully restore the state
    setConfig(record.config);
    setSlides(record.slides);
    
    // Determine where to resume
    const hasImages = record.slides.some(s => s.generatedImageUrl);
    if (hasImages) {
      setCurrentStep(AppStep.GENERATION);
    } else {
      setCurrentStep(AppStep.OUTLINE);
    }
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      await aistudio.openSelectKey();
      if (currentStep === AppStep.API_KEY) {
        setCurrentStep(AppStep.INPUT);
      }
    } else {
      localStorage.removeItem('custom_gemini_api_key');
      setCustomApiKey('');
      setCurrentStep(AppStep.API_KEY);
    }
  };

  const handleConfigSubmit = async (newConfig: GenerationConfig) => {
    setGlobalError(null);
    setConfig(newConfig);
    setIsLoading(true);
    try {
      const outline = await generateOutline(newConfig.sourceText, newConfig.slideCount, newConfig.style);
      if (outline && outline.length > 0) {
        const newSlides = outline.map(s => ({ ...s, isGenerating: false }));
        setSlides(newSlides);
        setCurrentStep(AppStep.OUTLINE);
        // Save initial outline and the full config (including source text) to history
        saveToHistory(newSlides, newConfig);
      } else {
        throw new Error("大纲内容为空。");
      }
    } catch (error: any) {
      if (error.message?.includes("Requested entity was not found.")) {
        handleSelectKey();
      } else {
        setGlobalError(error.message);
      }
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
      if (slide.generatedImageUrl) continue; 
      updateSlideState(slide.id, { isGenerating: true, error: undefined });
      try {
        const imageUrl = await generateSlideImage(slide, cfg.style, cfg.userImage);
        updateSlideState(slide.id, { isGenerating: false, generatedImageUrl: imageUrl });
      } catch (e: any) {
        if (e.message?.includes("Requested entity was not found.")) {
          handleSelectKey();
          return; // Stop generating further slides
        }
        updateSlideState(slide.id, { isGenerating: false, error: "生成失败" });
      }
    }
    
    // Sync final state (with images) to history
    setSlides(prev => {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (saved) {
        const hist = JSON.parse(saved);
        if (hist.length > 0) {
          hist[0].slides = prev;
          localStorage.setItem(HISTORY_KEY, JSON.stringify(hist));
        }
      }
      return prev;
    });
  };

  const handleUpdateSlide = (id: string, updates: Partial<SlideContent>) => {
    setSlides(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleRegenerateSlide = async (id: string, refinement?: string) => {
    if (!config) return;
    const slide = slides.find(s => s.id === id);
    if (!slide) return;
    
    handleUpdateSlide(id, { isGenerating: true, error: undefined });
    try {
      const imageUrl = await generateSlideImage(slide, config.style, config.userImage, refinement);
      handleUpdateSlide(id, { isGenerating: false, generatedImageUrl: imageUrl });
      
      // Update history sync
      setSlides(current => {
        const saved = localStorage.getItem(HISTORY_KEY);
        if (saved) {
          const hist = JSON.parse(saved);
          // Update the first record if it matches current generation session
          if (hist.length > 0 && hist[0].config.sourceText === config.sourceText) {
            hist[0].slides = current;
            localStorage.setItem(HISTORY_KEY, JSON.stringify(hist));
          }
        }
        return current;
      });
    } catch (e: any) {
      if (e.message?.includes("Requested entity was not found.")) {
        handleSelectKey();
      } else {
        handleUpdateSlide(id, { isGenerating: false, error: "重试失败" });
      }
    }
  };

  if (isCheckingKey) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 text-blue-600 cursor-pointer group" 
            onClick={() => setCurrentStep(AppStep.INPUT)}
          >
            <div className="p-1.5 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
              <Layers className="w-6 h-6" />
            </div>
            <span className="font-bold text-lg tracking-tight">Gemini PPT 工作台</span>
          </div>
          <button 
            onClick={handleSelectKey} 
            className="text-xs font-medium text-slate-400 hover:text-blue-500 transition-colors bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100"
          >
            切换 API Key
          </button>
        </div>
      </header>
      
      {globalError && (
        <div className="max-w-4xl mx-auto mt-4 px-6">
          <div className="bg-red-50 p-4 rounded-xl text-red-800 text-sm border border-red-100 flex items-start gap-3">
             <div className="bg-red-200 p-1 rounded-full mt-0.5">
               <Loader2 className="w-3 h-3 text-red-700" />
             </div>
             {globalError}
          </div>
        </div>
      )}

      <main className="p-6">
        {currentStep === AppStep.API_KEY && (
          <div className="max-w-md mx-auto mt-20 text-center">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Layers className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">欢迎使用 Gemini PPT 工作台</h2>
              <p className="text-slate-500 mb-8">
                本项目使用了高级图像生成模型，需要您选择一个已关联付费项目的 API Key 才能继续使用。
              </p>
              
              {(window as any).aistudio ? (
                <button
                  onClick={handleSelectKey}
                  className="w-full bg-blue-600 text-white font-medium py-3 px-4 rounded-xl hover:bg-blue-700 transition-colors mb-4"
                >
                  选择 API Key
                </button>
              ) : (
                <div className="space-y-4 mb-4">
                  <input
                    type="password"
                    placeholder="请输入您的 Gemini API Key"
                    value={customApiKey}
                    onChange={(e) => setCustomApiKey(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <button
                    onClick={handleSaveCustomKey}
                    className="w-full bg-blue-600 text-white font-medium py-3 px-4 rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    保存并继续
                  </button>
                </div>
              )}

              <p className="mt-4 text-xs text-slate-400">
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">
                  了解如何开启付费项目
                </a>
              </p>
            </div>
          </div>
        )}
        {currentStep === AppStep.INPUT && (
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3">
              <StepInput onNext={handleConfigSubmit} isLoading={isLoading} />
            </div>
            <div className="lg:col-span-1">
              <HistorySidebar 
                records={history} 
                onSelect={handleSelectHistory} 
                onDelete={deleteHistory}
              />
            </div>
          </div>
        )}
        {currentStep === AppStep.OUTLINE && <StepOutline slides={slides} onUpdateSlide={handleUpdateSlide} onNext={handleOutlineConfirm} isLoading={isLoading} />}
        {currentStep === AppStep.GENERATION && <StepGeneration slides={slides} onRegenerate={handleRegenerateSlide} />}
      </main>
    </div>
  );
};

export default App;
