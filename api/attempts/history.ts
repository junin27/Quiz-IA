import type { IncomingMessage, ServerResponse } from 'http';
import { handleCors } from '../_lib/corsMiddleware';
import { handleRateLimit } from '../_lib/rateLimitMiddleware';
import { prisma } from '../_lib/prisma';
import { validateToken } from '../_lib/authMiddleware';

interface VercelRequest extends IncomingMessage {
  body: any;
  query: any;
  cookies: any;
}

interface VercelResponse extends ServerResponse {
  send: (body: any) => VercelResponse;
  json: (jsonBody: any) => VercelResponse;
  status: (statusCode: number) => VercelResponse;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (handleRateLimit(req, res)) return;

  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const userId = await validateToken(req.headers.authorization);

    // Buscar todas as tentativas do usuário com os dados do respectivo quiz
    const attempts = await prisma.quizAttempt.findMany({
      where: {
        userId: userId,
      },
      include: {
        quiz: true,
      },
      orderBy: {
        completedAt: 'desc',
      },
    });

    // Formatar histórico para o formato esperado pelo front-end
    const formattedAttempts = attempts.map((item: any) => {
      const topic = item.quiz?.topic || 'Quiz';
      const difficulty = item.quiz?.difficulty || 'Médio';
      const questions = (item.quiz?.questions as any) || [];

      return {
        id: item.id,
        userId: item.userId,
        topic,
        difficulty,
        questionsTotal: item.questionsTotal,
        questionsCorrect: item.questionsCorrect,
        percentageCorrect: parseFloat(item.percentageCorrect.toString()),
        totalScore: parseFloat(item.totalScore.toString()),
        timeSpent: item.timeSpent,
        answers: item.answers,
        createdAt: item.completedAt,
        completedAt: item.completedAt,
        roomId: item.roomId || undefined,
        quizQuestions: questions,
      };
    });

    // Calcular estatísticas agregadas no backend
    let highestScore = 0;
    let lowestScore = Infinity;
    let totalTime = 0;
    let totalAccuracy = 0;
    const topicCounts: Record<string, number> = {};

    formattedAttempts.forEach((item: any) => {
      const scoreVal = item.totalScore;
      const accuracyVal = item.percentageCorrect;
      const timeVal = item.timeSpent;
      const topic = item.topic;

      if (scoreVal > highestScore) highestScore = scoreVal;
      if (scoreVal < lowestScore) lowestScore = scoreVal;

      totalTime += timeVal;
      totalAccuracy += accuracyVal;
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    });

    let favoriteTopic = 'Nenhum';
    let favoriteCount = 0;
    for (const [topic, count] of Object.entries(topicCounts)) {
      if (count > favoriteCount) {
        favoriteTopic = topic;
        favoriteCount = count;
      }
    }

    const stats = {
      totalQuizzesPlayed: formattedAttempts.length,
      highestScore,
      lowestScore: lowestScore === Infinity ? 0 : lowestScore,
      favoriteTopic,
      averageTimeSpent: formattedAttempts.length > 0 ? Math.round(totalTime / formattedAttempts.length) : 0,
      averageAccuracy: formattedAttempts.length > 0 ? parseFloat((totalAccuracy / formattedAttempts.length).toFixed(2)) : 0,
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      attempts: formattedAttempts,
      stats,
    }));
  } catch (err: any) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message || 'Erro ao obter histórico do usuário.' }));
  }
}
