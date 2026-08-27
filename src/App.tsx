import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { MaterialUploader } from './components/MaterialUploader';
import { StudyChat } from './components/StudyChat';
import { MaterialViewerModal } from './components/MaterialViewerModal';
import { EmailAgentModal } from './components/EmailAgentModal';
import { StudyToolsModal } from './components/StudyToolsModal';
import { StudyMaterial, ChatMessage } from './types';
import { SAMPLE_STUDY_MATERIALS } from './data/sampleMaterials';
import { safeStorage } from './lib/safeStorage';
import { BookOpen, MessageSquare, PanelLeftClose, PanelLeft, ChevronLeft, ChevronRight } from 'lucide-react';

export default function App() {
  // Initialize with rich sample study materials
  const [materials, setMaterials] = useState<StudyMaterial[]>(() => {
    try {
      const saved = safeStorage.getItem('studyagent_materials');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return SAMPLE_STUDY_MATERIALS;
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = safeStorage.getItem('studyagent_messages');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [isLoading, setIsLoading] = useState(false);
  const [viewingMaterial, setViewingMaterial] = useState<StudyMaterial | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [studyToolModal, setStudyToolModal] = useState<'flashcards' | 'quiz' | null>(null);
  const [mobileTab, setMobileTab] = useState<'materials' | 'chat'>('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState<number>(360);
  const [isResizing, setIsResizing] = useState(false);

  // Persistence to local storage
  useEffect(() => {
    try {
      safeStorage.setItem('studyagent_materials', JSON.stringify(materials));
    } catch {
      // ignore
    }
  }, [materials]);

  useEffect(() => {
    try {
      safeStorage.setItem('studyagent_messages', JSON.stringify(messages));
    } catch {
      // ignore
    }
  }, [messages]);

  // Handle sidebar resize dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = Math.min(Math.max(e.clientX, 280), 560);
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const activeMaterials = materials.filter(m => m.active);

  const handleAddMaterial = (material: StudyMaterial) => {
    setMaterials(prev => [material, ...prev]);
  };

  const handleAddMultipleMaterials = (newMaterials: StudyMaterial[]) => {
    setMaterials(prev => [...newMaterials, ...prev]);
  };

  const handleToggleActive = (id: string) => {
    setMaterials(prev =>
      prev.map(m => (m.id === id ? { ...m, active: !m.active } : m))
    );
  };

  const handleDeleteMaterial = (id: string) => {
    setMaterials(prev => prev.filter(m => m.id !== id));
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  const handleSendMessage = async (text: string, mode: string = 'qa') => {
    if (!text.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text: text.trim(),
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const res = await fetch('/api/study/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, text: m.text })),
          materials: activeMaterials.map(m => ({
            name: m.name,
            content: m.content,
            imageDataUri: m.imageDataUri,
          })),
          mode,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned ${res.status}`);
      }

      const data = await res.json();
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        text: data.answer || 'No response text received.',
        timestamp: Date.now(),
        citations: data.citations || [],
        suggestedFollowUps: data.suggestedFollowUps || [],
        keyPoints: data.keyPoints || [],
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: unknown) {
      console.error('Error sending message:', err);
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}-err`,
        role: 'assistant',
        text: `⚠️ **Error generating grounded answer:** ${
          err instanceof Error ? err.message : 'Unknown server error'
        }\n\nPlease verify that your Gemini API key is configured in the environment settings and try asking again.`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Top Navigation */}
      <Navbar
        materials={materials}
        activeCount={activeMaterials.length}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onOpenEmailAgent={() => setIsEmailModalOpen(true)}
        onOpenStudyTools={(tool) => setStudyToolModal(tool)}
        onOpenAddMaterial={() => {
          setIsSidebarOpen(true);
          setMobileTab('materials');
        }}
        hasChatMessages={messages.length > 0}
      />

      {/* Mobile Tab Switcher */}
      <div className="md:hidden flex items-center border-b border-slate-800 bg-slate-900 text-xs shrink-0">
        <button
          onClick={() => setMobileTab('materials')}
          className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 font-medium border-b-2 transition ${
            mobileTab === 'materials'
              ? 'border-indigo-500 text-white bg-slate-800/60'
              : 'border-transparent text-slate-400'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Upload &amp; Notes ({materials.length})</span>
        </button>
        <button
          onClick={() => setMobileTab('chat')}
          className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 font-medium border-b-2 transition ${
            mobileTab === 'chat'
              ? 'border-indigo-500 text-white bg-slate-800/60'
              : 'border-transparent text-slate-400'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Study Q&amp;A Chat ({messages.length})</span>
        </button>
      </div>

      {/* Main Workspace: Split View with Resizable and Collapsible Left Panel */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Left Side: Materials Library & Uploader */}
        <div
          style={{ width: isSidebarOpen ? `${sidebarWidth}px` : '0px' }}
          className={`
            ${mobileTab === 'materials' ? 'flex' : 'hidden'}
            md:flex shrink-0 h-full flex-col bg-slate-900 border-r border-slate-800 transition-all duration-150 relative z-10
            ${!isSidebarOpen ? 'md:hidden' : ''}
          `}
        >
          <div className="h-full w-full overflow-hidden flex flex-col">
            <MaterialUploader
              materials={materials}
              onAddMaterial={handleAddMaterial}
              onAddMultipleMaterials={handleAddMultipleMaterials}
              onToggleActive={handleToggleActive}
              onDeleteMaterial={handleDeleteMaterial}
              onViewMaterial={(mat) => setViewingMaterial(mat)}
              onCloseSidebar={() => setIsSidebarOpen(false)}
            />
          </div>
        </div>

        {/* Drag handle for resizing sidebar on desktop */}
        {isSidebarOpen && (
          <div
            onMouseDown={() => setIsResizing(true)}
            className="hidden md:flex w-1.5 hover:w-2 bg-transparent hover:bg-indigo-500/50 cursor-col-resize z-20 items-center justify-center transition-all -ml-1"
            title="Drag to resize panel"
          >
            <div className="w-0.5 h-8 bg-slate-700 rounded-full" />
          </div>
        )}

        {/* Toggle Collapse Button when sidebar is closed on desktop */}
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="hidden md:flex absolute top-4 left-4 z-30 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 shadow-xl items-center gap-2 text-xs font-medium group transition"
            title="Open Uploads & Materials panel"
          >
            <PanelLeft className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
            <span>Open Study Materials ({materials.length})</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        )}

        {/* Right Side: Interactive Study QA Chat */}
        <div
          className={`
            ${mobileTab === 'chat' ? 'flex' : 'hidden'}
            md:flex flex-1 flex-col h-full overflow-hidden min-w-0 bg-slate-950
          `}
        >
          <StudyChat
            messages={messages}
            materials={materials}
            isLoading={isLoading}
            onSendMessage={handleSendMessage}
            onClearChat={handleClearChat}
            onOpenEmailAgent={() => setIsEmailModalOpen(true)}
            onOpenStudyTools={(tool) => setStudyToolModal(tool)}
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          />
        </div>
      </main>

      {/* Material Document Inspector Modal */}
      <MaterialViewerModal
        material={viewingMaterial}
        onClose={() => setViewingMaterial(null)}
        onToggleActive={handleToggleActive}
        onDelete={handleDeleteMaterial}
      />

      {/* Email & Session Summary Agent Modal */}
      <EmailAgentModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        chatHistory={messages}
        materials={materials}
      />

      {/* Study Tools (Flashcards & Quiz) Modal */}
      {studyToolModal && (
        <StudyToolsModal
          isOpen={true}
          initialTool={studyToolModal}
          onClose={() => setStudyToolModal(null)}
          materials={materials}
        />
      )}
    </div>
  );
}
