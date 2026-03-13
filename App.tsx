
import React, { useState, useEffect } from 'react';
import StepInput from './components/StepInput';
import StepOutline from './components/StepOutline';
import StepGeneration from './components/StepGeneration';
import HistorySidebar from './components/HistorySidebar';
import { AppStep, GenerationConfig, SlideContent, HistoryRecord } from './types';
import { generateOutline, generateSlideImage } from './services/geminiService';
import { Layers, Loader2, Clock } from 'lucide-react';

const HISTORY_KEY = 'gemini_ppt_history';

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.INPUT);
  const [config, setConfig] = useState<GenerationConfig | null>(null);
  const [slides, setSlides] = useState<SlideContent[]>([]);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingKey, setIsCheckingKey] = useState(false);
  const [pptFilename, setPptFilename] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [isKeyPopoverOpen, setIsKeyPopoverOpen] = useState(false);

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
  }, []);

  const handleSaveCustomKey = (key: string) => {
    const trimmedKey = key.trim();
    setCustomApiKey(trimmedKey);
    if (trimmedKey) {
      localStorage.setItem('custom_gemini_api_key', trimmedKey);
    } else {
      localStorage.removeItem('custom_gemini_api_key');
    }
  };

  const safeSaveToLocalStorage = (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error("Failed to save to localStorage", e);
      if (e instanceof Error && e.name === 'QuotaExceededError') {
        setGlobalError("本地存储空间不足，部分历史记录可能未保存。建议清理任务历史。");
      }
    }
  };

  const saveToHistory = (newSlides: SlideContent[], newConfig: GenerationConfig, pptFilename?: string) => {
    const lightweightSlides = newSlides.map(s => ({ ...s, generatedImageUrl: undefined }));
    const newRecord: HistoryRecord = {
      id: `hist-${Date.now()}`,
      timestamp: Date.now(),
      config: JSON.parse(JSON.stringify(newConfig)), // Deep clone to preserve state
      slides: lightweightSlides,
      pptFilename
    };
    
    setHistory(prev => {
      // Avoid duplicate recent entries with same content
      const isDuplicate = prev[0]?.config.sourceText === newConfig.sourceText && 
                          prev[0]?.config.slideCount === newConfig.slideCount;
      
      if (isDuplicate) return prev;

      const updated = [newRecord, ...prev].slice(0, 10);
      safeSaveToLocalStorage(HISTORY_KEY, updated);
      return updated;
    });
  };

  const deleteHistory = (id: string) => {
    setHistory(prev => {
      const updated = prev.filter(r => r.id !== id);
      safeSaveToLocalStorage(HISTORY_KEY, updated);
      return updated;
    });
  };

  const handleSelectHistory = (record: HistoryRecord) => {
    // Fully restore the state
    setConfig(record.config);
    setSlides(record.slides);
    setPptFilename(record.pptFilename || null);
    
    setCurrentStep(AppStep.OUTLINE);
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      await aistudio.openSelectKey();
    } else {
      setIsKeyPopoverOpen(true);
    }
  };

  const activeKey = customApiKey || (process.env.API_KEY as string) || "";

  const syncPptToServer = async (currentSlides: SlideContent[]) => {
    try {
      const response = await fetch('/api/save-ppt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          outline: currentSlides, 
          title: currentSlides[0]?.title || "presentation" 
        })
      });
      const data = await response.json();
      if (data.success) {
        setPptFilename(data.filename);
        setHistory(prev => {
          const updated = [...prev];
          if (updated.length > 0) {
            updated[0].pptFilename = data.filename;
            safeSaveToLocalStorage(HISTORY_KEY, updated);
          }
          return updated;
        });
      }
    } catch (e) {
      console.error("Failed to save PPT to server", e);
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
    let finalSlides = [...currentSlides];
    const updateSlideState = (id: string, updates: Partial<SlideContent>) => {
      finalSlides = finalSlides.map(s => s.id === id ? { ...s, ...updates } : s);
      setSlides(finalSlides);
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
        let errorMsg = "生成失败";
        if (e.message?.includes("PERMISSION_DENIED") || e.message?.includes("403")) {
          errorMsg = "权限不足 (403): 图片生成需要关联付费账单的 API Key。";
        }
        updateSlideState(slide.id, { isGenerating: false, error: errorMsg });
      }
    }
    
    // Sync final state (with images) to history
    setSlides(prev => {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (saved) {
        try {
          const hist = JSON.parse(saved);
          if (hist.length > 0) {
            hist[0].slides = prev.map(s => ({ ...s, generatedImageUrl: undefined }));
            safeSaveToLocalStorage(HISTORY_KEY, hist);
          }
        } catch (e) {
          console.error("Failed to sync slides to history", e);
        }
      }
      return prev;
    });

    // Save PPT to server with images
    await syncPptToServer(finalSlides);
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
      
      let updatedSlides: SlideContent[] = [];
      // Update history sync
      setSlides(current => {
        updatedSlides = current.map(s => s.id === id ? { ...s, isGenerating: false, generatedImageUrl: imageUrl } : s);
        const saved = localStorage.getItem(HISTORY_KEY);
        if (saved) {
          try {
            const hist = JSON.parse(saved);
            // Update the first record if it matches current generation session
            if (hist.length > 0 && hist[0].config.sourceText === config.sourceText) {
              hist[0].slides = updatedSlides.map(s => ({ ...s, generatedImageUrl: undefined }));
              safeSaveToLocalStorage(HISTORY_KEY, hist);
            }
          } catch (e) {
            console.error("Failed to sync regenerated slide to history", e);
          }
        }
        return updatedSlides;
      });

      // Save updated PPT to server
      await syncPptToServer(updatedSlides);
    } catch (e: any) {
      if (e.message?.includes("Requested entity was not found.")) {
        handleSelectKey();
      } else {
        let errorMsg = "重试失败";
        if (e.message?.includes("PERMISSION_DENIED") || e.message?.includes("403")) {
          errorMsg = "权限不足 (403): 图片生成需要关联付费账单的 API Key。";
        }
        handleUpdateSlide(id, { isGenerating: false, error: errorMsg });
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
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
            >
              <Clock className="w-4 h-4" />
              任务历史
            </button>
          </div>
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
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className={`${showHistory ? 'lg:col-span-3' : 'lg:col-span-4'} transition-all duration-300`}>
            {currentStep === AppStep.INPUT && <StepInput onNext={handleConfigSubmit} isLoading={isLoading} />}
            {currentStep === AppStep.OUTLINE && <StepOutline slides={slides} onUpdateSlide={handleUpdateSlide} onNext={handleOutlineConfirm} isLoading={isLoading} />}
            {currentStep === AppStep.GENERATION && <StepGeneration slides={slides} onRegenerate={handleRegenerateSlide} pptFilename={pptFilename} />}
          </div>
          {showHistory && (
            <div className="lg:col-span-1 animate-in slide-in-from-right duration-300">
              <HistorySidebar 
                records={history} 
                onSelect={(record) => {
                  handleSelectHistory(record);
                  setShowHistory(false);
                }} 
                onDelete={deleteHistory}
              />
            </div>
          )}
        </div>
      </main>

      {/* Floating API Key Button */}
      <div className="fixed bottom-6 right-6 flex flex-col items-end gap-2 z-[100]">
        {isKeyPopoverOpen && (
          <div className="bg-white p-4 rounded-2xl shadow-2xl border border-slate-200 w-72 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <h4 className="text-sm font-bold text-slate-800 mb-3">设置 API Key</h4>
            <div className="space-y-3">
              <input
                type="password"
                placeholder="在此粘贴您的 API Key"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={customApiKey}
                onChange={(e) => handleSaveCustomKey(e.target.value)}
              />
              <div className="flex gap-2">
                <button 
                  onClick={async () => {
                    const aistudio = (window as any).aistudio;
                    if (aistudio) await aistudio.openSelectKey();
                    setIsKeyPopoverOpen(false);
                  }}
                  className="flex-1 text-[11px] bg-slate-50 hover:bg-slate-100 text-slate-600 py-1.5 rounded-md border border-slate-100 transition-colors"
                >
                  使用平台选择器
                </button>
                <button 
                  onClick={() => setIsKeyPopoverOpen(false)}
                  className="px-3 text-[11px] bg-blue-600 text-white py-1.5 rounded-md hover:bg-blue-700 transition-colors"
                >
                  确定
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                Key 将保存在浏览器本地，仅用于当前应用。
              </p>
            </div>
          </div>
        )}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={() => setIsKeyPopoverOpen(!isKeyPopoverOpen)}
            className="bg-white hover:bg-slate-50 text-slate-700 font-medium py-2.5 px-5 rounded-full shadow-xl border border-slate-200 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
          >
            <div className={`w-2 h-2 rounded-full ${activeKey ? 'bg-green-500' : 'bg-amber-500'} animate-pulse`} />
            {isKeyPopoverOpen ? '关闭设置' : '选择 API Key'}
          </button>
          {activeKey && (
            <span className="text-[10px] text-slate-400 font-mono bg-white/80 backdrop-blur px-2 py-0.5 rounded shadow-sm border border-slate-100">
              当前: ...{activeKey.slice(-4)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
