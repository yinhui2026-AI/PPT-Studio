
import React, { useState, useEffect } from 'react';
import { SlideContent } from '../types';
import { RefreshCw, Download, Loader2, Clock, Hourglass, AlertCircle, Send } from 'lucide-react';
import { jsPDF } from 'jspdf'; 

interface Props {
  slides: SlideContent[];
  onRegenerate: (slideId: string, refinement?: string) => void;
}

const GeneratingPlaceholder = ({ pageNumber, isOverlay = false, customText }: { pageNumber: number, isOverlay?: boolean, customText?: string }) => {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    const duration = 12000; 
    const interval = 100;
    const increment = 100 / (duration / interval);
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev + (increment * 0.1); 
        if (prev >= 98) return prev;
        return prev + increment;
      });
    }, interval);
    return () => clearInterval(timer);
  }, []);

  const remainingSeconds = Math.max(0, Math.ceil(12 * (1 - Math.min(progress, 100) / 100)));

  return (
    <div className={`w-full h-full flex flex-col items-center justify-center text-white p-6 relative overflow-hidden ${isOverlay ? 'bg-slate-900/90 backdrop-blur-sm' : 'bg-slate-800'}`}>
      <div className="relative z-10 flex flex-col items-center w-full max-w-xs">
        <Loader2 className="w-12 h-12 text-blue-400 animate-spin mb-5" />
        <h3 className="text-xl font-semibold mb-2 text-white tracking-wide">
          {customText || `正在生成第 ${pageNumber} 页`}
        </h3>
        <p className="text-slate-400 text-sm mb-6 text-center font-light">
          Gemini 正在重绘视觉细节...
        </p>
        <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden mb-4">
          <div className="h-full bg-blue-500 transition-all duration-300 ease-linear" style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
        <div className="flex items-center gap-2 text-xs text-blue-200/80 font-medium">
          <Clock className="w-3.5 h-3.5" />
          <span>剩余约 {remainingSeconds} 秒</span>
        </div>
      </div>
    </div>
  );
};

const StepGeneration: React.FC<Props> = ({ slides, onRegenerate }) => {
  const [refinements, setRefinements] = useState<Record<string, string>>({});
  const isAllDone = slides.every(s => !s.isGenerating && s.generatedImageUrl);

  const handleRefine = (id: string) => {
    const text = refinements[id];
    if (!text?.trim()) return;
    onRegenerate(id, text);
    setRefinements(prev => ({ ...prev, [id]: '' })); // Clear input
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1920, 1080] });
    let pagesAdded = 0;
    slides.forEach((slide) => {
      if (slide.generatedImageUrl) {
        if (pagesAdded > 0) doc.addPage();
        doc.addImage(slide.generatedImageUrl, 'PNG', 0, 0, 1920, 1080);
        pagesAdded++;
      }
    });
    doc.save('gemini-presentation.pdf');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200 sticky top-4 z-20">
        <div>
          <h2 className="text-xl font-bold text-slate-800">最终幻灯片生成</h2>
          <p className="text-sm text-slate-500">
            {isAllDone ? "制作完成。如不满意，可在下方输入修改要求重新生成。" : "正在按顺序生成高保真幻灯片..."}
          </p>
        </div>
        <button
          onClick={handleDownloadPDF}
          className="px-6 py-2 rounded-lg font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center gap-2"
        >
          <Download className="w-4 h-4" /> 下载 PDF
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {slides.map((slide) => (
          <div key={slide.id} className="space-y-3">
            <div className="group relative rounded-xl overflow-hidden aspect-video shadow-lg bg-white border border-slate-200">
              {(() => {
                if (slide.error && !slide.isGenerating) {
                  return (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 p-6 text-center">
                      <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
                      <p className="text-red-800 text-sm font-medium">生成失败</p>
                      <button onClick={() => onRegenerate(slide.id)} className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg text-xs">重试</button>
                    </div>
                  );
                }
                else if (slide.isGenerating) {
                  return <GeneratingPlaceholder pageNumber={slide.pageNumber} isOverlay={!!slide.generatedImageUrl} customText={slide.generatedImageUrl ? "正在应用您的修改要求..." : undefined} />;
                }
                else if (slide.generatedImageUrl) {
                  return (
                    <>
                      <img src={slide.generatedImageUrl} alt={slide.title} className="w-full h-full object-cover" />
                      <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md text-white text-xs px-2 py-1 rounded border border-white/10 z-10">
                        P{slide.pageNumber}
                      </div>
                    </>
                  );
                }
                else {
                  return <div className="w-full h-full flex items-center justify-center bg-slate-50"><Hourglass className="text-slate-300" /></div>;
                }
              })()}
            </div>

            {/* Refinement Input */}
            {slide.generatedImageUrl && !slide.isGenerating && (
              <div className="flex gap-2 animate-fade-in">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="输入修改意见 (如: 换成深色背景, 人物放大...)"
                    className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all"
                    value={refinements[slide.id] || ''}
                    onChange={(e) => setRefinements(prev => ({ ...prev, [slide.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && handleRefine(slide.id)}
                  />
                  <button 
                    onClick={() => handleRefine(slide.id)}
                    className="absolute right-2 top-1.5 p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <button 
                  onClick={() => onRegenerate(slide.id)}
                  className="p-2.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl transition-colors shadow-sm"
                  title="完全重新生成"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StepGeneration;
