import React, { useState } from 'react';
import {
  X,
  Layers,
  HelpCircle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  CheckCircle,
  XCircle,
  BookOpen,
  Check,
  RefreshCw,
  Award
} from 'lucide-react';
import { StudyMaterial, Flashcard, QuizQuestion } from '../types';

interface StudyToolsModalProps {
  isOpen: boolean;
  initialTool: 'flashcards' | 'quiz';
  onClose: () => void;
  materials: StudyMaterial[];
}

export const StudyToolsModal: React.FC<StudyToolsModalProps> = ({
  isOpen,
  initialTool,
  onClose,
  materials,
}) => {
  const [currentTool, setCurrentTool] = useState<'flashcards' | 'quiz'>(initialTool);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Flashcards state
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredIds, setMasteredIds] = useState<Set<string>>(new Set());

  // Quiz state
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);

  if (!isOpen) return null;

  const activeMaterials = materials.filter(m => m.active);

  const fetchFlashcards = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/study/generate-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolType: 'flashcards',
          materials: activeMaterials.map(m => ({ name: m.name, content: m.content })),
        }),
      });

      if (!res.ok) throw new Error('Failed to generate flashcards');
      const data = await res.json();
      setFlashcards(data.flashcards || []);
      setCardIndex(0);
      setIsFlipped(false);
      setMasteredIds(new Set());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error generating flashcards');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchQuiz = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/study/generate-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolType: 'quiz',
          materials: activeMaterials.map(m => ({ name: m.name, content: m.content })),
        }),
      });

      if (!res.ok) throw new Error('Failed to generate quiz');
      const data = await res.json();
      setQuizQuestions(data.questions || []);
      setSelectedAnswers({});
      setShowResults(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error generating quiz');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleMastered = (id: string) => {
    const next = new Set(masteredIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setMasteredIds(next);
  };

  const calculateScore = () => {
    let score = 0;
    quizQuestions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctIndex) {
        score += 1;
      }
    });
    return score;
  };

  const currentCard = flashcards[cardIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {currentTool === 'flashcards' ? <Layers className="w-5 h-5" /> : <HelpCircle className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white">
                  {currentTool === 'flashcards' ? 'Active Recall Flashcards' : 'Practice Comprehension Quiz'}
                </h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  Grounded from Materials
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Generated directly from your {activeMaterials.length} active study notes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tool Switcher */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
              <button
                onClick={() => {
                  setCurrentTool('flashcards');
                  if (flashcards.length === 0) fetchFlashcards();
                }}
                className={`px-3 py-1 rounded-md font-medium transition ${
                  currentTool === 'flashcards' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Flashcards
              </button>
              <button
                onClick={() => {
                  setCurrentTool('quiz');
                  if (quizQuestions.length === 0) fetchQuiz();
                }}
                className={`px-3 py-1 rounded-md font-medium transition ${
                  currentTool === 'quiz' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Quiz
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col justify-center">
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 mx-auto text-indigo-400 animate-spin" />
              <p className="text-sm font-semibold text-white">
                Generating {currentTool === 'flashcards' ? 'Flashcards' : 'Practice Questions'}...
              </p>
              <p className="text-xs text-slate-400">
                Grounding questions in your uploaded study notes
              </p>
            </div>
          ) : error ? (
            <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-800 text-center space-y-3">
              <p className="text-sm text-rose-300 font-medium">{error}</p>
              <button
                onClick={currentTool === 'flashcards' ? fetchFlashcards : fetchQuiz}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
              >
                Try Again
              </button>
            </div>
          ) : currentTool === 'flashcards' ? (
            /* Flashcards Mode */
            flashcards.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <Layers className="w-12 h-12 mx-auto text-slate-600" />
                <p className="text-sm text-slate-300 font-medium">Ready to create active recall cards?</p>
                <button
                  onClick={fetchFlashcards}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md flex items-center gap-2 mx-auto"
                >
                  <Sparkles className="w-4 h-4" /> Generate Flashcard Deck
                </button>
              </div>
            ) : (
              <div className="max-w-xl mx-auto w-full space-y-5">
                {/* Progress bar */}
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>
                    Card {cardIndex + 1} of {flashcards.length}
                  </span>
                  <span className="text-emerald-400 font-medium">
                    {masteredIds.size} Mastered
                  </span>
                </div>

                {/* The 3D Flip Flashcard */}
                <div
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="min-h-[260px] p-8 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-700/80 shadow-2xl cursor-pointer flex flex-col justify-between transition-all hover:border-indigo-500/50 group select-none relative"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="px-2.5 py-1 rounded-md bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 font-semibold text-[11px]">
                      {currentCard?.topic || 'Concept'}
                    </span>
                    <span className="text-slate-500 text-[11px] group-hover:text-slate-400">
                      {isFlipped ? 'Click to see Front' : 'Click to Reveal Answer'}
                    </span>
                  </div>

                  <div className="my-6 text-center">
                    <h3 className={`text-base sm:text-lg font-medium leading-relaxed ${isFlipped ? 'text-emerald-300 font-normal text-sm sm:text-base whitespace-pre-wrap' : 'text-white'}`}>
                      {isFlipped ? currentCard?.back : currentCard?.front}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-800 pt-3">
                    <span className="truncate max-w-[250px]">
                      Source: {currentCard?.sourceMaterialName}
                    </span>
                    <span className="text-indigo-400 font-medium">
                      {isFlipped ? 'Answer Revealed' : 'Prompt'}
                    </span>
                  </div>
                </div>

                {/* Card navigation controls */}
                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={() => {
                      setIsFlipped(false);
                      setCardIndex((prev) => (prev > 0 ? prev - 1 : flashcards.length - 1));
                    }}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold"
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </button>

                  <button
                    onClick={() => handleToggleMastered(currentCard.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                      masteredIds.has(currentCard.id)
                        ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>{masteredIds.has(currentCard.id) ? 'Mastered!' : 'Mark as Mastered'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsFlipped(false);
                      setCardIndex((prev) => (prev < flashcards.length - 1 ? prev + 1 : 0));
                    }}
                    className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-1.5 text-xs font-semibold"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          ) : (
            /* Quiz Mode */
            quizQuestions.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <HelpCircle className="w-12 h-12 mx-auto text-slate-600" />
                <p className="text-sm text-slate-300 font-medium">Ready to test your comprehension?</p>
                <button
                  onClick={fetchQuiz}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md flex items-center gap-2 mx-auto"
                >
                  <Sparkles className="w-4 h-4" /> Generate Practice Quiz
                </button>
              </div>
            ) : (
              <div className="space-y-6 max-w-2xl mx-auto w-full">
                {quizQuestions.map((q, qIdx) => {
                  const hasAnswered = selectedAnswers[qIdx] !== undefined;
                  const isCorrect = selectedAnswers[qIdx] === q.correctIndex;

                  return (
                    <div key={q.id || qIdx} className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-semibold text-white leading-snug">
                          {qIdx + 1}. {q.question}
                        </h4>
                        <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 shrink-0">
                          {q.sourceMaterialName}
                        </span>
                      </div>

                      <div className="space-y-2 pt-1">
                        {q.options.map((opt, optIdx) => {
                          const isSelected = selectedAnswers[qIdx] === optIdx;
                          const isTheCorrectOption = q.correctIndex === optIdx;

                          let optionClass = 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700';
                          if (hasAnswered) {
                            if (isTheCorrectOption) {
                              optionClass = 'bg-emerald-950/60 border-emerald-500/80 text-emerald-200 font-medium';
                            } else if (isSelected && !isCorrect) {
                              optionClass = 'bg-rose-950/60 border-rose-500/80 text-rose-200';
                            }
                          } else if (isSelected) {
                            optionClass = 'bg-indigo-950/60 border-indigo-500 text-indigo-200';
                          }

                          return (
                            <button
                              key={optIdx}
                              disabled={hasAnswered}
                              onClick={() => setSelectedAnswers({ ...selectedAnswers, [qIdx]: optIdx })}
                              className={`w-full text-left p-3 rounded-xl border text-xs leading-relaxed transition flex items-center justify-between ${optionClass}`}
                            >
                              <span>{opt}</span>
                              {hasAnswered && isTheCorrectOption && (
                                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                              )}
                              {hasAnswered && isSelected && !isCorrect && (
                                <XCircle className="w-4 h-4 text-rose-400 shrink-0 ml-2" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {hasAnswered && (
                        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-1 animate-fadeIn">
                          <span className="font-semibold text-indigo-400">Explanation:</span>
                          <p className="text-slate-300">{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Score Summary Box */}
                {Object.keys(selectedAnswers).length === quizQuestions.length && (
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-900/40 to-violet-900/40 border border-indigo-500/40 text-center space-y-2 animate-fadeIn">
                    <Award className="w-8 h-8 text-amber-400 mx-auto" />
                    <h3 className="text-base font-bold text-white">
                      Quiz Completed: {calculateScore()} / {quizQuestions.length} Correct
                    </h3>
                    <p className="text-xs text-slate-300">
                      {calculateScore() === quizQuestions.length
                        ? 'Mastery achieved! Excellent retention of the uploaded notes.'
                        : 'Review the explanations above or ask the Study QA agent for clarification.'}
                    </p>
                    <button
                      onClick={fetchQuiz}
                      className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition inline-flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Generate New Quiz Set
                    </button>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
