import React, { useState } from 'react';
import { GenerationConfig, SlideStyle } from '../types';
import { STYLES, MAX_SLIDES, MIN_SLIDES } from '../constants';
import { FileText, Wand2, Upload } from 'lucide-react';

interface Props {
  onNext: (config: GenerationConfig) => void;
  isLoading: boolean;
}

const StepInput: React.FC<Props> = ({ onNext, isLoading }) => {
  const [text, setText] = useState('');
  const [slideCount, setSlideCount] = useState(5);
  const [selectedStyle, setSelectedStyle] = useState<SlideStyle>(SlideStyle.PROFESSIONAL);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setText(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const handleSubmit = () => {
    if (!text.trim()) return;
    onNext({
      sourceText: text,
      slideCount,
      style: selectedStyle
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-slate-800 tracking-tight">AI PPT 工作台</h1>
        <p className="text-slate-500 text-lg">使用 Gemini 3 Pro 将您的文档转化为精美的演示文稿。</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Input */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-700">
                <FileText className="w-5 h-5" />
                文字素材
              </h2>
              <label className="cursor-pointer text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                <Upload className="w-4 h-4" />
                上传 .txt/.md
                <input type="file" accept=".txt,.md" className="hidden" onChange={handleFileChange} />
              </label>
            </div>
            <textarea
              className="w-full h-64 p-4 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none bg-slate-50 text-slate-800 text-sm"
              placeholder="请在此粘贴您的报告、文章或笔记内容..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
        </div>

        {/* Right Column: Settings */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
            
            {/* Slide Count */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                生成页数: {slideCount} 页
              </label>
              <input
                type="range"
                min={MIN_SLIDES}
                max={MAX_SLIDES}
                value={slideCount}
                onChange={(e) => setSlideCount(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>{MIN_SLIDES}</span>
                <span>{MAX_SLIDES}</span>
              </div>
            </div>

            {/* Style Selection */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                视觉设计风格
              </label>
              <div className="grid grid-cols-1 gap-3">
                {STYLES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStyle(s.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                      selectedStyle === s.id
                        ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex-shrink-0 ${s.previewColor}`} />
                    <div>
                      <div className="text-sm font-medium text-slate-900">{s.name}</div>
                      <div className="text-xs text-slate-500 line-clamp-1">{s.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!text.trim() || isLoading}
              className={`w-full py-4 rounded-lg flex items-center justify-center gap-2 font-semibold text-white transition-all transform active:scale-95 ${
                !text.trim() || isLoading
                  ? 'bg-slate-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20'
              }`}
            >
              {isLoading ? (
                <>处理中...</>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  生成 PPT 大纲
                </>
              )}
            </button>

          </div>
        </div>
      </div>
    </div>
  );
};

export default StepInput;