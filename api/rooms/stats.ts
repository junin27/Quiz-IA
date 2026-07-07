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
    res.end(JSON.stringify({ error: 'Parâmetro roomId obrigatório.' }));
    return;
  }

  try {
    // Validar token
    await validateToken(req.headers.authorization);

    // Buscar todas as tentativas da sala
    const attempts = await prisma.quizAttempt.findMany({
      where: { roomId },
      include: {
        profile: {
          select: {
            name: true,
            email: true
          }
        },
        quiz: {
          select: {
            topic: true
          }
        }
      }
    });

    if (attempts.length === 0) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        mostPlayedTopic: 'Nenhum jogado ainda',
        mostPlayedTopicCount: 0,
        averageTimes: [],
        fastestMember: null,
        highestAccuracy: null,
        highestErrorRate: null
      }));
      return;
    }

    // 1. Tema mais feito
    const topicCounts: Record<string, number> = {};
    attempts.forEach((att: any) => {
      const topic = att.quiz?.topic || 'Geral';
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    });

    let mostPlayedTopic = 'Nenhum';
    let mostPlayedTopicCount = 0;
    for (const [topic, count] of Object.entries(topicCounts)) {
      if (count > mostPlayedTopicCount) {
        mostPlayedTopic = topic;
        mostPlayedTopicCount = count;
      }
    }

    // Agrupamento de dados por usuário para médias
    interface UserAgg {
      userId: string;
      name: string;
      email: string;
      totalTime: number;
      totalAccuracy: number;
      count: number;
    }

    const userAggMap: Record<string, UserAgg> = {};

    attempts.forEach((att: any) => {
      const uid = att.userId;
      const name = att.profile?.name || 'Participante';
      const email = att.profile?.email || '';

      if (!userAggMap[uid]) {
        userAggMap[uid] = {
          userId: uid,
          name,
          email,
          totalTime: 0,
          totalAccuracy: 0,
          count: 0
        };
      }

      userAggMap[uid].totalTime += att.timeSpent;
      userAggMap[uid].totalAccuracy += Number(att.percentageCorrect);
      userAggMap[uid].count += 1;
    });

    const userAggList = Object.values(userAggMap);

    // 2. Ranking de tempo médio gasto
    const averageTimes = userAggList.map((user) => ({
      userId: user.userId,
      name: user.name,
      email: user.email,
      averageTime: Math.round(user.totalTime / user.count)
    })).sort((a, b) => b.averageTime - a.averageTime); // Lento a rápido

    // 3. Usuário mais rápido
    const fastestMember = [...averageTimes].sort((a, b) => a.averageTime - b.averageTime)[0] || null;

    // 4. Maiores acertos e erros
    const accuracyList = userAggList.map((user) => ({
      userId: user.userId,
      name: user.name,
      email: user.email,
      averageAccuracy: Number((user.totalAccuracy / user.count).toFixed(2))
    }));

    const highestAccuracy = [...accuracyList].sort((a, b) => b.averageAccuracy - a.averageAccuracy)[0] || null;
    const highestErrorRate = [...accuracyList].sort((a, b) => a.averageAccuracy - b.averageAccuracy)[0] || null;

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      mostPlayedTopic,
      mostPlayedTopicCount,
      averageTimes,
      fastestMember,
      highestAccuracy,
      highestErrorRate
    }));
  } catch (err: any) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message || 'Erro ao processar estatísticas.' }));
  }
}
