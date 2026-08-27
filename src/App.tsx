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
import { BookOpen, MessageSquare, Plus, Sparkles, Mail } from 'lucide-react';

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
        onOpenEmailAgent={() => setIsEmailModalOpen(true)}
        onOpenStudyTools={(tool) => setStudyToolModal(tool)}
        onOpenAddMaterial={() => setMobileTab('materials')}
        hasChatMessages={messages.length > 0}
      />

      {/* Mobile Tab Switcher */}
      <div className="md:hidden flex items-center border-b border-slate-800 bg-slate-900 text-xs">
        <button
          onClick={() => setMobileTab('materials')}
          className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 font-medium border-b-2 transition ${
            mobileTab === 'materials'
              ? 'border-indigo-500 text-white bg-slate-800/60'
              : 'border-transparent text-slate-400'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Materials ({activeMaterials.length})</span>
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

      {/* Main Workspace: Split View */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Side: Materials Library */}
        <div
          className={`${
            mobileTab === 'materials' ? 'flex' : 'hidden'
          } md:flex w-full md:w-80 lg:w-96 shrink-0 h-full`}
        >
          <MaterialUploader
            materials={materials}
            onAddMaterial={handleAddMaterial}
            onAddMultipleMaterials={handleAddMultipleMaterials}
            onToggleActive={handleToggleActive}
            onDeleteMaterial={handleDeleteMaterial}
            onViewMaterial={(mat) => setViewingMaterial(mat)}
          />
        </div>

        {/* Right Side: Interactive Study QA Chat */}
        <div
          className={`${
            mobileTab === 'chat' ? 'flex' : 'hidden'
          } md:flex flex-1 flex-col h-full overflow-hidden`}
        >
          <StudyChat
            messages={messages}
            materials={materials}
            isLoading={isLoading}
            onSendMessage={handleSendMessage}
            onClearChat={handleClearChat}
            onOpenEmailAgent={() => setIsEmailModalOpen(true)}
            onOpenStudyTools={(tool) => setStudyToolModal(tool)}
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
