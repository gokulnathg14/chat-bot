import React from 'react';
import { BookOpen, Sparkles, Mail, Layers, PlusCircle, HelpCircle, PanelLeft, PanelLeftClose } from 'lucide-react';
import { StudyMaterial } from '../types';

interface NavbarProps {
  materials: StudyMaterial[];
  activeCount: number;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onOpenEmailAgent: () => void;
  onOpenStudyTools: (tool: 'flashcards' | 'quiz') => void;
  onOpenAddMaterial: () => void;
  hasChatMessages: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  materials,
  activeCount,
  isSidebarOpen = true,
  onToggleSidebar,
  onOpenEmailAgent,
  onOpenStudyTools,
  onOpenAddMaterial,
  hasChatMessages,
}) => {
  const totalWords = materials
    .filter(m => m.active)
    .reduce((acc, m) => acc + (m.wordCount || 0), 0);

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 border-b border-slate-800 text-slate-100 shadow-md backdrop-blur-md shrink-0">
      <div className="w-full px-3 sm:px-5 lg:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
        {/* Brand & Sidebar Toggle */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition flex items-center justify-center shrink-0"
              title={isSidebarOpen ? "Hide Materials Panel" : "Show Materials Panel"}
              id="btn-toggle-sidebar"
            >
              {isSidebarOpen ? (
                <PanelLeftClose className="w-4 h-4 text-indigo-400" />
              ) : (
                <PanelLeft className="w-4 h-4 text-indigo-400" />
              )}
            </button>
          )}

          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/20 shrink-0">
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm sm:text-base tracking-tight text-white truncate">
                StudyAgent
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 whitespace-nowrap">
                <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                Grounded QA &amp; Email
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden lg:block truncate">
              Upload study notes &amp; generate professor email summaries
            </p>
          </div>
        </div>

        {/* Stats & Quick Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Active Context pill */}
          <div className="hidden xl:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${activeCount > 0 ? 'bg-emerald-400' : 'bg-amber-400'} opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${activeCount > 0 ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
            <span className="text-slate-300 font-medium">
              {activeCount} / {materials.length} Active
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
              className="px-2 sm:px-2.5 py-1 rounded-md hover:bg-slate-700 text-slate-300 hover:text-white transition disabled:opacity-40 flex items-center gap-1"
              title="Generate Flashcards from active study materials"
            >
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden md:inline">Flashcards</span>
            </button>
            <button
              id="nav-quiz-btn"
              onClick={() => onOpenStudyTools('quiz')}
              disabled={activeCount === 0}
              className="px-2 sm:px-2.5 py-1 rounded-md hover:bg-slate-700 text-slate-300 hover:text-white transition disabled:opacity-40 flex items-center gap-1"
              title="Take Practice Quiz from materials"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Quiz</span>
            </button>
          </div>

          {/* Upload Button */}
          <button
            id="nav-upload-btn"
            onClick={onOpenAddMaterial}
            className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition shadow-sm"
          >
            <PlusCircle className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Upload Notes</span>
          </button>

          {/* Summarize & Draft Email Agent CTA */}
          <button
            id="nav-email-agent-btn"
            onClick={onOpenEmailAgent}
            className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 sm:gap-2 transition shadow-md ${
              hasChatMessages
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-indigo-600/30 ring-1 ring-white/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            <span>Email Summary Agent</span>
          </button>
        </div>
      </div>
    </header>
  );
};
