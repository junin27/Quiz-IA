import { useState } from 'react';
import type { User } from '../types/user.types';
import type { QuizQuestion, DifficultyLevel, QuizAnswer } from '../types/quiz.types';
import type { LLMProvider } from '../types/apiKey.types';
import type { BlendedQuizOptions } from '../components/Quiz/QuizSetup';
import { decryptApiKey } from '../utils/encryption';
import { generateQuizQuestions } from '../services/llmService';
import { multiSourceTriviaService } from '../services/multiSourceTriviaService';
import { translateText } from '../services/translationService';
import { saveQuizQuestions, saveQuizResult } from '../services/scoreManager';
import { roomService } from '../services/roomService';
import { supabase } from '../lib/supabaseClient';

// ─── Tipos públicos ────────────────────────────────────────────────────────────

export interface RagPayload {
  text: string;
  images: Array<{ mimeType: string; base64Data: string }>;
}

interface QuizSessionState {
  quizQuestions: QuizQuestion[];
  currentQuestionIndex: number;
  questionTimes: Record<number, number>;
  correctAnswersMap: Record<number, boolean>;
  questionsCorrectCount: number;
  quizTopic: string;
  quizDifficulty: DifficultyLevel;
  quizId: string | null;
  answersList: QuizAnswer[];
  activeRoomId: string | null;
}

export interface UseQuizSessionReturn extends QuizSessionState {
  startSoloQuiz: (
    topic: string,
    difficulty: DifficultyLevel,
    count: number,
    currentUser: User,
    currentUserPassword: string,
    isTriviaMode: boolean,
    options?: BlendedQuizOptions
  ) => Promise<void>;
  startRoomQuiz: (
    topic: string,
    difficulty: DifficultyLevel,
    count: number,
    currentUser: User,
    currentUserPassword: string,
    options?: BlendedQuizOptions
  ) => Promise<void>;
  handleAnswerSelected: (selectedIndex: number, timeSpent: number, isCorrect: boolean) => void;
  handleNextQuestion: () => Promise<'continue' | 'finished'>;
  handleActiveQuizStarted: (startedQuizId: string) => Promise<void>;
  resetQuizState: () => void;
  setActiveRoomId: (id: string | null) => void;
}

// ─── Helpers internos ──────────────────────────────────────────────────────────

function buildRagPayload(options: BlendedQuizOptions): RagPayload | undefined {
  const ragFiles = options.ragFiles;
  if (!ragFiles || ragFiles.length === 0) return undefined;

  const successfulFiles = ragFiles.filter((f) => f.status === 'success');
  if (successfulFiles.length === 0) return undefined;

  return {
    text: successfulFiles.map((f) => `--- ARQUIVO: ${f.name} ---\n${f.text}`).join('\n\n'),
    images: successfulFiles.flatMap((f) => f.images),
  };
}

function buildPercentages(
  options?: BlendedQuizOptions
): { ia: number; rag: number; exam: number } | undefined {
  if (!options) return undefined;
  return { ia: options.iaPercent, rag: options.ragPercent, exam: options.examPercent };
}

async function resolveApiCredentials(
  currentUser: User,
  currentUserPassword: string
): Promise<{ apiKeyPlain: string; provider: LLMProvider; modelId: string | undefined }> {
  let apiKeyPlain = localStorage.getItem('quiz_app_global_api_key') ?? '';
  let provider = (localStorage.getItem('quiz_app_global_api_provider') ?? 'gemini') as LLMProvider;
  let modelId: string | undefined = localStorage.getItem('quiz_app_global_api_modelId') ?? undefined;

  if (!apiKeyPlain && currentUser.apiKey) {
    apiKeyPlain = await decryptApiKey(currentUser.apiKey.encryptedKey, currentUserPassword);
    provider = currentUser.apiKey.provider;
    modelId = currentUser.apiKey.modelId;
  }

  return { apiKeyPlain, provider, modelId };
}

const EMPTY_STATE: QuizSessionState = {
  quizQuestions: [],
  currentQuestionIndex: 0,
  questionTimes: {},
  correctAnswersMap: {},
  questionsCorrectCount: 0,
  quizTopic: '',
  quizDifficulty: 'medium',
  quizId: null,
  answersList: [],
  activeRoomId: null,
};

// ─── Hook principal ────────────────────────────────────────────────────────────

