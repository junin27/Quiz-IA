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

  // ─── GET: LISTAR MEMBROS ───────────────────────────────────────────────────
  if (req.method === 'GET') {
    const urlParams = new URLSearchParams(req.url?.split('?')[1]);
    const roomId = urlParams.get('roomId');

    if (!roomId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Parâmetro roomId obrigatório.' }));
      return;
    }

    try {
      await validateToken(req.headers.authorization);

      const members = await prisma.roomMember.findMany({
        where: { roomId },
        include: {
          profile: {
            select: {
              name: true,
              email: true
            }
          }
        },
        orderBy: { joinedAt: 'asc' }
      });

      const formatted = members.map((m: any) => ({
        userId: m.userId,
        role: m.role,
        status: m.status,
        joinedAt: m.joinedAt,
        name: m.profile.name,
        email: m.profile.email
      }));

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(formatted));
    } catch (err: any) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // ─── POST: ATUALIZAR / KICK / PROMOVER ──────────────────────────────────────
  if (req.method === 'POST') {
    const { action, roomId, targetUserId } = req.body || {};

    if (!action || !roomId || !targetUserId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Parâmetros inválidos (action, roomId, targetUserId necessários).' }));
      return;
    }

    try {
      const actingUserId = await validateToken(req.headers.authorization);

      // Carregar cargos e permissões
      const membersInDb = await prisma.roomMember.findMany({
        where: {
          roomId,
          userId: { in: [actingUserId, targetUserId] }
        }
      });

      const actor = membersInDb.find((m: any) => m.userId === actingUserId);
      const target = membersInDb.find((m: any) => m.userId === targetUserId);

      if (!actor) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Acesso negado: Você não pertence a esta sala.' }));
        return;
      }

      const isSelf = actingUserId === targetUserId;
      const isOwnerActor = actor.role === 'owner';
      const isLeaderActor = actor.role === 'leader';
      const isTargetOwner = target?.role === 'owner';
      const isTargetLeader = target?.role === 'leader';

      // 1. AÇÃO: SAIR OU DELETAR SALA
      if (action === 'leave' || (action === 'kick' && isSelf)) {
        if (isOwnerActor) {
          // Se o dono sai/deleta, a sala inteira expira/é deletada
          await prisma.room.delete({ where: { id: roomId } });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Sala encerrada pelo dono.' }));
        } else {
          // Membro saindo comum
          await prisma.roomMember.delete({
            where: { roomId_userId: { roomId, userId: actingUserId } }
          });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Você saiu da sala.' }));
        }
        return;
      }

      // Validar alvo existente para as outras ações
      if (!target) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Membro alvo não encontrado na sala.' }));
        return;
      }

      // 2. AÇÃO: PROMOVER / REBAIXAR (role)
      if (action === 'promote' || action === 'demote') {
        if (!isOwnerActor) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Apenas o dono da sala pode promover ou rebaixar membros.' }));
          return;
        }

        const newRole = action === 'promote' ? 'leader' : 'member';
        await prisma.roomMember.update({
          where: { roomId_userId: { roomId, userId: targetUserId } },
          data: { role: newRole }
        });
      }

      // 3. AÇÃO: MARCAR AUSENTE/ATIVO (status)
      else if (action === 'status') {
        const { status } = req.body || {};
        if (status !== 'active' && status !== 'absent') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Status deve ser active ou absent.' }));
          return;
        }

        // Hierarquia: próprio usuario, ou owner, ou leader (desde que nao seja do owner)
        if (isSelf || isOwnerActor || (isLeaderActor && !isTargetOwner)) {
          await prisma.roomMember.update({
            where: { roomId_userId: { roomId, userId: targetUserId } },
            data: { status }
          });
        } else {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Permissões insuficientes para alterar status do membro.' }));
          return;
        }
      }

      // 4. AÇÃO: EXPULSAR (kick)
      else if (action === 'kick') {
        // Hierarquia: owner kicka qualquer um, leader kicka apenas member
        if (isOwnerActor || (isLeaderActor && !isTargetOwner && !isTargetLeader)) {
          await prisma.roomMember.delete({
            where: { roomId_userId: { roomId, userId: targetUserId } }
          });
        } else {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Hierarquia insuficiente para expulsar este membro.' }));
          return;
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (err: any) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message || 'Erro ao processar alteração de membros.' }));
    }
    return;
  }

  res.writeHead(405, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Method not allowed' }));
}
