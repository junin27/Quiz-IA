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

  // Parse body
  const { code } = req.body || {};
  if (!code) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Código da sala obrigatório.' }));
    return;
  }

  try {
    const userId = await validateToken(req.headers.authorization);

    // 1. Achar a sala ativa
    const room = await prisma.room.findFirst({
      where: {
        code: code.trim().toUpperCase(),
        expiresAt: { gt: new Date() }
      },
      include: {
        members: true
      }
    });

    if (!room) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Sala não encontrada ou expirada.' }));
      return;
    }

    // 2. Verificar lotação (máx 50 convidados)
    const guestsCount = room.members.filter((m: any) => m.role !== 'owner').length;
    const isAlreadyMember = room.members.some((m: any) => m.userId === userId);

    if (guestsCount >= 50 && !isAlreadyMember) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'A sala atingiu o limite de 50 convidados.' }));
      return;
    }

    // 3. Upsert do membro
    await prisma.roomMember.upsert({
      where: {
        roomId_userId: {
          roomId: room.id,
          userId
        }
      },
      create: {
        roomId: room.id,
        userId,
        role: 'member',
        status: 'active'
      },
      update: {
        status: 'active' // Reativa se estiver ausente
      }
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      id: room.id,
      code: room.code,
      ownerId: room.ownerId,
      maxGuests: room.maxGuests,
      activeQuizId: room.activeQuizId,
      createdAt: room.createdAt,
      expiresAt: room.expiresAt
    }));
  } catch (err: any) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message || 'Erro ao entrar na sala.' }));
  }
}