export function useQuizSession(): UseQuizSessionReturn {
  const [state, setState] = useState<QuizSessionState>(EMPTY_STATE);

  function resetQuizState(): void {
    setState((prev) => ({
      ...EMPTY_STATE,
      activeRoomId: prev.activeRoomId,
    }));
  }

  function setActiveRoomId(id: string | null): void {
    setState((prev) => ({ ...prev, activeRoomId: id }));
  }

  function applyQuizStart(
    questions: QuizQuestion[],
    topic: string,
    difficulty: DifficultyLevel,
    quizId: string | null,
    activeRoomId: string | null
  ): void {
    setState((prev) => ({
      ...prev,
      quizQuestions: questions,
      currentQuestionIndex: 0,
      questionTimes: {},
      correctAnswersMap: {},
      questionsCorrectCount: 0,
      answersList: [],
      quizTopic: topic,
      quizDifficulty: difficulty,
      quizId,
      activeRoomId,
    }));
  }

  async function startSoloQuiz(
    topic: string,
    difficulty: DifficultyLevel,
    count: number,
    currentUser: User,
    currentUserPassword: string,
    isTriviaMode: boolean,
    options?: BlendedQuizOptions
  ): Promise<void> {
    if (isTriviaMode) {
      await startTriviaQuiz(topic, difficulty, count);
      return;
    }
    await startLlmQuiz(topic, difficulty, count, currentUser, currentUserPassword, null, options);
  }

  async function startTriviaQuiz(
    topic: string,
    difficulty: DifficultyLevel,
    count: number
  ): Promise<void> {
    const [categoryId, areaIdsStr] = topic.includes('|') ? topic.split('|') : [topic, undefined];
    const areaIds = areaIdsStr ? areaIdsStr.split(',') : undefined;

    const triviaBankQuestions = await multiSourceTriviaService.fetchQuestionsForCategory(
      categoryId,
      areaIds,
      difficulty,
      count
    );

    if (triviaBankQuestions.length === 0) {
      throw new Error('Nenhuma questão encontrada para esta categoria. Tente outra.');
    }

    const convertedQuestions: QuizQuestion[] = await Promise.all(
      triviaBankQuestions.map(async (tbq) => {
        const questionText =
          typeof tbq.text === 'string' ? tbq.text : String(tbq.text);
        const explanation =
          typeof tbq.explanation === 'string' ? tbq.explanation : 'Resposta correta acima.';

        const [translatedQuestion, ...translatedOptions] = await Promise.all([
          translateText(questionText),
          ...((tbq.options as string[]) || []).map((opt) => translateText(opt)),
        ]);

        return {
          id: tbq.id,
          questionText: translatedQuestion || questionText,
          options: translatedOptions.length > 0 ? translatedOptions : (tbq.options as string[]),
          correctOptionIndex: tbq.correctIndex ?? 0,
          explanation: explanation,
        };
      })
    );

    const fullTopic = `Multi-Banco: ${categoryId}`;
    const qId = await saveQuizQuestions(fullTopic, difficulty, convertedQuestions);
    applyQuizStart(convertedQuestions, fullTopic, difficulty, qId, null);
  }

  async function startLlmQuiz(
    topic: string,
    difficulty: DifficultyLevel,
    count: number,
    currentUser: User,
    currentUserPassword: string,
    roomId: string | null,
    options?: BlendedQuizOptions
  ): Promise<void> {
    const { apiKeyPlain, provider, modelId } = await resolveApiCredentials(
      currentUser,
      currentUserPassword
    );

    const ragData = options ? buildRagPayload(options) : undefined;
    const percentages = buildPercentages(options);

    const questions = await generateQuizQuestions(
      apiKeyPlain,
      topic,
      difficulty,
      count,
      provider,
      modelId,
      false,
      ragData,
      percentages
    );

    if (roomId) {
      const qId = await roomService.startRoomQuiz(roomId, topic, difficulty, questions);
      applyQuizStart(questions, topic, difficulty, qId, roomId);
    } else {
      const qId = await saveQuizQuestions(topic, difficulty, questions);
      applyQuizStart(questions, topic, difficulty, qId, null);
    }
  }

  async function startRoomQuiz(
    topic: string,
    difficulty: DifficultyLevel,
    count: number,
    currentUser: User,
    currentUserPassword: string,
    options?: BlendedQuizOptions
  ): Promise<void> {
    if (!state.activeRoomId) {
      throw new Error('Nenhuma sala ativa selecionada para iniciar o quiz.');
    }
    await startLlmQuiz(topic, difficulty, count, currentUser, currentUserPassword, state.activeRoomId, options);
  }

  function handleAnswerSelected(
    selectedIndex: number,
    timeSpent: number,
    isCorrect: boolean
  ): void {
    setState((prev) => {
      const question = prev.quizQuestions[prev.currentQuestionIndex];
      const newAnswer: QuizAnswer = {
        questionId: question.id,
        selectedOptionIndex: selectedIndex,
        isCorrect,
      };
      return {
        ...prev,
        questionTimes: { ...prev.questionTimes, [prev.currentQuestionIndex]: timeSpent },
        correctAnswersMap: { ...prev.correctAnswersMap, [prev.currentQuestionIndex]: isCorrect },
        answersList: [...prev.answersList, newAnswer],
        questionsCorrectCount: isCorrect ? prev.questionsCorrectCount + 1 : prev.questionsCorrectCount,
      };
    });
  }

  async function handleNextQuestion(): Promise<'continue' | 'finished'> {
    const { currentQuestionIndex, quizQuestions } = state;

    if (currentQuestionIndex + 1 < quizQuestions.length) {
      setState((prev) => ({ ...prev, currentQuestionIndex: prev.currentQuestionIndex + 1 }));
      return 'continue';
    }

    // Última questão — salvar resultado
    const totalTime = Object.values(state.questionTimes).reduce((acc, t) => acc + t, 0);
    await saveQuizResult(
      state.quizId!,
      state.activeRoomId ?? undefined,
      state.quizTopic,
      state.quizDifficulty,
      quizQuestions.length,
      state.questionsCorrectCount,
      totalTime,
      state.questionTimes,
      state.correctAnswersMap,
      state.answersList
    );

    return 'finished';
  }

  async function handleActiveQuizStarted(startedQuizId: string): Promise<void> {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', startedQuizId)
      .single();

    if (error || !data) {
      throw new Error('Falha ao obter questões do quiz iniciado na sala.');
    }

    applyQuizStart(
      data.questions as QuizQuestion[],
      data.topic as string,
      data.difficulty as DifficultyLevel,
      startedQuizId,
      state.activeRoomId
    );
  }

  return {
    ...state,
    startSoloQuiz,
    startRoomQuiz,
    handleAnswerSelected,
    handleNextQuestion,
    handleActiveQuizStarted,
    resetQuizState,
    setActiveRoomId,
  };
}
