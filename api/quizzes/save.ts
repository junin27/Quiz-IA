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

  const { topic, difficulty, questions } = req.body || {};

  if (!topic || !difficulty || !questions || !Array.isArray(questions)) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Parâmetros topic, difficulty e questions (array) são obrigatórios.' }));
    return;
  }

  try {
    const userId = await validateToken(req.headers.authorization);

    const quiz = await prisma.quiz.create({
      data: {
        createdBy: userId,
        topic,
        difficulty,
        questions
      }
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(quiz));
  } catch (err: any) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message || 'Erro ao salvar quiz.' }));
  }
}
