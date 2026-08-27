import React from 'react';
import { BookOpen, Sparkles, Mail, Layers, PlusCircle, CheckCircle2, HelpCircle } from 'lucide-react';
import { StudyMaterial } from '../types';

interface NavbarProps {
  materials: StudyMaterial[];
  activeCount: number;
  onOpenEmailAgent: () => void;
  onOpenStudyTools: (tool: 'flashcards' | 'quiz') => void;
  onOpenAddMaterial: () => void;
  hasChatMessages: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  materials,
  activeCount,
  onOpenEmailAgent,
  onOpenStudyTools,
  onOpenAddMaterial,
  hasChatMessages,
}) => {
  const totalWords = materials
    .filter(m => m.active)
    .reduce((acc, m) => acc + (m.wordCount || 0), 0);

  return (
    <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 text-slate-100 shadow-md backdrop-blur-md bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-lg tracking-tight text-white">
                StudyAgent
              </h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                Gemini 3.7 Grounded
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Study Material QA &amp; Automated Email Summarizer Agent
            </p>
          </div>
        </div>

        {/* Stats & Quick Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Active Context pill */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${activeCount > 0 ? 'bg-emerald-400' : 'bg-amber-400'} opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${activeCount > 0 ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
            <span className="text-slate-300 font-medium">
              {activeCount} / {materials.length} {activeCount === 1 ? 'Doc Active' : 'Docs Active'}
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">~{totalWords.toLocaleString()} words</span>
          </div>

          {/* Quick study tools button */}
          <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700 p-0.5 text-xs">
            <button
              id="nav-flashcards-btn"
              onClick={() => onOpenStudyTools('flashcards')}
              disabled={activeCount === 0}
              className="px-2.5 py-1.5 rounded-md hover:bg-slate-700 text-slate-300 hover:text-white transition disabled:opacity-40 flex items-center gap-1.5"
              title="Generate Flashcards from active study materials"
            >
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden lg:inline">Flashcards</span>
            </button>
            <button
              id="nav-quiz-btn"
              onClick={() => onOpenStudyTools('quiz')}
              disabled={activeCount === 0}
              className="px-2.5 py-1.5 rounded-md hover:bg-slate-700 text-slate-300 hover:text-white transition disabled:opacity-40 flex items-center gap-1.5"
              title="Take Practice Quiz from materials"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden lg:inline">Quiz</span>
            </button>
          </div>

          {/* Upload Button */}
          <button
            id="nav-upload-btn"
            onClick={onOpenAddMaterial}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition shadow-sm"
          >
            <PlusCircle className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Add Material</span>
          </button>

          {/* Summarize & Draft Email Agent CTA */}
          <button
            id="nav-email-agent-btn"
            onClick={onOpenEmailAgent}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition shadow-md ${
              hasChatMessages
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-indigo-600/30 ring-1 ring-white/20 animate-pulse-slow'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            <Mail className="w-4 h-4 text-white" />
            <span>Email Summary Agent</span>
          </button>
        </div>
      </div>
    </header>
  );
};
