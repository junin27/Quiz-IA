import { getAuthHeader } from '../lib/authHeader';
import type { Room, RoomMember, RoomStats, QuizQuestion } from '../types/quiz.types';

export class RoomService {
  /** Cria uma sala de quiz */
  async createRoom(): Promise<Room> {
    const authHeader = await getAuthHeader();
    const response = await fetch('/api/rooms/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
      },
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Falha ao criar sala de quiz.');
    }

    return response.json();
  }

  /** Entra em uma sala por meio do código */
  async joinRoom(code: string): Promise<Room> {
    const authHeader = await getAuthHeader();
    const response = await fetch('/api/rooms/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
      },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Falha ao entrar na sala.');
    }

    return response.json();
  }

  /** Retorna a sala ativa por ID */
  async getRoom(roomId: string): Promise<Room | null> {
    try {
      const authHeader = await getAuthHeader();
      const response = await fetch(`/api/rooms/get?roomId=${encodeURIComponent(roomId)}`, {
        method: 'GET',
        headers: authHeader,
      });

      if (!response.ok) return null;
      return response.json();
    } catch {
      return null;
    }
  }

  /** Retorna a lista de membros de uma sala */
  async getRoomMembers(roomId: string): Promise<RoomMember[]> {
    const authHeader = await getAuthHeader();
    const response = await fetch(`/api/rooms/members?roomId=${encodeURIComponent(roomId)}`, {
      method: 'GET',
      headers: authHeader,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Erro ao obter membros da sala.');
    }

    return response.json();
  }

  /** Promove ou rebaixa um membro na sala */
  async updateMemberRole(
    roomId: string,
    targetUserId: string,
    newRole: 'leader' | 'member'
  ): Promise<void> {
    const authHeader = await getAuthHeader();
    const response = await fetch('/api/rooms/members', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
      },
      body: JSON.stringify({
        action: newRole === 'leader' ? 'promote' : 'demote',
        roomId,
        targetUserId,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Falha ao alterar cargo.');
    }
  }

  /** Altera o status (active/absent) de um membro */
  async updateMemberStatus(
    roomId: string,
    targetUserId: string,
    newStatus: 'active' | 'absent'
  ): Promise<void> {
    const authHeader = await getAuthHeader();
    const response = await fetch('/api/rooms/members', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
      },
      body: JSON.stringify({
        action: 'status',
        roomId,
        targetUserId,
        status: newStatus,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Falha ao alterar status de presença.');
    }
  }

  /** Expulsa/Kick de um membro da sala */
  async kickMember(roomId: string, targetUserId: string, actingUserId: string): Promise<void> {
    const authHeader = await getAuthHeader();
    const action = actingUserId === targetUserId ? 'leave' : 'kick';
    const response = await fetch('/api/rooms/members', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
      },
      body: JSON.stringify({
        action,
        roomId,
        targetUserId,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Falha ao processar saída/expulsão.');
    }
  }

  /** Inicia um quiz na sala criando o registro e atualizando o active_quiz_id */
  async startRoomQuiz(
    roomId: string,
    topic: string,
    difficulty: string,
    questions: QuizQuestion[]
  ): Promise<string> {
    const authHeader = await getAuthHeader();
    const response = await fetch('/api/rooms/quiz', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
      },
      body: JSON.stringify({
        action: 'start',
        roomId,
        topic,
        difficulty,
        questions,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Erro ao iniciar o quiz na sala.');
    }

    const data = await response.json();
    return data.quizId;
  }

  /** Finaliza o quiz ativo na sala */
  async endRoomQuiz(roomId: string): Promise<void> {
    const authHeader = await getAuthHeader();
    const response = await fetch('/api/rooms/quiz', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
      },
      body: JSON.stringify({
        action: 'end',
        roomId,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Erro ao finalizar o quiz na sala.');
    }
  }

  /** Calcula e compila todas as estatísticas exigidas da sala */
  async getRoomStats(roomId: string): Promise<RoomStats> {
    const authHeader = await getAuthHeader();
    const response = await fetch(`/api/rooms/stats?roomId=${encodeURIComponent(roomId)}`, {
      method: 'GET',
      headers: authHeader,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Falha ao obter estatísticas da sala.');
    }

    return response.json();
  }

  /** Retorna a lista de salas em que o usuário está ativo no momento */
  async getUserRooms(): Promise<Room[]> {
    const authHeader = await getAuthHeader();
    const response = await fetch('/api/rooms/list', {
      method: 'GET',
      headers: authHeader,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Erro ao obter salas do usuário.');
    }

    return response.json();
  }
}

export const roomService = new RoomService();
