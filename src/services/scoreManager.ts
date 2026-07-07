import type { DifficultyLevel, Score, QuizQuestion, QuizAnswer } from '../types/quiz.types';
import { calculateQuestionScore } from './quizLogic';
import { getAuthHeader } from '../lib/authHeader';

/**
 * Registra o quiz gerado na tabela `quizzes` do Supabase para persistência e compartilhamento.
 */
export async function saveQuizQuestions(
  topic: string,
  difficulty: DifficultyLevel,
  questions: QuizQuestion[]
): Promise<string> {
  const authHeader = await getAuthHeader();
  const response = await fetch('/api/quizzes/save', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
    },
    body: JSON.stringify({
      topic,
      difficulty,
      questions,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Erro ao salvar quiz no banco.');
  }

  const data = await response.json();
  return data.id;
}

/**
 * Cria e persiste um registro de pontuação/tentativa no Supabase.
 */
export async function saveQuizResult(
  quizId: string,
  roomId: string | undefined,
  topic: string,
  difficulty: DifficultyLevel,
  questionsTotal: number,
  questionsCorrect: number,
  timeSpent: number,
  questionTimes: Record<number, number>,
  correctAnswersMap: Record<number, boolean>,
  answers: QuizAnswer[]
): Promise<Score> {
  // Calcular pontuação ponderada total no cliente
  let totalScore = 0;
  for (let i = 0; i < questionsTotal; i++) {
    const isCorrect = correctAnswersMap[i] || false;
    const timeUsed = questionTimes[i] || 0;
    totalScore += calculateQuestionScore(isCorrect, timeUsed, difficulty);
  }

  const percentageCorrect = Math.round((questionsCorrect / questionsTotal) * 100);

  const authHeader = await getAuthHeader();
  const response = await fetch('/api/attempts/save', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
    },
    body: JSON.stringify({
      quizId,
      roomId: roomId || null,
      questionsTotal,
      questionsCorrect,
      percentageCorrect,
      totalScore,
      timeSpent,
      answers,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Falha ao registrar pontuação do quiz.');
  }

  const data = await response.json();

  return {
    id: data.id,
    userId: data.userId,
    topic,
    difficulty,
    questionsTotal: data.questionsTotal,
    questionsCorrect: data.questionsCorrect,
    percentageCorrect: parseFloat(data.percentageCorrect.toString()),
    totalScore: parseFloat(data.totalScore.toString()),
    timeSpent: data.timeSpent,
    answers: data.answers as QuizAnswer[],
    createdAt: data.completedAt,
    completedAt: data.completedAt,
    roomId: data.roomId || undefined,
  };
}

/**
 * Busca o histórico de tentativas do usuário
 */
export async function getUserAttempts(): Promise<(Score & { quizQuestions: QuizQuestion[] })[]> {
  const authHeader = await getAuthHeader();
  const response = await fetch('/api/attempts/history', {
    method: 'GET',
    headers: authHeader,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Erro ao buscar tentativas.');
  }

  const data = await response.json();
  return data.attempts;
}

/**
 * Busca estatísticas agregadas privadas do usuário
 */
export async function getUserStats(): Promise<{
  totalQuizzesPlayed: number;
  highestScore: number;
  lowestScore: number;
  favoriteTopic: string;
  averageTimeSpent: number;
  averageAccuracy: number;
}> {
  const authHeader = await getAuthHeader();
  const response = await fetch('/api/attempts/history', {
    method: 'GET',
    headers: authHeader,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Erro ao obter estatísticas do usuário.');
  }

  const data = await response.json();
  return data.stats;
}
