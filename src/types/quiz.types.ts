import { z } from 'zod';

export type DifficultyLevel = 'easy' | 'medium' | 'hard' | string;

export const quizQuestionSchema = z.object({
  id: z.string(),
  questionText: z.string(),
  options: z.array(z.string()).length(4),
  correctOptionIndex: z.number().int().min(0).max(3),
  explanation: z.string(),
  isPopularExam: z.boolean().optional(),
});

export const quizQuestionsSchema = z.array(quizQuestionSchema);

export interface QuizQuestion {
  id: string;
  questionText: string;
  options: string[]; // precisely 4 alternatives (A, B, C, D)
  correctOptionIndex: number; // 0 to 3
  explanation: string;
  isPopularExam?: boolean;
}

export interface RagImage {
  mimeType: string;
  base64Data: string;
}

export interface RagFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'loading' | 'success' | 'error';
  errorMessage?: string;
  text: string;
  images: RagImage[];
}

export interface QuizAnswer {
  questionId: string;
  selectedOptionIndex: number;
  isCorrect: boolean;
}

export interface Score {
  id: string;
  userId: string;
  topic: string;
  difficulty: DifficultyLevel;
  questionsTotal: number;
  questionsCorrect: number;
  percentageCorrect: number;
  totalScore: number;
  timeSpent: number; // in seconds
  answers: QuizAnswer[]; // Histórico detalhado de respostas
  createdAt: string;
  completedAt: string;
  roomId?: string; // Se jogado em uma sala
  archived?: boolean;
  archivedAt?: string;
}

export interface LeaderboardEntry {
  position: number;
  userId: string;
  userName: string;
  userEmail: string;
  score: number;
  topic: string;
  difficulty: DifficultyLevel;
  completedAt: string;
}

// ─── Interfaces das Salas de Quiz ─────────────────────────────────────────────

export interface Room {
  id: string;
  code: string;
  ownerId: string;
  maxGuests: number;
  activeQuizId: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface RoomMember {
  userId: string;
  name: string;
  email: string;
  role: 'owner' | 'leader' | 'member';
  status: 'active' | 'absent';
  joinedAt: string;
}

export interface RoomStats {
  mostPlayedTopic: string;
  mostPlayedTopicCount: number;
  averageTimes: { userId: string; name: string; email: string; averageTime: number }[];
  fastestMember: { userId: string; name: string; email: string; averageTime: number } | null;
  highestAccuracy: { userId: string; name: string; email: string; averageAccuracy: number } | null;
  highestErrorRate: { userId: string; name: string; email: string; averageAccuracy: number } | null;
}
