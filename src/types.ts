export type MaterialType = 'pdf' | 'text' | 'markdown' | 'image' | 'notes' | 'code';

export interface StudyMaterial {
  id: string;
  name: string;
  type: MaterialType;
  size: number;
  content: string; // Plain text or extracted markdown
  mimeType?: string;
  imageDataUri?: string; // For images/slides
  active: boolean;
  wordCount: number;
  uploadedAt: number;
  summary?: string;
  topics?: string[];
}

export interface Citation {
  sourceName: string;
  quote: string;
  sectionOrPage?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: number;
  citations?: Citation[];
  suggestedFollowUps?: string[];
  keyPoints?: string[];
  isGenerating?: boolean;
}

export type EmailAudience = 'professor' | 'study_group' | 'personal' | 'custom';
export type EmailTone = 'academic' | 'formal' | 'collaborative' | 'concise';

export interface EmailDraft {
  id: string;
  recipient: string;
  recipientName?: string;
  cc?: string;
  subject: string;
  body: string;
  summaryOverview: string;
  keyTopicsCovered: string[];
  questionsResolved: string[];
  pendingQuestions: string[];
  actionItems: string[];
  audience: EmailAudience;
  tone: EmailTone;
  createdAt: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  sourceMaterialName: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  topic: string;
  sourceMaterialName: string;
}
