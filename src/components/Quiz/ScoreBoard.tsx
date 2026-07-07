import React, { useState, useEffect } from 'react';
import type { DifficultyLevel, QuizQuestion, Score } from '../../types/quiz.types';
import type { User } from '../../types/user.types';
import { getUserAttempts, getUserStats } from '../../services/scoreManager';
import { Button } from '../Common/Button';
import { 
  Award, 
  Clock, 
  BookOpen, 
  TrendingUp, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  XCircle, 
  Calendar,
  Target
} from 'lucide-react';

interface ScoreBoardProps {
  currentUser: User;
  onBackToSetup: () => void;
}

interface ExpandedAttempt extends Score {
  quizQuestions: QuizQuestion[];
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({
  currentUser,
  onBackToSetup
}) => {
  const [attempts, setAttempts] = useState<ExpandedAttempt[]>([]);
  const [stats, setStats] = useState<{
    totalQuizzesPlayed: number;
    highestScore: number;
    lowestScore: number;
    favoriteTopic: string;
    averageTimeSpent: number;
    averageAccuracy: number;
  } | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filtros de histórico
  const [topicFilter, setTopicFilter] = useState('');
  const [diffFilter, setDiffFilter] = useState<DifficultyLevel | ''>('');
  const [isDiffOpen, setIsDiffOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [currentUser.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [userAttempts, userStats] = await Promise.all([
        getUserAttempts(),
        getUserStats()
      ]);
      setAttempts(userAttempts);
      setStats(userStats);
    } catch (err) {
      console.error('Erro ao carregar dados do Supabase:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (attemptId: string) => {
    setExpandedId((prev) => (prev === attemptId ? null : attemptId));
  };

  // Filtrar histórico
  const filteredAttempts = attempts.filter((att) => {
    const matchesTopic = !topicFilter || att.topic.toLowerCase().includes(topicFilter.toLowerCase());
    const matchesDiff = !diffFilter || att.difficulty.toLowerCase() === diffFilter.toLowerCase();
    return matchesTopic && matchesDiff;
  });

  const optionLabels = ['A', 'B', 'C', 'D'];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold">Carregando histórico e estatísticas...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto my-6 space-y-6">
      {/* ─── CARDS DE OVERVIEW E ESTATÍSTICAS PESSOAIS ─────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card p-4 rounded-xl border border-slate-800/60 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1 mb-1">
              <Award size={12} className="text-rose-400" />
              Melhor Pontuação
            </span>
            <span className="text-2xl font-extrabold text-white font-mono">{stats.highestScore}</span>
          </div>

          <div className="glass-card p-4 rounded-xl border border-slate-800/60 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1 mb-1">
              <Target size={12} className="text-orange-400" />
              Média de Acertos
            </span>
            <span className="text-2xl font-extrabold text-orange-400 font-mono">{stats.averageAccuracy}%</span>
          </div>

          <div className="glass-card p-4 rounded-xl border border-slate-800/60 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1 mb-1">
              <BookOpen size={12} className="text-sky-400" />
              Tópico Favorito
            </span>
            <span className="text-sm font-bold text-sky-300 truncate max-w-full block pt-1">{stats.favoriteTopic}</span>
          </div>

          <div className="glass-card p-4 rounded-xl border border-slate-800/60 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1 mb-1">
              <Clock size={12} className="text-amber-400" />
              Tempo Médio
            </span>
            <span className="text-2xl font-extrabold text-white font-mono">{stats.averageTimeSpent}s</span>
          </div>
        </div>
      )}

      {/* ─── SEÇÃO DE HISTÓRICO DE QUIZZES ────────────────────────────────────── */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800/80 shadow-2xl space-y-6">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <TrendingUp size={18} className="text-rose-400" />
            Seu Histórico Detalhado
          </h3>
          <span className="text-xs text-slate-500 font-mono">Total: {attempts.length} quizzes</span>
        </div>

        {/* Filtros de Histórico */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1.5 font-bold uppercase tracking-wider text-[10px]">Tópico</label>
            <input
              type="text"
              placeholder="Filtrar por tema..."
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-white outline-none placeholder-slate-700 focus:border-rose-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1.5 font-bold uppercase tracking-wider text-[10px]">Dificuldade</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDiffOpen(!isDiffOpen)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-200 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all text-left"
              >
                <span>
                  {diffFilter === '' && 'Todas as dificuldades'}
                  {diffFilter === 'easy' && 'Fácil'}
                  {diffFilter === 'medium' && 'Médio'}
                  {diffFilter === 'hard' && 'Difícil'}
                </span>
                <svg 
                  className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isDiffOpen ? 'rotate-180 text-rose-500' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isDiffOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsDiffOpen(false)} />
                  <div className="absolute left-0 right-0 mt-1.5 bg-slate-950/95 border border-slate-800 rounded-xl shadow-xl overflow-hidden z-20 backdrop-blur-md">
                    <button
                      type="button"
                      onClick={() => { setDiffFilter(''); setIsDiffOpen(false); }}
                      className={`w-full px-4 py-2.5 text-left text-xs transition-colors hover:bg-slate-900/60 ${diffFilter === '' ? 'text-rose-400 font-bold bg-rose-500/5' : 'text-slate-300'}`}
                    >
                      Todas as dificuldades
                    </button>
                    <button
                      type="button"
                      onClick={() => { setDiffFilter('easy'); setIsDiffOpen(false); }}
                      className={`w-full px-4 py-2.5 text-left text-xs transition-colors hover:bg-slate-900/60 border-t border-slate-900/40 ${diffFilter === 'easy' ? 'text-rose-400 font-bold bg-rose-500/5' : 'text-slate-300'}`}
                    >
                      Fácil
                    </button>
                    <button
                      type="button"
                      onClick={() => { setDiffFilter('medium'); setIsDiffOpen(false); }}
                      className={`w-full px-4 py-2.5 text-left text-xs transition-colors hover:bg-slate-900/60 border-t border-slate-900/40 ${diffFilter === 'medium' ? 'text-rose-400 font-bold bg-rose-500/5' : 'text-slate-300'}`}
                    >
                      Médio
                    </button>
                    <button
                      type="button"
                      onClick={() => { setDiffFilter('hard'); setIsDiffOpen(false); }}
                      className={`w-full px-4 py-2.5 text-left text-xs transition-colors hover:bg-slate-900/60 border-t border-slate-900/40 ${diffFilter === 'hard' ? 'text-rose-400 font-bold bg-rose-500/5' : 'text-slate-300'}`}
                    >
                      Difícil
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Lista de Partidas */}
        <div className="space-y-4">
          {filteredAttempts.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <TrendingUp size={36} className="stroke-[1.5] text-slate-750 mx-auto mb-2" />
              <p className="text-sm font-semibold">Nenhum quiz encontrado.</p>
              <p className="text-xs mt-0.5">Seus quizzes salvos e estatísticas aparecerão aqui.</p>
            </div>
          ) : (
            filteredAttempts.map((attempt) => {
              const isExpanded = expandedId === attempt.id;
              
              return (
                <div
                  key={attempt.id}
                  className={`border rounded-xl overflow-hidden transition-all duration-300 ${
                    isExpanded 
                      ? 'border-rose-500/40 bg-slate-950/30 shadow-lg shadow-rose-500/[0.01]' 
                      : 'border-slate-800/80 bg-slate-950/15 hover:border-slate-700'
                  }`}
                >
                  {/* Cabeçalho da Partida (Clicável para expandir) */}
                  <button
                    onClick={() => toggleExpand(attempt.id)}
                    className="w-full flex items-center justify-between p-4 text-left transition-colors focus:outline-none"
                  >
                    <div className="flex items-center gap-4 overflow-hidden">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        attempt.percentageCorrect >= 70
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : attempt.percentageCorrect >= 40
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        <span className="font-extrabold text-sm font-mono">{attempt.percentageCorrect}%</span>
                      </div>
                      <div className="overflow-hidden">
                        <span className="font-bold text-sm text-slate-200 block truncate">{attempt.topic}</span>
                        <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-slate-500 font-medium">
                          <span className="capitalize">Dificuldade: {attempt.difficulty}</span>
                          <span>•</span>
                          <span>Acertos: {attempt.questionsCorrect}/{attempt.questionsTotal}</span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5 font-mono">
                            <Clock size={10} />
                            {attempt.timeSpent}s
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="font-extrabold text-sm font-mono text-orange-400 block">{attempt.totalScore} pts</span>
                        <span className="text-[9px] text-slate-500 flex items-center gap-1">
                          <Calendar size={10} />
                          {new Date(attempt.completedAt).toLocaleDateString()}
                        </span>
                      </div>
                      {isExpanded ? <ChevronUp size={16} className="text-rose-400" /> : <ChevronDown size={16} className="text-slate-500" />}
                    </div>
                  </button>

                  {/* Conteúdo Expandido (Histórico Detalhado de Perguntas/Erros/Acertos) */}
                  {isExpanded && (
                    <div className="border-t border-slate-900 bg-slate-950/40 p-5 space-y-6 animate-fade-in">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-2">Revisão do Quiz</h4>
                      
                      <div className="space-y-5">
                        {attempt.quizQuestions.map((q, idx) => {
                          // Encontrar a resposta do usuário para esta pergunta
                          const userAns = attempt.answers?.find((a) => a.questionId === q.id);
                          const userSelectedIdx = userAns ? userAns.selectedOptionIndex : -1;
                          const isUserCorrect = userAns ? userAns.isCorrect : false;

                          return (
                            <div key={q.id} className="p-4 bg-slate-950/60 border border-slate-900 rounded-xl space-y-3">
                              {/* Texto da Pergunta */}
                              <div className="flex items-start gap-2.5">
                                {isUserCorrect ? (
                                  <CheckCircle2 size={16} className="text-emerald-400 mt-0.5 shrink-0" />
                                ) : (
                                  <XCircle size={16} className="text-rose-400 mt-0.5 shrink-0" />
                                )}
                                <span className="text-xs font-bold text-slate-200">
                                  Questão {idx + 1}: {q.questionText}
                                </span>
                              </div>

                              {/* Alternativas */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                {q.options.map((opt, oIdx) => {
                                  const isCorrectOption = q.correctOptionIndex === oIdx;
                                  const isSelectedByUser = userSelectedIdx === oIdx;

                                  let optionStyle = 'border-slate-900 bg-slate-950/30 text-slate-550 opacity-80';
                                  if (isCorrectOption) {
                                    optionStyle = 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400 font-bold';
                                  } else if (isSelectedByUser) {
                                    optionStyle = 'border-rose-500/30 bg-rose-500/5 text-rose-400 font-bold';
                                  }

                                  return (
                                    <div key={oIdx} className={`p-2.5 border rounded-lg flex items-center gap-2 ${optionStyle}`}>
                                      <span className="font-mono bg-slate-950/80 px-1.5 py-0.5 rounded text-[10px] font-extrabold">{optionLabels[oIdx]}</span>
                                      <span className="truncate">{opt}</span>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Explicação */}
                              {q.explanation && (
                                <div className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-900/60 pt-2 mt-1">
                                  <strong className="text-slate-500">Explicação:</strong> {q.explanation}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Ações */}
      <div className="flex justify-center pt-2">
        <Button onClick={onBackToSetup} className="w-full md:w-auto flex items-center justify-center gap-2">
          <svg className="w-3.5 h-3.5 text-current shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 7 8.5 C 7 4.5, 17 4.5, 17 8.5 C 17 12.5, 12 12, 12 16" />
            <circle cx="12" cy="20.5" r="1.5" fill="currentColor" stroke="none" />
          </svg>
          Jogar Novo Quiz
        </Button>
      </div>
    </div>
  );
};
export default ScoreBoard;
