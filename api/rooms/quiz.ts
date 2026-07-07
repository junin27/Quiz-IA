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

  const { action, roomId } = req.body || {};

  if (!action || !roomId || (action !== 'start' && action !== 'end')) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Parâmetros action ("start" ou "end") e roomId são obrigatórios.' }));
    return;
  }

  try {
    const actingUserId = await validateToken(req.headers.authorization);

    // 1. Validar se quem executa é dono ou líder
    const member = await prisma.roomMember.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId: actingUserId
        }
      }
    });

    if (!member || (member.role !== 'owner' && member.role !== 'leader')) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Acesso negado: Apenas o dono ou líderes podem iniciar/finalizar quizzes.' }));
      return;
    }

    if (action === 'start') {
      const { topic, difficulty, questions } = req.body || {};
      if (!topic || !difficulty || !questions || !Array.isArray(questions)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Parâmetros topic, difficulty e questions (array) são obrigatórios para iniciar o quiz.' }));
        return;
      }

      // Criar o quiz no banco
      const quiz = await prisma.quiz.create({
        data: {
          createdBy: actingUserId,
          topic,
          difficulty,
          questions
        }
      });

      // Atualizar a sala com o quiz ativo
      await prisma.room.update({
        where: { id: roomId },
        data: { activeQuizId: quiz.id }
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ quizId: quiz.id }));
      return;
    }

    if (action === 'end') {
      // Finalizar quiz ativo da sala
      await prisma.room.update({
        where: { id: roomId },
        data: { activeQuizId: null }
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      return;
    }
  } catch (err: any) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message || 'Erro ao gerenciar quiz na sala.' }));
  }
}
