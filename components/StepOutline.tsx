import React from 'react';
import { SlideContent } from '../types';
import { Edit2, CheckCircle, ArrowRight, List } from 'lucide-react';

interface Props {
  slides: SlideContent[];
  onUpdateSlide: (id: string, updates: Partial<SlideContent>) => void;
  onNext: () => void;
  isLoading: boolean;
}

const StepOutline: React.FC<Props> = ({ slides, onUpdateSlide, onNext, isLoading }) => {
  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200 sticky top-4 z-10">
        <div>
          <h2 className="text-xl font-bold text-slate-800">审核深度大纲</h2>
          <p className="text-sm text-slate-500">Gemini 3 Pro 已为您提取了核心论点和数据细节。</p>
        </div>
        <button
          onClick={onNext}
          disabled={isLoading}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          {isLoading ? '处理中...' : (
            <>
              确认内容并绘制幻灯片
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {slides.map((slide) => (
          <div key={slide.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center gap-3">
              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded">
                P{slide.pageNumber}
              </span>
              <input 
                type="text" 
                value={slide.title}
                onChange={(e) => onUpdateSlide(slide.id, { title: e.target.value })}
                className="bg-transparent border-none focus:ring-0 font-bold text-slate-800 flex-1"
                placeholder="幻灯片标题"
              />
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Content Column */}
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 block flex items-center gap-2">
                  <List className="w-3 h-3" />
                  深度内容要点
                </label>
                <div className="space-y-4">
                  {slide.bulletPoints.map((bp, idx) => (
                    <div key={idx} className="flex gap-2 group">
                      <span className="text-blue-400 font-bold mt-1.5">•</span>
                      <textarea
                        className="w-full text-sm text-slate-600 border-b border-slate-100 focus:border-blue-300 focus:outline-none bg-transparent resize-none overflow-hidden py-1"
                        rows={2}
                        value={bp}
                        onChange={(e) => {
                          const newPoints = [...slide.bulletPoints];
                          newPoints[idx] = e.target.value;
                          onUpdateSlide(slide.id, { bulletPoints: newPoints });
                        }}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = 'auto';
                          target.style.height = target.scrollHeight + 'px';
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Visual Prompt Column */}
              <div>
                <label className="text-xs font-semibold text-purple-500 uppercase tracking-wider mb-4 block flex items-center gap-2">
                  <Edit2 className="w-3 h-3" />
                  背景视觉构思
                </label>
                <textarea
                  className="w-full h-40 p-3 bg-purple-50 border border-purple-100 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-purple-200 outline-none resize-none"
                  value={slide.visualPrompt}
                  onChange={(e) => onUpdateSlide(slide.id, { visualPrompt: e.target.value })}
                />
                <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-1">设计建议</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    当前视觉指令旨在指导 AI 生成高对比度、符合主题氛围的专业演示文稿背景。您可以添加诸如 "minimalist", "infographic style" 等关键词来微调。
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StepOutline;
