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

  const urlParams = new URLSearchParams(req.url?.split('?')[1]);
  const roomId = urlParams.get('roomId');

  if (!roomId) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Parâmetro roomId é obrigatório.' }));
    return;
  }

  try {
    // Validar token JWT
    await validateToken(req.headers.authorization);

    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
        expiresAt: { gt: new Date() }
      }
    });

    if (!room) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Sala não encontrada ou expirada.' }));
      return;
    }

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
    res.end(JSON.stringify({ error: err.message || 'Erro ao carregar dados da sala.' }));
  }
}
