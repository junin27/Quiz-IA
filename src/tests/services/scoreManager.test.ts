import { describe, it, expect, vi, afterEach } from 'vitest';
import { saveQuizQuestions, saveQuizResult } from '../../services/scoreManager';
import type { QuizAnswer } from '../../types/quiz.types';

// Mock do supabaseClient para getAuthHeader
vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      }),
    },
  },
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

afterEach(() => {
  mockFetch.mockReset();
});

// ─── saveQuizQuestions ─────────────────────────────────────────────────────────

describe('saveQuizQuestions', () => {
  it('faz POST em /api/quizzes/save e retorna o id gerado pelo servidor', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'quiz-id-123' }),
    });

    const id = await saveQuizQuestions('Matemática', 'medium', [
      {
        id: 'q1',
        questionText: 'Quanto é 2+2?',
        options: ['3', '4', '5', '6'],
        correctOptionIndex: 1,
        explanation: 'Dois mais dois é quatro.',
      },
    ]);

    expect(id).toBe('quiz-id-123');
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/quizzes/save',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      })
    );
  });

  it('lança erro com mensagem do servidor quando resposta não é ok', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Quiz inválido' }),
    });

    await expect(
      saveQuizQuestions('Topico', 'easy', [])
    ).rejects.toThrow('Quiz inválido');
  });

  it('lança erro genérico quando o body de erro não tem campo error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    });

    await expect(
      saveQuizQuestions('Topico', 'easy', [])
    ).rejects.toThrow('Erro ao salvar quiz no banco.');
  });
});

// ─── saveQuizResult ────────────────────────────────────────────────────────────

describe('saveQuizResult', () => {
  const baseAttemptResponse = {
    id: 'attempt-1',
    userId: 'user-1',
    questionsTotal: 5,
    questionsCorrect: 4,
    percentageCorrect: 80,
    totalScore: 400,
    timeSpent: 60,
    answers: [] as QuizAnswer[],
    completedAt: '2024-01-01T00:00:00.000Z',
    roomId: null,
  };

  it('faz POST em /api/attempts/save e retorna Score mapeado corretamente', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(baseAttemptResponse),
    });

    const score = await saveQuizResult(
      'quiz-1',
      undefined,
      'Python',
      'medium',
      5,
      4,
      60,
      { 0: 10, 1: 12, 2: 8, 3: 15, 4: 9 },
      { 0: true, 1: true, 2: false, 3: true, 4: true },
      []
    );

    expect(score.id).toBe('attempt-1');
    expect(score.topic).toBe('Python');
    expect(score.questionsCorrect).toBe(4);
    expect(score.roomId).toBeUndefined();
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/attempts/save',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('calcula totalScore corretamente com base nos tempos e acertos', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ...baseAttemptResponse, totalScore: 0 }),
    });

    // Apenas verificamos que a chamada ao servidor é feita com o totalScore calculado
    await saveQuizResult(
      'quiz-1',
      undefined,
      'Fisica',
      'hard',
      2,
      2,
      30,
      { 0: 10, 1: 15 },
      { 0: true, 1: true },
      []
    );

    const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    // totalScore deve ser > 0 pois ambas as questões estão corretas
    expect(requestBody.totalScore).toBeGreaterThan(0);
  });

  it('lança erro quando servidor retorna falha', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Falha de banco' }),
    });

    await expect(
      saveQuizResult('quiz-1', undefined, 'Topico', 'easy', 1, 0, 10, {}, {}, [])
    ).rejects.toThrow('Falha de banco');
  });
});
