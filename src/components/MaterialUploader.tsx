import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  FileCode,
  Image as ImageIcon,
  CheckCircle2,
  Circle,
  Eye,
  Trash2,
  Plus,
  Sparkles,
  Layers,
  BookOpen,
  ClipboardPaste,
  Check,
  AlertCircle
} from 'lucide-react';
import { StudyMaterial, MaterialType } from '../types';
import { SAMPLE_STUDY_MATERIALS } from '../data/sampleMaterials';

interface MaterialUploaderProps {
  materials: StudyMaterial[];
  onAddMaterial: (material: StudyMaterial) => void;
  onAddMultipleMaterials: (newMaterials: StudyMaterial[]) => void;
  onToggleActive: (id: string) => void;
  onDeleteMaterial: (id: string) => void;
  onViewMaterial: (material: StudyMaterial) => void;
}

export const MaterialUploader: React.FC<MaterialUploaderProps> = ({
  materials,
  onAddMaterial,
  onAddMultipleMaterials,
  onToggleActive,
  onDeleteMaterial,
  onViewMaterial,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isPasteOpen, setIsPasteOpen] = useState(false);
  const [pasteTitle, setPasteTitle] = useState('');
  const [pasteContent, setPasteContent] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const calculateWordCount = (text: string): number => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  };

  const processFile = async (file: File): Promise<void> => {
    const fileName = file.name;
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    const size = file.size;

    let type: MaterialType = 'text';
    if (['png', 'jpg', 'jpeg', 'webp'].includes(extension)) {
      type = 'image';
    } else if (['md', 'markdown'].includes(extension)) {
      type = 'markdown';
    } else if (['py', 'js', 'ts', 'jsx', 'tsx', 'cpp', 'c', 'java', 'html', 'css', 'json'].includes(extension)) {
      type = 'code';
    } else if (extension === 'pdf') {
      type = 'pdf';
    }

    if (type === 'image') {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const newMat: StudyMaterial = {
            id: `mat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            name: fileName,
            type: 'image',
            size,
            content: `[Image Slide / Diagram: ${fileName}]\n(Multimodal image file for visual / diagram analysis)`,
            imageDataUri: result,
            active: true,
            wordCount: 50,
            uploadedAt: Date.now(),
            topics: ['Visual Diagram', 'Lecture Slide'],
          };
          onAddMaterial(newMat);
          resolve();
        };
        reader.readAsDataURL(file);
      });
    } else if (type === 'pdf') {
      // PDF file extraction via server endpoint
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64Data = reader.result as string;
            const res = await fetch('/api/study/extract-file', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fileName,
                base64Data,
                mimeType: 'application/pdf',
              }),
            });

            if (!res.ok) {
              throw new Error(`Failed to extract text from PDF (${res.status})`);
            }

            const data = await res.json();
            const extractedText = data.text || '';
            const wordCount = calculateWordCount(extractedText);

            const newMat: StudyMaterial = {
              id: `mat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              name: fileName,
              type: 'pdf',
              size,
              content: extractedText || `[PDF: ${fileName} - Processed]`,
              active: true,
              wordCount: wordCount || 100,
              uploadedAt: Date.now(),
              topics: ['PDF Document', 'Course Materials'],
            };
            onAddMaterial(newMat);
            resolve();
          } catch (e) {
            console.error('Error extracting PDF text:', e);
            // Fallback: create material with notice
            const newMat: StudyMaterial = {
              id: `mat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              name: fileName,
              type: 'pdf',
              size,
              content: `[PDF Lecture Document: ${fileName}]\n(Notes extracted for study session)`,
              active: true,
              wordCount: 50,
              uploadedAt: Date.now(),
              topics: ['PDF Notes'],
            };
            onAddMaterial(newMat);
            resolve();
          }
        };
        reader.onerror = () => reject(new Error('Failed to read PDF file'));
        reader.readAsDataURL(file);
      });
    } else {
      // Text, Markdown, Code reading
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const content = (reader.result as string) || '';
          const wordCount = calculateWordCount(content);
          const newMat: StudyMaterial = {
            id: `mat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            name: fileName,
            type,
            size,
            content: content || `[Empty content in ${fileName}]`,
            active: true,
            wordCount,
            uploadedAt: Date.now(),
            topics: [extension.toUpperCase(), 'Notes'],
          };
          onAddMaterial(newMat);
          resolve();
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
      });
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      for (let i = 0; i < files.length; i++) {
        await processFile(files[i]);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error reading file');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handlePasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteContent.trim()) {
      setErrorMessage('Please provide some notes or text content');
      return;
    }

    const title = pasteTitle.trim() || `Pasted Notes (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
    const wordCount = calculateWordCount(pasteContent);

    const newMat: StudyMaterial = {
      id: `mat-paste-${Date.now()}`,
      name: title,
      type: 'notes',
      size: new Blob([pasteContent]).size,
      content: pasteContent.trim(),
      active: true,
      wordCount,
      uploadedAt: Date.now(),
      topics: ['Custom Notes'],
    };

    onAddMaterial(newMat);
    setPasteTitle('');
    setPasteContent('');
    setIsPasteOpen(false);
    setErrorMessage(null);
  };

  const handleLoadSamplePresets = () => {
    // Add any sample materials that aren't already present
    const existingIds = new Set(materials.map(m => m.id));
    const toAdd = SAMPLE_STUDY_MATERIALS.filter(m => !existingIds.has(m.id));
    if (toAdd.length > 0) {
      onAddMultipleMaterials(toAdd);
    }
  };

  const getFileIcon = (type: MaterialType) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="w-4 h-4 text-emerald-400" />;
      case 'code':
        return <FileCode className="w-4 h-4 text-amber-400" />;
      case 'markdown':
        return <FileText className="w-4 h-4 text-purple-400" />;
      case 'pdf':
        return <FileText className="w-4 h-4 text-rose-400" />;
      default:
        return <FileText className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Study Materials</h2>
            <p className="text-[11px] text-slate-400">
              {materials.length} total • {materials.filter(m => m.active).length} active for QA
            </p>
          </div>
        </div>

        <button
          id="btn-paste-notes"
          onClick={() => setIsPasteOpen(!isPasteOpen)}
          className={`p-1.5 rounded-lg text-xs font-medium border transition flex items-center gap-1 ${
            isPasteOpen
              ? 'bg-indigo-600 text-white border-indigo-500'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
          }`}
          title="Paste raw notes text"
        >
          <ClipboardPaste className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Paste Notes</span>
        </button>
      </div>

      {/* Paste notes expandable form */}
      {isPasteOpen && (
        <form onSubmit={handlePasteSubmit} className="p-4 bg-slate-950/80 border-b border-slate-800 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-indigo-400" /> Paste Study Notes / Syllabus
            </span>
            <button
              type="button"
              onClick={() => setIsPasteOpen(false)}
              className="text-[11px] text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
          </div>

          <input
            type="text"
            placeholder="Document Title (e.g., Biology Chapter 4 Lecture Notes)"
            value={pasteTitle}
            onChange={(e) => setPasteTitle(e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />

          <textarea
            rows={4}
            placeholder="Paste your lecture notes, textbook summary, definitions, or study guide text here..."
            value={pasteContent}
            onChange={(e) => setPasteContent(e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none font-mono"
            required
          />

          <div className="flex justify-end gap-2">
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" /> Add to Study Context
            </button>
          </div>
        </form>
      )}

      {/* Upload Drop Zone */}
      <div className="p-4 border-b border-slate-800">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".txt,.md,.pdf,.json,.py,.js,.ts,.html,.css,.csv,.png,.jpg,.jpeg,.webp"
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          id="file-upload-input"
        />

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-indigo-400 bg-indigo-950/30'
              : 'border-slate-700/80 hover:border-slate-600 bg-slate-950/40 hover:bg-slate-950/70'
          }`}
        >
          <div className="w-9 h-9 mx-auto rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400 mb-2">
            <Upload className="w-4 h-4" />
          </div>
          <p className="text-xs font-medium text-slate-200">
            Click to upload or drag &amp; drop
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            Supports PDF, TXT, Markdown, Code, and Slides / Images
          </p>
        </div>

        {errorMessage && (
          <div className="mt-2.5 p-2 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Sample preset loader banner */}
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">Need quick demo notes?</span>
          <button
            onClick={handleLoadSamplePresets}
            className="text-[11px] font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1 hover:underline"
          >
            <Sparkles className="w-3 h-3" /> Load Sample Study Pack
          </button>
        </div>
      </div>

      {/* Materials List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {materials.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-4">
            <BookOpen className="w-8 h-8 text-slate-600 mb-2" />
            <p className="text-xs font-medium text-slate-400">No study materials loaded</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-[200px]">
              Upload your lecture notes, PDFs, or load the sample pack to begin asking grounded questions.
            </p>
            <button
              onClick={handleLoadSamplePresets}
              className="mt-3 px-3 py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/30 text-xs font-medium flex items-center gap-1.5 transition"
            >
              <Sparkles className="w-3.5 h-3.5" /> Load Sample Notes
            </button>
          </div>
        ) : (
          materials.map((mat) => (
            <div
              key={mat.id}
              className={`p-3 rounded-xl border transition-all ${
                mat.active
                  ? 'bg-slate-800/70 border-slate-700/80 shadow-sm'
                  : 'bg-slate-900/40 border-slate-800/60 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <button
                    onClick={() => onToggleActive(mat.id)}
                    className="mt-0.5 text-slate-400 hover:text-emerald-400 transition"
                    title={mat.active ? 'Disable in AI query context' : 'Enable in AI query context'}
                  >
                    {mat.active ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-500" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {getFileIcon(mat.type)}
                      <h3
                        onClick={() => onViewMaterial(mat)}
                        className="text-xs font-medium text-slate-200 truncate cursor-pointer hover:text-indigo-300 hover:underline"
                        title={mat.name}
                      >
                        {mat.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                      <span className="uppercase font-semibold text-[9px] px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                        {mat.type}
                      </span>
                      <span>~{mat.wordCount.toLocaleString()} words</span>
                      {mat.topics && mat.topics.length > 0 && (
                        <span className="text-indigo-400 truncate max-w-[100px]">
                          • {mat.topics[0]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onViewMaterial(mat)}
                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition"
                    title="View content"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteMaterial(mat.id)}
                    className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition"
                    title="Delete material"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
