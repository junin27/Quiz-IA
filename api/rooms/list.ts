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

    // Buscar salas onde o usuário é membro e que não expiraram
    const members = await prisma.roomMember.findMany({
      where: {
        userId,
        room: {
          expiresAt: { gt: new Date() }
        }
      },
      include: {
        room: true
      }
    });

    const rooms = members.map((m: any) => ({
      id: m.room.id,
      code: m.room.code,
      ownerId: m.room.ownerId,
      maxGuests: m.room.maxGuests,
      activeQuizId: m.room.activeQuizId,
      createdAt: m.room.createdAt,
      expiresAt: m.room.expiresAt
    }));

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(rooms));
  } catch (err: any) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message || 'Erro ao carregar salas do usuário.' }));
  }
}
