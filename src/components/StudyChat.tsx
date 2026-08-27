import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Send,
  Sparkles,
  Bot,
  User,
  Quote,
  ArrowRight,
  Copy,
  Check,
  RotateCcw,
  BookOpen,
  Mail,
  Zap,
  HelpCircle,
  BrainCircuit,
  GraduationCap,
  ListOrdered,
  Layers
} from 'lucide-react';
import { ChatMessage, StudyMaterial, Citation } from '../types';
import { copyToClipboard } from '../lib/safeStorage';
import { PanelLeft, PanelLeftClose } from 'lucide-react';

interface StudyChatProps {
  messages: ChatMessage[];
  materials: StudyMaterial[];
  isLoading: boolean;
  onSendMessage: (text: string, mode?: string) => void;
  onClearChat: () => void;
  onOpenEmailAgent: () => void;
  onOpenStudyTools: (tool: 'flashcards' | 'quiz') => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export const StudyChat: React.FC<StudyChatProps> = ({
  messages,
  materials,
  isLoading,
  onSendMessage,
  onClearChat,
  onOpenEmailAgent,
  onOpenStudyTools,
  isSidebarOpen = true,
  onToggleSidebar,
}) => {
  const [input, setInput] = useState('');
  const [selectedMode, setSelectedMode] = useState<'qa' | 'deep' | 'exam' | 'formulas'>('qa');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeMaterials = materials.filter(m => m.active);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const textToSend = input.trim();
    setInput('');
    onSendMessage(textToSend, selectedMode);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleCopyMessage = async (id: string, text: string) => {
    await copyToClipboard(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Dynamic suggested prompts based on loaded active materials
  const getSuggestedPrompts = (): string[] => {
    if (activeMaterials.length === 0) {
      return [
        'How should I structure my study schedule for final exams?',
        'What are the most effective active recall techniques?',
        'Upload your lecture notes on the left to start asking grounded questions!',
      ];
    }

    const materialNames = activeMaterials.map(m => m.name.toLowerCase()).join(' ');
    const suggestions: string[] = [];

    if (materialNames.includes('memory') || materialNames.includes('paging') || materialNames.includes('os')) {
      suggestions.push('Explain how the TLB cache calculates Effective Access Time (EAT).');
      suggestions.push('What is the difference between FIFO and LRU page replacement algorithms?');
      suggestions.push('Walk through the step-by-step process of handling a Page Fault interrupt.');
    } else if (materialNames.includes('crispr') || materialNames.includes('gene') || materialNames.includes('biology')) {
      suggestions.push('Why is the PAM sequence (5-NGG-3) strictly required for Cas9 cleavage?');
      suggestions.push('Compare the NHEJ vs HDR repair pathways after a double-strand break.');
      suggestions.push('Explain the role of single guide RNA (sgRNA) in genomic targeting.');
    } else if (materialNames.includes('macro') || materialNames.includes('fiscal') || materialNames.includes('inflation')) {
      suggestions.push('How does expansionary fiscal policy shift Aggregate Demand using the multiplier?');
      suggestions.push('What causes Cost-Push inflation (stagflation) according to the SRAS curve?');
      suggestions.push('Explain the difference between the short-run and long-run Phillips Curve.');
    } else {
      suggestions.push(`Summarize the core takeaways and principles in ${activeMaterials[0]?.name || 'my notes'}.`);
      suggestions.push('What are 3 critical definitions I must memorize for the exam?');
      suggestions.push('Provide a practice quiz question testing difficult concepts in these materials.');
    }

    return suggestions.slice(0, 3);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 relative">
      {/* Top Banner / Mode Bar */}
      <div className="px-3 sm:px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          {onToggleSidebar && !isSidebarOpen && (
            <button
              onClick={onToggleSidebar}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition"
              title="Show Study Materials and Notes panel"
            >
              <PanelLeft className="w-3.5 h-3.5 text-indigo-400" />
              <span>Notes ({materials.length})</span>
            </button>
          )}

          {/* Mode Selector */}
          <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setSelectedMode('qa')}
              className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1.5 ${
                selectedMode === 'qa'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Grounded Q&amp;A</span>
            </button>
            <button
              onClick={() => setSelectedMode('deep')}
              className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1.5 ${
                selectedMode === 'deep'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BrainCircuit className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Deep Intuition</span>
              <span className="sm:hidden">Deep</span>
            </button>
            <button
              onClick={() => setSelectedMode('exam')}
              className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1.5 ${
                selectedMode === 'exam'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exam Prep</span>
              <span className="sm:hidden">Exam</span>
            </button>
          </div>
        </div>

        {/* Chat Actions */}
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <>
              <button
                onClick={onOpenEmailAgent}
                className="px-2.5 py-1 rounded-lg bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-600/30 text-xs font-medium flex items-center gap-1.5 transition"
                title="Summarize chat and generate email draft"
              >
                <Mail className="w-3.5 h-3.5 text-indigo-400" />
                <span>Summarize into Email</span>
              </button>
              <button
                onClick={onClearChat}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition text-xs"
                title="Clear conversation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="max-w-2xl mx-auto my-8 space-y-6 animate-fadeIn">
            {/* Welcome card */}
            <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-900/60 border border-slate-800 shadow-xl text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-semibold text-white tracking-tight">
                Study Materials Q&amp;A Agent
              </h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Upload your lecture notes, course slides, or readings. Ask detailed questions, verify citations from the text, and let the Email Agent summarize your session into ready-to-send emails.
              </p>
              {activeMaterials.length > 0 && (
                <div className="pt-2 flex items-center justify-center gap-2 text-xs text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>{activeMaterials.length} study material(s) loaded &amp; ready for queries</span>
                </div>
              )}
            </div>

            {/* Quick Prompts */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
                Suggested Questions to Ask:
              </p>
              <div className="grid gap-2">
                {getSuggestedPrompts().map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSendMessage(prompt, selectedMode)}
                    className="w-full text-left p-3 rounded-xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/40 text-xs text-slate-300 hover:text-white transition flex items-center justify-between group"
                  >
                    <span className="flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition" />
                      {prompt}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition" />
                  </button>
                ))}
              </div>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-1.5">
                <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-semibold">
                  <Quote className="w-3.5 h-3.5" /> Exact Grounding
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  All answers reference exact quotes and source notes.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-1.5">
                <div className="flex items-center gap-1.5 text-blue-400 text-xs font-semibold">
                  <Mail className="w-3.5 h-3.5" /> Email Summarizer
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Draft emails to professors, study buddies, or personal logs with 1 click.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-1.5">
                <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold">
                  <Layers className="w-3.5 h-3.5" /> Flashcards &amp; Quiz
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Generate instant interactive tests and review decks from your materials.
                </p>
              </div>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 sm:gap-4 max-w-3xl ${
                message.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-semibold ${
                  message.role === 'user'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-800 border border-slate-700 text-indigo-400'
                }`}
              >
                {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Body */}
              <div className="space-y-2.5 max-w-[85%] sm:max-w-[90%]">
                <div
                  className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                    message.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-slate-900 border border-slate-800/90 text-slate-200 rounded-tl-none'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <div className="prose prose-invert prose-xs sm:prose-sm max-w-none space-y-2">
                      <ReactMarkdown>{message.text}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{message.text}</p>
                  )}
                </div>

                {/* Key Takeaways Box (if present on assistant message) */}
                {message.keyPoints && message.keyPoints.length > 0 && (
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1.5 text-xs">
                    <span className="font-semibold text-slate-300 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-indigo-400">
                      <Sparkles className="w-3 h-3" /> Key Takeaways:
                    </span>
                    <ul className="space-y-1 text-slate-300 list-disc list-inside">
                      {message.keyPoints.map((pt, idx) => (
                        <li key={idx} className="leading-relaxed">
                          {pt}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Citations Badges */}
                {message.citations && message.citations.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                      <Quote className="w-3 h-3 text-indigo-400" /> Sources:
                    </span>
                    {message.citations.map((cite, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedCitation(cite)}
                        className="px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-[11px] text-indigo-300 hover:text-white transition flex items-center gap-1 max-w-[220px] truncate"
                        title={`Click to view quote from "${cite.sourceName}"`}
                      >
                        <BookOpen className="w-3 h-3 shrink-0 text-indigo-400" />
                        <span className="truncate">{cite.sourceName}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Suggested Follow-up Questions Chips */}
                {message.suggestedFollowUps && message.suggestedFollowUps.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Follow-up Inquiries:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {message.suggestedFollowUps.map((q, idx) => (
                        <button
                          key={idx}
                          onClick={() => onSendMessage(q, selectedMode)}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-indigo-950/60 border border-slate-800 hover:border-indigo-500/40 text-[11px] text-slate-300 hover:text-indigo-300 transition text-left flex items-center gap-1.5 group"
                        >
                          <Zap className="w-3 h-3 text-indigo-400 shrink-0 group-hover:scale-110 transition" />
                          <span>{q}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message action footer */}
                <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-0.5">
                  <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span>•</span>
                  <button
                    onClick={() => handleCopyMessage(message.id, message.text)}
                    className="hover:text-slate-300 transition flex items-center gap-1"
                  >
                    {copiedId === message.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex gap-3 max-w-3xl mr-auto animate-pulse">
            <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-4 rounded-2xl rounded-tl-none bg-slate-900 border border-slate-800 flex items-center gap-2 text-xs text-slate-400">
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"></div>
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.4s]"></div>
              <span className="ml-1 text-slate-300 font-medium">
                Grounded Study Agent analyzing materials &amp; synthesizing answer...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Citation Popover Modal */}
      {selectedCitation && (
        <div className="absolute inset-x-4 bottom-24 z-20 max-w-xl mx-auto p-4 rounded-2xl bg-slate-900 border border-indigo-500/40 shadow-2xl space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300">
              <Quote className="w-4 h-4 text-indigo-400" /> Grounded Source Excerpt
            </div>
            <button
              onClick={() => setSelectedCitation(null)}
              className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800"
            >
              Close
            </button>
          </div>
          <p className="text-xs font-medium text-white">{selectedCitation.sourceName}</p>
          {selectedCitation.sectionOrPage && (
            <p className="text-[11px] text-slate-400">Section: {selectedCitation.sectionOrPage}</p>
          )}
          <blockquote className="p-2.5 rounded-lg bg-slate-950/80 border-l-2 border-indigo-500 font-mono text-xs text-slate-300 italic">
            "{selectedCitation.quote}"
          </blockquote>
        </div>
      )}

      {/* Chat Input Bar */}
      <div className="p-3 sm:p-4 bg-slate-900 border-t border-slate-800">
        <form onSubmit={handleSubmit} className="relative flex items-end gap-2 max-w-4xl mx-auto">
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                activeMaterials.length > 0
                  ? `Ask questions about ${activeMaterials.length} active study document(s)... (Shift+Enter for newline)`
                  : 'Ask any academic question or upload study notes on the left...'
              }
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none pr-10 shadow-inner"
            />
          </div>

          <button
            type="submit"
            id="chat-send-btn"
            disabled={!input.trim() || isLoading}
            className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 transition shrink-0 flex items-center justify-center"
            title="Send message (Enter)"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        <div className="flex items-center justify-between text-[11px] text-slate-500 max-w-4xl mx-auto mt-2 px-1">
          <span>
            Mode: <strong className="text-slate-400 uppercase">{selectedMode}</strong> • Press{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[10px]">
              Enter
            </kbd>{' '}
            to send
          </span>
          <button
            onClick={onOpenEmailAgent}
            className="text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1"
          >
            <Mail className="w-3 h-3" /> Ready to email summary?
          </button>
        </div>
      </div>
    </div>
  );
};
