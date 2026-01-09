import React, { useState } from 'react';
import { GenerationConfig, SlideStyle } from '../types';
import { STYLES, MAX_SLIDES, MIN_SLIDES } from '../constants';
import { FileText, Wand2, Upload, Loader2, BrainCircuit } from 'lucide-react';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.mjs';

interface Props {
  onNext: (config: GenerationConfig) => void;
  isLoading: boolean;
}

const StepInput: React.FC<Props> = ({ onNext, isLoading }) => {
  const [text, setText] = useState('');
  const [slideCount, setSlideCount] = useState(5);
  const [selectedStyle, setSelectedStyle] = useState<SlideStyle>(SlideStyle.PROFESSIONAL);
  const [isFileLoading, setIsFileLoading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsFileLoading(true);
    const fileName = file.name.toLowerCase();

    try {
      if (fileName.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setText(result.value);
      } else if (fileName.endsWith('.pdf')) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
          fullText += pageText + "\n";
        }
        setText(fullText);
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          setText(event.target?.result as string);
        };
        reader.readAsText(file);
      }
    } catch (err) {
      console.error("File processing error:", err);
      alert("无法读取该文件。请确保文件未损坏且不带密码保护。");
    } finally {
      setIsFileLoading(false);
      e.target.value = '';
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
        <h1 className="text-4xl font-bold text-slate-800 tracking-tight flex items-center justify-center gap-3">
          AI PPT 工作台
          <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full font-medium">Pro 思考增强版</span>
        </h1>
        <p className="text-slate-500 text-lg">基于 Gemini 3 Pro 深度思考模型，全量保留素材精华。</p>
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
              <label className={`cursor-pointer text-sm font-medium flex items-center gap-1 transition-colors ${isFileLoading ? 'text-slate-400' : 'text-blue-600 hover:text-blue-700'}`}>
                {isFileLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    正在解析文件...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    上传 .txt/.md/.docx/.pdf
                    <input 
                      type="file" 
                      accept=".txt,.md,.docx,.pdf" 
                      className="hidden" 
                      onChange={handleFileChange} 
                      disabled={isFileLoading}
                    />
                  </>
                )}
              </label>
            </div>
            <textarea
              className="w-full h-80 p-4 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none bg-slate-50 text-slate-800 text-sm"
              placeholder="请在此粘贴您的报告、文章或笔记内容。我们将使用 Gemini 3 Pro 深度分析模型为您提取核心逻辑..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="mt-2 flex justify-between items-center">
              <div className="text-[10px] text-slate-400">
                支持直接读取 Word 和 PDF 格式
              </div>
              <div className="text-xs text-slate-400">
                已输入 {text.length} 字
              </div>
            </div>
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
              disabled={!text.trim() || isLoading || isFileLoading}
              className={`w-full py-4 rounded-lg flex flex-col items-center justify-center gap-1 font-semibold text-white transition-all transform active:scale-95 ${
                !text.trim() || isLoading || isFileLoading
                  ? 'bg-slate-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <BrainCircuit className="w-5 h-5 animate-pulse" />
                  <span>深度思考解析中...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Wand2 className="w-5 h-5" />
                  <span>生成深度 PPT 大纲</span>
                </div>
              )}
              {isLoading && <span className="text-[10px] font-normal opacity-80">Pro 模型正在推演内容逻辑...</span>}
            </button>

          </div>
        </div>
      </div>
    </div>
  );
};

export default StepInput;
