import React, { useState, useEffect } from 'react';
import { SlideContent } from '../types';
import { RefreshCw, Download, Loader2, Clock, Hourglass } from 'lucide-react';
import { jsPDF } from 'jspdf'; 

interface Props {
  slides: SlideContent[];
  onRegenerate: (slideId: string) => void;
}

const GeneratingPlaceholder = ({ pageNumber, isOverlay = false }: { pageNumber: number, isOverlay?: boolean }) => {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    // Estimated time around 12 seconds for high quality generation
    const duration = 12000; 
    const interval = 100;
    const increment = 100 / (duration / interval);

    const timer = setInterval(() => {
      setProgress(prev => {
        // Slow down significantly as we approach 100% to handle network variance
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
      {!isOverlay && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-purple-900/20 animate-pulse"></div>
      )}
      
      <div className="relative z-10 flex flex-col items-center w-full max-w-xs">
        <div className="relative mb-5">
           <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 animate-pulse"></div>
           <Loader2 className="w-12 h-12 text-blue-400 animate-spin relative z-10" />
        </div>
        
        <h3 className="text-xl font-semibold mb-2 text-white tracking-wide">
          正在生成第 {pageNumber} 页
        </h3>
        <p className="text-slate-400 text-sm mb-6 text-center font-light">
          AI 正在构思布局并绘制视觉细节...
        </p>
        
        {/* Progress Bar */}
        <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden mb-4 border border-slate-600/30">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-300 ease-linear shadow-[0_0_10px_rgba(59,130,246,0.5)]"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        
        {/* Time Estimation */}
        <div className="flex items-center gap-2 text-xs text-blue-200/80 font-medium bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
          <Clock className="w-3.5 h-3.5" />
          <span>预计剩余: <span className="text-white font-bold">{remainingSeconds}</span> 秒</span>
        </div>
      </div>
    </div>
  );
};

const WaitingPlaceholder = ({ pageNumber }: { pageNumber: number }) => (
  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-6">
    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
      <Hourglass className="w-5 h-5 text-slate-400" />
    </div>
    <h3 className="text-slate-500 font-medium mb-1">第 {pageNumber} 页</h3>
    <p className="text-slate-400 text-sm">等待生成...</p>
  </div>
);

const StepGeneration: React.FC<Props> = ({ slides, onRegenerate }) => {
  const isAllDone = slides.every(s => !s.isGenerating && s.generatedImageUrl);

  const handleDownloadPDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [1920, 1080] // Standard 16:9 HD resolution
    });

    slides.forEach((slide, index) => {
      if (index > 0) doc.addPage();
      if (slide.generatedImageUrl) {
        doc.addImage(slide.generatedImageUrl, 'PNG', 0, 0, 1920, 1080);
      }
    });

    doc.save('gemini-presentation.pdf');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200 sticky top-4 z-20">
        <div>
          <h2 className="text-xl font-bold text-slate-800">最终幻灯片</h2>
          <p className="text-sm text-slate-500">
            {isAllDone ? "所有页面已制作完成，请检查并下载。" : "正在按顺序生成高保真幻灯片..."}
          </p>
        </div>
        <button
          onClick={handleDownloadPDF}
          disabled={!isAllDone}
          className={`px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
            isAllDone 
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20' 
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          <Download className="w-4 h-4" />
          下载 PDF 文件
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {slides.map((slide) => (
          <div key={slide.id} className="group relative rounded-xl overflow-hidden aspect-video shadow-lg bg-white">
            
            {/* Logic for content display */}
            {(() => {
              // Case 1: Regenerating (Has image but is generating)
              if (slide.generatedImageUrl && slide.isGenerating) {
                return (
                  <>
                    <img 
                      src={slide.generatedImageUrl} 
                      alt={slide.title} 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 z-20">
                      <GeneratingPlaceholder pageNumber={slide.pageNumber} isOverlay={true} />
                    </div>
                  </>
                );
              }
              // Case 2: Generating (No image, generating)
              else if (slide.isGenerating) {
                return <GeneratingPlaceholder pageNumber={slide.pageNumber} />;
              }
              // Case 3: Done (Has image, not generating)
              else if (slide.generatedImageUrl) {
                return (
                  <>
                     <img 
                      src={slide.generatedImageUrl} 
                      alt={slide.title} 
                      className="w-full h-full object-cover"
                    />
                    {/* Overlay Actions on Hover */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 z-20">
                      <button 
                        onClick={() => onRegenerate(slide.id)}
                        className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 text-sm font-medium transition-colors border border-white/20"
                      >
                        <RefreshCw className="w-4 h-4" />
                        重新生成
                      </button>
                      <a 
                        href={slide.generatedImageUrl} 
                        download={`slide-${slide.pageNumber}.png`}
                        className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 text-sm font-medium transition-colors border border-white/20"
                      >
                        <Download className="w-4 h-4" />
                        保存图片
                      </a>
                    </div>
                    {/* Page Label */}
                    <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md text-white text-xs px-2 py-1 rounded border border-white/10 z-10">
                      第 {slide.pageNumber} 页
                    </div>
                  </>
                );
              }
              // Case 4: Waiting (No image, not generating)
              else {
                return <WaitingPlaceholder pageNumber={slide.pageNumber} />;
              }
            })()}

          </div>
        ))}
      </div>
    </div>
  );
};

export default StepGeneration;