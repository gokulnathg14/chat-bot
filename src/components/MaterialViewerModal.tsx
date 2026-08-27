import React from 'react';
import { X, FileText, CheckCircle, Copy, Check, Trash2, Calendar, BookOpen } from 'lucide-react';
import { StudyMaterial } from '../types';
import { copyToClipboard } from '../lib/safeStorage';

interface MaterialViewerModalProps {
  material: StudyMaterial | null;
  onClose: () => void;
  onToggleActive: (id: string) => void;
  onDelete: (id: string) => void;
}

export const MaterialViewerModal: React.FC<MaterialViewerModalProps> = ({
  material,
  onClose,
  onToggleActive,
  onDelete,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!material) return null;

  const handleCopy = async () => {
    await copyToClipboard(material.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white truncate max-w-md">
                {material.name}
              </h2>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                <span className="uppercase font-semibold tracking-wider text-[10px] px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                  {material.type}
                </span>
                <span>~{material.wordCount.toLocaleString()} words</span>
                <span>•</span>
                <span>{new Date(material.uploadedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs font-medium border border-slate-700"
              title="Copy text"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Topics & Summary if available */}
        {material.topics && material.topics.length > 0 && (
          <div className="px-6 py-2.5 bg-slate-950/40 border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-xs">
            <span className="text-slate-400 font-medium whitespace-nowrap flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" /> Topics:
            </span>
            {material.topics.map((t, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-md bg-indigo-950/60 border border-indigo-800/50 text-indigo-300 whitespace-nowrap"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Content body */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-950/60 font-mono text-sm text-slate-300 whitespace-pre-wrap leading-relaxed select-text">
          {material.imageDataUri ? (
            <div className="space-y-4">
              <img
                src={material.imageDataUri}
                alt={material.name}
                className="max-h-80 mx-auto rounded-lg border border-slate-700 shadow-md object-contain"
                referrerPolicy="no-referrer"
              />
              <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-400 mb-2 font-sans font-medium uppercase tracking-wider">
                  Extracted Text / Visual Description:
                </p>
                <div className="font-sans text-slate-200 whitespace-pre-wrap text-sm">
                  {material.content}
                </div>
              </div>
            </div>
          ) : (
            material.content
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900 flex items-center justify-between">
          <button
            onClick={() => onToggleActive(material.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
              material.active
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            <span>{material.active ? 'Included in AI Context' : 'Excluded from Context (Click to Enable)'}</span>
          </button>

          <button
            onClick={() => {
              onDelete(material.id);
              onClose();
            }}
            className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 text-xs font-medium flex items-center gap-1.5 transition"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Material</span>
          </button>
        </div>
      </div>
    </div>
  );
};
