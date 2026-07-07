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

function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (handleRateLimit(req, res)) return;

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    // 1. Validar token
    const ownerId = await validateToken(req.headers.authorization);

    // 2. Tentar inserir e gerar um código único
    let room = null;
    let attempts = 0;
    while (!room && attempts < 5) {
      const code = generateRoomCode();
      try {
        room = await prisma.room.create({
          data: {
            code,
            ownerId,
            members: {
              create: {
                userId: ownerId,
                role: 'owner',
                status: 'active'
              }
            }
          }
        });
      } catch (err: any) {
        // Código duplicado, tenta novamente
        if (err.code === 'P2002') {
          attempts++;
        } else {
          throw err;
        }
      }
    }

    if (!room) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Erro ao gerar código de sala exclusivo.' }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(room));
  } catch (err: any) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message || 'Erro ao processar requisição.' }));
  }
}
