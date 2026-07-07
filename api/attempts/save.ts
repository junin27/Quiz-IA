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

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const {
    quizId,
    roomId,
    questionsTotal,
    questionsCorrect,
    percentageCorrect,
    totalScore,
    timeSpent,
    answers
  } = req.body || {};

  if (!quizId || questionsTotal === undefined || questionsCorrect === undefined || percentageCorrect === undefined || totalScore === undefined || timeSpent === undefined || !answers) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Parâmetros obrigatórios ausentes.' }));
    return;
  }

  try {
    const userId = await validateToken(req.headers.authorization);

    const attempt = await prisma.quizAttempt.create({
      data: {
        userId,
        quizId,
        roomId: roomId || null,
        questionsTotal: Number(questionsTotal),
        questionsCorrect: Number(questionsCorrect),
        percentageCorrect: Number(percentageCorrect),
        totalScore: Number(totalScore),
        timeSpent: Number(timeSpent),
        answers
      }
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(attempt));
  } catch (err: any) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message || 'Erro ao registrar tentativa.' }));
  }
}
