import bcrypt from 'bcryptjs';
import { sessionStore } from './sessionStore';
import { CONFIG } from '../config';
import type { LeaderboardEntry, DifficultyLevel } from '../types/quiz.types';
import type { AdminLog } from '../types/storage.types';

const RESET_SPAM_WINDOW_MS = 60 * 60 * 1000; // 1 hora em ms

/**
 * Compara a senha fornecida com o hash bcrypt armazenado no ambiente.
 * Lança erro se VITE_ADMIN_PASSWORD_HASH não estiver configurado.
 */
async function verifyAdminPassword(password: string): Promise<boolean> {
  const hash = import.meta.env.VITE_ADMIN_PASSWORD_HASH ?? '';
  if (!hash) {
    throw new Error(
      'VITE_ADMIN_PASSWORD_HASH não está configurado no ambiente. '
      + 'Gere um hash bcrypt com `node -e "const b=require(\'bcryptjs\'); b.hash(\'sua-senha\',10).then(console.log)"` '
      + 'e adicione ao .env.'
    );
  }
  return bcrypt.compare(password, hash);
}

export function maskUserName(fullName: string): string {
  if (fullName.length < 2) {
    return '***';
  }
  return fullName.slice(0, 2) + '***';
}

/**
 * Valida a senha de administrador e executa o arquivamento do Leaderboard.
 * 
 * Exemplo de uso:
 * ```typescript
 * const success = await tryResetLeaderboard("admin-secret"); // true
 * ```
 */
export async function tryResetLeaderboard(password: string): Promise<boolean> {
  const isValid = await verifyAdminPassword(password);
  if (!isValid) {
    throw new Error('Senha administrativa inválida.');
  }

  // Previne spam: verifica se houve reset nos últimos 60 minutos
  const logs = sessionStore.getAdminLogs();
  const lastReset = logs
    .filter(log => log.action === 'LEADERBOARD_RESET')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

  if (lastReset && Date.now() - new Date(lastReset.timestamp).getTime() < RESET_SPAM_WINDOW_MS) {
    throw new Error('Limite de reset atingido. Permitido apenas 1 reset por hora.');
  }

  const activeScores = sessionStore.getAllScores();
  sessionStore.archiveScores();

  const adminLog: AdminLog = {
    action: 'LEADERBOARD_RESET',
    timestamp: new Date().toISOString(),
    count: activeScores.length
  };
  sessionStore.addAdminLog(adminLog);

  return true;
}

/**
 * Retorna os top 5 jogadores filtrados por tópico e/ou dificuldade.
 */
export function getLeaderboard(
  topic?: string,
  difficulty?: DifficultyLevel
): LeaderboardEntry[] {
  const scores = sessionStore.getAllScores()
    .filter(s => !s.archived)
    .filter(s => !topic || s.topic.toLowerCase() === topic.toLowerCase())
    .filter(s => {
      if (!difficulty) return true;
      if (CONFIG.FAIR_MODE) {
        const diffVal = parseInt(s.difficulty, 10);
        if (!isNaN(diffVal)) {
          if (difficulty === 'easy') return diffVal <= 3;
          if (difficulty === 'medium') return diffVal >= 4 && diffVal <= 6;
          if (difficulty === 'hard') return diffVal >= 7;
        }
      }
      return s.difficulty === difficulty;
    });

  // Agrupa por userId e pega a pontuação mais alta de cada usuário
  const userHighestScores: Record<string, typeof scores[0]> = {};
  for (const score of scores) {
    const existing = userHighestScores[score.userId];
    if (!existing || score.totalScore > existing.totalScore) {
      userHighestScores[score.userId] = score;
    }
  }

  return Object.values(userHighestScores)
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 5)
    .map((score, index) => {
      const user = sessionStore.getUser(score.userId);
      const name = user ? user.name : 'Jogador não informado';
      const email = user ? user.email : '';
      const displayEmail = (!email || email.startsWith('guest_')) ? 'Email não informado' : email;
      const displayName = CONFIG.FAIR_MODE ? name : maskUserName(name);
      return {
        position: index + 1,
        userId: score.userId,
        userName: displayName,
        userEmail: displayEmail,
        score: score.totalScore,
        topic: score.topic,
        difficulty: score.difficulty,
        completedAt: score.completedAt
      };
    });
}
