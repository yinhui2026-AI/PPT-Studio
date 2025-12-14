import React from 'react';
import { SlideContent } from '../types';
import { Edit2, CheckCircle, ArrowRight } from 'lucide-react';

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
          <h2 className="text-xl font-bold text-slate-800">审核大纲</h2>
          <p className="text-sm text-slate-500">在生成图片前，您可以编辑每页的内容和视觉指令。</p>
        </div>
        <button
          onClick={onNext}
          disabled={isLoading}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          {isLoading ? '处理中...' : (
            <>
              确认并生成图片
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
                第 {slide.pageNumber} 页
              </span>
              <input 
                type="text" 
                value={slide.title}
                onChange={(e) => onUpdateSlide(slide.id, { title: e.target.value })}
                className="bg-transparent border-none focus:ring-0 font-bold text-slate-800 flex-1"
                placeholder="标题"
              />
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Content Column */}
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
                  内容要点
                </label>
                <div className="space-y-2">
                  {slide.bulletPoints.map((bp, idx) => (
                    <div key={idx} className="flex gap-2">
                      <span className="text-slate-400">•</span>
                      <input
                        className="w-full text-sm text-slate-600 border-b border-transparent focus:border-blue-300 focus:outline-none bg-transparent"
                        value={bp}
                        onChange={(e) => {
                          const newPoints = [...slide.bulletPoints];
                          newPoints[idx] = e.target.value;
                          onUpdateSlide(slide.id, { bulletPoints: newPoints });
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Visual Prompt Column */}
              <div>
                <label className="text-xs font-semibold text-purple-500 uppercase tracking-wider mb-2 block flex items-center gap-1">
                  <Edit2 className="w-3 h-3" />
                  视觉指令 (Visual Prompt)
                </label>
                <textarea
                  className="w-full h-32 p-3 bg-purple-50 border border-purple-100 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-purple-200 outline-none resize-none"
                  value={slide.visualPrompt}
                  onChange={(e) => onUpdateSlide(slide.id, { visualPrompt: e.target.value })}
                />
                <p className="text-xs text-slate-400 mt-2">
                  这段文字将指导 Gemini 3 Pro Image 模型生成幻灯片背景。建议使用英文描述布局、画面元素和氛围。
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StepOutline;