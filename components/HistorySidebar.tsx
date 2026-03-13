
import React from 'react';
import { HistoryRecord } from '../types';
import { Clock, ChevronRight, Trash2, Calendar, FileText, CheckCircle2, Circle, Download } from 'lucide-react';

interface Props {
  records: HistoryRecord[];
  onSelect: (record: HistoryRecord) => void;
  onDelete: (id: string) => void;
}

const HistorySidebar: React.FC<Props> = ({ records, onSelect, onDelete }) => {
  if (records.length === 0) return null;

  const handleDownload = (e: React.MouseEvent, filename: string) => {
    e.stopPropagation();
    window.open(`/api/download-ppt/${filename}`, '_blank');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden sticky top-20">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-500" />
          最近记录 (10)
        </h3>
      </div>
      <div className="divide-y divide-slate-100 max-h-[calc(100vh-200px)] overflow-y-auto">
        {records.map((record) => {
          const isComplete = !!record.pptFilename;
          return (
            <div 
              key={record.id}
              className="group p-4 hover:bg-blue-50/50 transition-colors cursor-pointer relative"
              onClick={() => onSelect(record)}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(record.timestamp).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
                <div className="flex items-center gap-1">
                  {record.pptFilename && (
                    <button
                      onClick={(e) => handleDownload(e, record.pptFilename!)}
                      className="p-1 hover:text-blue-600 text-slate-400 transition-colors"
                      title="下载 PPT"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {isComplete ? (
                    <CheckCircle2 className="w-3 h-3 text-green-500" title="已完成生成" />
                  ) : (
                    <Circle className="w-3 h-3 text-amber-400" title="仅大纲" />
                  )}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(record.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 text-slate-300 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h4 className="text-sm font-semibold text-slate-800 line-clamp-1 mb-1">
                {record.slides[0]?.title || "未命名幻灯片"}
              </h4>

              <div className="flex items-start gap-2 mb-3">
                <FileText className="w-3 h-3 text-slate-300 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-slate-400 line-clamp-2 italic">
                  {record.config.sourceText || "无文字素材内容"}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                    {record.config.slideCount}P
                  </span>
                  <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                    {record.config.style.toLowerCase().replace('_', ' ')}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HistorySidebar;
