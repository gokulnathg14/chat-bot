import React, { useState } from 'react';
import {
  X,
  Mail,
  Sparkles,
  Send,
  Copy,
  Check,
  Download,
  ExternalLink,
  RefreshCw,
  Edit3,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Clock,
  ArrowRight,
  FileText,
  User,
  Sliders,
  AlertCircle,
  MessageSquareQuote
} from 'lucide-react';
import { ChatMessage, StudyMaterial, EmailDraft, EmailAudience, EmailTone } from '../types';
import { copyToClipboard } from '../lib/safeStorage';

interface EmailAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatHistory: ChatMessage[];
  materials: StudyMaterial[];
}

export const EmailAgentModal: React.FC<EmailAgentModalProps> = ({
  isOpen,
  onClose,
  chatHistory,
  materials,
}) => {
  const [audience, setAudience] = useState<EmailAudience>('professor');
  const [tone, setTone] = useState<EmailTone>('academic');
  const [senderName, setSenderName] = useState('Gokulnath G');
  const [recipientName, setRecipientName] = useState('Prof. Johnson');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [refinePrompt, setRefinePrompt] = useState('');
  const [draft, setDraft] = useState<EmailDraft | null>(null);
  const [editableSubject, setEditableSubject] = useState('');
  const [editableBody, setEditableBody] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'email' | 'summary'>('email');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (chatHistory.length === 0) {
      setError('Your chat history is currently empty. Ask some questions in the chat first!');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch('/api/study/summarize-and-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatHistory: chatHistory.map(m => ({ role: m.role, text: m.text })),
          materials: materials.filter(m => m.active).map(m => ({ name: m.name, summary: m.summary })),
          audience,
          tone,
          senderName,
          recipientName,
          customInstructions,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error (${res.status})`);
      }

      const data = await res.json();
      const newDraft: EmailDraft = {
        id: `email-${Date.now()}`,
        recipient: recipientEmail || (audience === 'professor' ? 'professor@university.edu' : 'study-group@peers.org'),
        recipientName,
        subject: data.subject || 'Study Session Summary & Key Clarifications',
        body: data.body || '',
        summaryOverview: data.summaryOverview || '',
        keyTopicsCovered: data.keyTopicsCovered || [],
        questionsResolved: data.questionsResolved || [],
        pendingQuestions: data.pendingQuestions || [],
        actionItems: data.actionItems || [],
        audience,
        tone,
        createdAt: Date.now(),
      };

      setDraft(newDraft);
      setEditableSubject(newDraft.subject);
      setEditableBody(newDraft.body);
      setActiveTab('email');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate email summary');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft || !refinePrompt.trim() || isRefining) return;

    setIsRefining(true);
    try {
      const res = await fetch('/api/study/refine-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentDraft: {
            ...draft,
            subject: editableSubject,
            body: editableBody,
          },
          refinePrompt: refinePrompt.trim(),
        }),
      });

      if (!res.ok) throw new Error('Failed to refine email');
      const data = await res.json();
      if (data.subject) setEditableSubject(data.subject);
      if (data.body) setEditableBody(data.body);
      setRefinePrompt('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to refine email');
    } finally {
      setIsRefining(false);
    }
  };

  const handleCopy = async () => {
    const fullText = `Subject: ${editableSubject}\nTo: ${recipientEmail || draft?.recipient || ''}\n\n${editableBody}`;
    await copyToClipboard(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMailto = () => {
    const to = encodeURIComponent(recipientEmail || draft?.recipient || '');
    const sub = encodeURIComponent(editableSubject);
    const body = encodeURIComponent(editableBody);
    const mailtoUrl = `mailto:${to}?subject=${sub}&body=${body}`;
    try {
      window.location.href = mailtoUrl;
    } catch {
      // Fallback anchor click
      const a = document.createElement('a');
      a.href = mailtoUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.click();
    }
  };

  const handleDownload = () => {
    const content = `Subject: ${editableSubject}\nTo: ${recipientEmail || draft?.recipient || ''}\nDate: ${new Date().toUTCString()}\n\n${editableBody}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `study-summary-email-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white tracking-tight">
                  Email &amp; Summary Synthesis Agent
                </h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20">
                  Autonomous Agent
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Transforms your study Q&amp;A session into executive summaries and structured email drafts.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Grid: Left Controls vs Right Draft Preview */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Column: Configuration & Trigger */}
          <div className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-950/40 p-4 sm:p-5 overflow-y-auto space-y-5">
            {/* Audience Preset */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-400" /> Target Audience
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'professor', label: '🎓 Professor / TA', desc: 'Clarification & progress' },
                  { id: 'study_group', label: '👥 Study Group', desc: 'Collaborative recap' },
                  { id: 'personal', label: '📓 Self Digest', desc: 'Personal study log' },
                  { id: 'custom', label: '✍️ Custom', desc: 'Custom instructions' },
                ].map((aud) => (
                  <button
                    key={aud.id}
                    type="button"
                    onClick={() => {
                      setAudience(aud.id as EmailAudience);
                      if (aud.id === 'professor') setRecipientName('Prof. Johnson');
                      else if (aud.id === 'study_group') setRecipientName('Study Partners');
                      else setRecipientName('Myself');
                    }}
                    className={`p-2.5 rounded-xl text-left border transition text-xs ${
                      audience === aud.id
                        ? 'bg-indigo-600/20 border-indigo-500 text-white font-medium shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-slate-200">{aud.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{aud.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Tone Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" /> Tone &amp; Style
              </label>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {[
                  { id: 'academic', label: 'Academic & Formal' },
                  { id: 'collaborative', label: 'Collaborative & Friendly' },
                  { id: 'concise', label: 'Concise Bullet Points' },
                  { id: 'formal', label: 'Professional Standard' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTone(t.id as EmailTone)}
                    className={`px-2.5 py-1.5 rounded-lg border transition text-center ${
                      tone === t.id
                        ? 'bg-violet-600/20 border-violet-500 text-violet-200 font-medium'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Recipient & Sender Customization */}
            <div className="space-y-3 pt-1">
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">
                  Recipient Name
                </label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g. Prof. David Miller"
                  className="w-full text-xs px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">
                  Recipient Email (Optional)
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="e.g. dmiller@university.edu"
                  className="w-full text-xs px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">
                  Your Name (Sign-off)
                </label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full text-xs px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">
                  Special Instructions (Optional)
                </label>
                <textarea
                  rows={2}
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="e.g., Mention I missed Monday's lecture; ask about exam question 4..."
                  className="w-full text-xs px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Generate Action Button */}
            <button
              id="generate-email-draft-btn"
              onClick={handleGenerate}
              disabled={isGenerating || chatHistory.length === 0}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Session &amp; Draft...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{draft ? 'Regenerate Email Draft' : 'Generate Summary & Email Draft'}</span>
                </>
              )}
            </button>

            <div className="text-[11px] text-slate-500 text-center">
              Uses {chatHistory.length} chat message(s) &amp; {materials.filter(m => m.active).length} study material(s)
            </div>
          </div>

          {/* Right Column: Output Tabs & Draft Editor */}
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-900">
            {/* View Switcher Tabs */}
            <div className="px-6 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('email')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    activeTab === 'email'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white bg-slate-800'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Formatted Email Draft</span>
                </button>
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    activeTab === 'summary'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white bg-slate-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Executive Session Summary</span>
                </button>
              </div>

              {draft && activeTab === 'email' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={handleMailto}
                    className="px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium flex items-center gap-1.5 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in Email</span>
                  </button>
                  <button
                    onClick={handleDownload}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition"
                    title="Download as .txt"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto p-6">
              {!draft ? (
                <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <MessageSquareQuote className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">No Email Draft Generated Yet</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Select your target recipient and click "Generate Summary &amp; Email Draft" on the left to create a structured email synthesizing your study session.
                    </p>
                  </div>
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || chatHistory.length === 0}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" /> Generate Now
                  </button>
                </div>
              ) : activeTab === 'email' ? (
                <div className="space-y-4 max-w-3xl mx-auto">
                  {/* Email Header Card */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 font-semibold w-16">To:</span>
                      <span className="text-slate-200 font-medium">
                        {recipientEmail || draft.recipient}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 font-semibold w-16">Subject:</span>
                      <input
                        type="text"
                        value={editableSubject}
                        onChange={(e) => setEditableSubject(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-700/80 px-2.5 py-1.5 rounded-lg text-white font-medium focus:outline-none focus:border-indigo-500 text-xs"
                      />
                    </div>
                  </div>

                  {/* Email Body Editor */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-semibold uppercase tracking-wider flex items-center gap-1">
                        <Edit3 className="w-3.5 h-3.5 text-indigo-400" /> Editable Email Content:
                      </span>
                      <span className="text-[11px]">Directly edit or refine below</span>
                    </div>
                    <textarea
                      rows={14}
                      value={editableBody}
                      onChange={(e) => setEditableBody(e.target.value)}
                      className="w-full text-xs sm:text-sm p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-sans leading-relaxed focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-y shadow-inner"
                    />
                  </div>

                  {/* Refine with AI Prompt */}
                  <form onSubmit={handleRefine} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Prompt AI to refine (e.g., 'Make it more concise', 'Add reminder for Tuesday office hours')..."
                      value={refinePrompt}
                      onChange={(e) => setRefinePrompt(e.target.value)}
                      className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!refinePrompt.trim() || isRefining}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1 transition"
                    >
                      {isRefining ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>Refine</span>
                    </button>
                  </form>
                </div>
              ) : (
                /* Session Summary Tab */
                <div className="space-y-5 max-w-3xl mx-auto">
                  {/* Overview box */}
                  <div className="p-5 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" /> Study Session Executive Overview
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                      {draft.summaryOverview}
                    </p>
                  </div>

                  {/* Topics Covered */}
                  {draft.keyTopicsCovered.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-400" /> Key Concepts Mastered
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {draft.keyTopicsCovered.map((topic, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-medium text-indigo-300"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Resolved vs Pending Questions Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Resolved */}
                    <div className="p-4 rounded-xl bg-slate-950 border border-emerald-900/30 space-y-2.5">
                      <h4 className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> Resolved Questions &amp; Insights
                      </h4>
                      <ul className="space-y-2 text-xs text-slate-300 list-disc list-inside">
                        {draft.questionsResolved.map((q, i) => (
                          <li key={i} className="leading-relaxed">
                            {q}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Pending Doubts */}
                    <div className="p-4 rounded-xl bg-slate-950 border border-amber-900/30 space-y-2.5">
                      <h4 className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                        <HelpCircle className="w-4 h-4" /> Pending Questions / Inquiries
                      </h4>
                      <ul className="space-y-2 text-xs text-slate-300 list-disc list-inside">
                        {draft.pendingQuestions.length > 0 ? (
                          draft.pendingQuestions.map((q, i) => (
                            <li key={i} className="leading-relaxed">
                              {q}
                            </li>
                          ))
                        ) : (
                          <li className="text-slate-500 italic">No unresolved questions flagged.</li>
                        )}
                      </ul>
                    </div>
                  </div>

                  {/* Action Items */}
                  {draft.actionItems.length > 0 && (
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                      <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-indigo-400" /> Recommended Action Items &amp; Next Steps
                      </h4>
                      <ul className="space-y-2 text-xs text-slate-300 list-decimal list-inside">
                        {draft.actionItems.map((act, i) => (
                          <li key={i} className="leading-relaxed">
                            {act}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
