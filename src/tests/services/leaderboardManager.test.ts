import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getLeaderboard, tryResetLeaderboard, maskUserName } from '../../services/leaderboardManager';
import { sessionStore } from '../../services/sessionStore';
import { CONFIG } from '../../config';
import type { User } from '../../types/user.types';
import type { Score } from '../../types/quiz.types';

import bcrypt from 'bcryptjs';

describe('LeaderboardManager Tests', () => {
  beforeEach(() => {
    sessionStore.clearAll();
    CONFIG.FAIR_MODE = false;
    const testHash = bcrypt.hashSync('admin-secret', 10);
    vi.stubEnv('VITE_ADMIN_PASSWORD_HASH', testHash);
  });

  it('should mask user name correctly', () => {
    expect(maskUserName('Joao Silva')).toBe('Jo***');
    expect(maskUserName('A')).toBe('***');
    expect(maskUserName('Al')).toBe('Al***');
  });

  it('should list top 5 players sorted by high score', () => {
    // Register some users
    const users: User[] = [
      { id: 'u1', name: 'User One', email: 'u1@ex.com', passwordHash: 'hash', emailVerified: true, createdAt: '' },
      { id: 'u2', name: 'User Two', email: 'u2@ex.com', passwordHash: 'hash', emailVerified: true, createdAt: '' },
      { id: 'u3', name: 'User Three', email: 'u3@ex.com', passwordHash: 'hash', emailVerified: true, createdAt: '' },
      { id: 'u4', name: 'User Four', email: 'u4@ex.com', passwordHash: 'hash', emailVerified: true, createdAt: '' },
      { id: 'u5', name: 'User Five', email: 'u5@ex.com', passwordHash: 'hash', emailVerified: true, createdAt: '' },
      { id: 'u6', name: 'User Six', email: 'u6@ex.com', passwordHash: 'hash', emailVerified: true, createdAt: '' },
    ];

    for (const u of users) {
      sessionStore.saveUser(u);
    }

    // Save some scores
    const scores: Score[] = [
      { id: 's1', userId: 'u1', topic: 'Python', difficulty: 'easy', questionsTotal: 5, questionsCorrect: 5, percentageCorrect: 100, totalScore: 500, timeSpent: 20, createdAt: '', completedAt: '', answers: [] },
      { id: 's2', userId: 'u2', topic: 'Python', difficulty: 'easy', questionsTotal: 5, questionsCorrect: 4, percentageCorrect: 80, totalScore: 400, timeSpent: 25, createdAt: '', completedAt: '', answers: [] },
      { id: 's3', userId: 'u3', topic: 'Python', difficulty: 'easy', questionsTotal: 5, questionsCorrect: 3, percentageCorrect: 60, totalScore: 300, timeSpent: 30, createdAt: '', completedAt: '', answers: [] },
      { id: 's4', userId: 'u4', topic: 'Python', difficulty: 'easy', questionsTotal: 5, questionsCorrect: 2, percentageCorrect: 40, totalScore: 200, timeSpent: 35, createdAt: '', completedAt: '', answers: [] },
      { id: 's5', userId: 'u5', topic: 'Python', difficulty: 'easy', questionsTotal: 5, questionsCorrect: 1, percentageCorrect: 20, totalScore: 100, timeSpent: 40, createdAt: '', completedAt: '', answers: [] },
      { id: 's6', userId: 'u6', topic: 'Python', difficulty: 'easy', questionsTotal: 5, questionsCorrect: 5, percentageCorrect: 100, totalScore: 600, timeSpent: 10, createdAt: '', completedAt: '', answers: [] }, // highest
    ];

    for (const s of scores) {
      sessionStore.saveScore(s);
    }

    const leaderboard = getLeaderboard();
    expect(leaderboard.length).toBe(5);
    expect(leaderboard[0].userId).toBe('u6'); // highest score (600)
    expect(leaderboard[0].userName).toBe('Us***');
    expect(leaderboard[4].userId).toBe('u4'); // score 200 (score 100 is excluded because it is position 6)
  });

  it('should reset leaderboard and archive active scores', async () => {
    const user: User = { id: 'u1', name: 'User One', email: 'u1@ex.com', passwordHash: 'hash', emailVerified: true, createdAt: '' };
    sessionStore.saveUser(user);

    const score: Score = { id: 's1', userId: 'u1', topic: 'Python', difficulty: 'easy', questionsTotal: 5, questionsCorrect: 5, percentageCorrect: 100, totalScore: 500, timeSpent: 20, createdAt: '', completedAt: '', answers: [] };
    sessionStore.saveScore(score);

    const activeBefore = sessionStore.getAllScores();
    expect(activeBefore.length).toBe(1);

    // Usa bcrypt.compare internamente — o hash no ambiente de teste corresponde a 'admin-secret'
    const resetSuccess = await tryResetLeaderboard('admin-secret');
    expect(resetSuccess).toBe(true);

    const activeAfter = sessionStore.getAllScores();
    expect(activeAfter.length).toBe(0);

    const leaderboard = getLeaderboard();
    expect(leaderboard.length).toBe(0);
  });

  it('should throw error when admin password is wrong', async () => {
    await expect(tryResetLeaderboard('senha-errada')).rejects.toThrow('Senha administrativa inválida.');
  });

  it('should unmask user name and display email when CONFIG.FAIR_MODE is true', () => {
    CONFIG.FAIR_MODE = true;

    const user: User = { id: 'u_fair', name: 'Paulo Ricardo', email: 'paulo@ex.com', passwordHash: 'hash', emailVerified: true, createdAt: '' };
    sessionStore.saveUser(user);

    const score: Score = { id: 's_fair', userId: 'u_fair', topic: 'Python', difficulty: 'easy', questionsTotal: 5, questionsCorrect: 5, percentageCorrect: 100, totalScore: 500, timeSpent: 20, createdAt: '', completedAt: '', answers: [] };
    sessionStore.saveScore(score);

    const leaderboard = getLeaderboard();
    expect(leaderboard[0].userName).toBe('Paulo Ricardo');
    expect(leaderboard[0].userEmail).toBe('paulo@ex.com');

    CONFIG.FAIR_MODE = false;
  });

  it('should display email as "Email não informado" if email starts with guest_', () => {
    CONFIG.FAIR_MODE = true;

    const user: User = { id: 'u_guest', name: 'Jogador não informado', email: 'guest_1234@feira.local', passwordHash: 'hash', emailVerified: true, createdAt: '' };
    sessionStore.saveUser(user);

    const score: Score = { id: 's_guest', userId: 'u_guest', topic: 'Python', difficulty: 'easy', questionsTotal: 5, questionsCorrect: 5, percentageCorrect: 100, totalScore: 500, timeSpent: 20, createdAt: '', completedAt: '', answers: [] };
    sessionStore.saveScore(score);

    const leaderboard = getLeaderboard();
    expect(leaderboard[0].userName).toBe('Jogador não informado');
    expect(leaderboard[0].userEmail).toBe('Email não informado');

    CONFIG.FAIR_MODE = false;
  });

  it('should clear only specific user scores when clearUserScores is called', () => {
    const user1: User = { id: 'u1', name: 'User One', email: 'u1@ex.com', passwordHash: 'hash', emailVerified: true, createdAt: '' };
    const user2: User = { id: 'u2', name: 'User Two', email: 'u2@ex.com', passwordHash: 'hash', emailVerified: true, createdAt: '' };
    sessionStore.saveUser(user1);
    sessionStore.saveUser(user2);

    const score1: Score = { id: 's1', userId: 'u1', topic: 'Python', difficulty: 'easy', questionsTotal: 5, questionsCorrect: 5, percentageCorrect: 100, totalScore: 500, timeSpent: 20, createdAt: '', completedAt: '', answers: [] };
    const score2: Score = { id: 's2', userId: 'u2', topic: 'Python', difficulty: 'easy', questionsTotal: 5, questionsCorrect: 5, percentageCorrect: 100, totalScore: 400, timeSpent: 20, createdAt: '', completedAt: '', answers: [] };
    sessionStore.saveScore(score1);
    sessionStore.saveScore(score2);

    expect(sessionStore.getScores('u1').length).toBe(1);
    expect(sessionStore.getScores('u2').length).toBe(1);

    sessionStore.clearUserScores('u1');

    expect(sessionStore.getScores('u1').length).toBe(0);
    expect(sessionStore.getScores('u2').length).toBe(1);
  });

  it('should filter leaderboard scores on numeric difficulty correctly when CONFIG.FAIR_MODE is true', () => {
    CONFIG.FAIR_MODE = true;

    const user: User = { id: 'u_num', name: 'Num User', email: 'num@ex.com', passwordHash: 'hash', emailVerified: true, createdAt: '' };
    sessionStore.saveUser(user);

    const score3: Score = { id: 's3', userId: 'u_num', topic: 'Python', difficulty: '3', questionsTotal: 5, questionsCorrect: 5, percentageCorrect: 100, totalScore: 300, timeSpent: 20, createdAt: '', completedAt: '', answers: [] };
    const score5: Score = { id: 's5', userId: 'u_num', topic: 'Python', difficulty: '5', questionsTotal: 5, questionsCorrect: 5, percentageCorrect: 100, totalScore: 500, timeSpent: 20, createdAt: '', completedAt: '', answers: [] };
    const score8: Score = { id: 's8', userId: 'u_num', topic: 'Python', difficulty: '8', questionsTotal: 5, questionsCorrect: 5, percentageCorrect: 100, totalScore: 800, timeSpent: 20, createdAt: '', completedAt: '', answers: [] };
    
    sessionStore.saveScore(score3);
    sessionStore.saveScore(score5);
    sessionStore.saveScore(score8);

    const lbEasy = getLeaderboard(undefined, 'easy');
    expect(lbEasy.length).toBe(1);
    expect(lbEasy[0].score).toBe(300);

    const lbMedium = getLeaderboard(undefined, 'medium');
    expect(lbMedium.length).toBe(1);
    expect(lbMedium[0].score).toBe(500);

    const lbHard = getLeaderboard(undefined, 'hard');
    expect(lbHard.length).toBe(1);
    expect(lbHard[0].score).toBe(800);

    CONFIG.FAIR_MODE = false;
  });
});
