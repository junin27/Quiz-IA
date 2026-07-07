import { useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Room } from '../types/quiz.types';

interface RoomUpdatePayload {
  new: {
    id: string;
    active_quiz_id: string | null;
  };
}

interface UseRoomRealtimeOptions {
  activeRoom: Room | null;
  onActiveQuizStarted: (quizId: string) => void;
  loadRoomData: (roomId: string) => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  setActiveTab: (tab: 'lobby' | 'members' | 'stats') => void;
}

export function useRoomRealtime({
  activeRoom,
  onActiveQuizStarted,
  loadRoomData,
  showToast,
  setActiveTab,
}: UseRoomRealtimeOptions) {
  useEffect(() => {
    if (!activeRoom) return;

    loadRoomData(activeRoom.id);
    setActiveTab('lobby');

    // Conecta ao canal realtime do Supabase para escutar atualizações da sala
    const roomChannel = supabase
      .channel(`room:${activeRoom.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${activeRoom.id}`,
        },
        (payload: unknown) => {
          const typedPayload = payload as RoomUpdatePayload;
          const updatedRoom = typedPayload.new;
          if (updatedRoom.active_quiz_id && updatedRoom.active_quiz_id !== activeRoom.activeQuizId) {
            showToast('Um novo quiz foi iniciado na sala! Redirecionando...', 'info');
            onActiveQuizStarted(updatedRoom.active_quiz_id);
          }
        }
      )
      // Escuta também mudanças na tabela de membros (para atualizar a lista em tempo real)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_members',
          filter: `room_id=eq.${activeRoom.id}`,
        },
        () => {
          loadRoomData(activeRoom.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomChannel);
    };
  }, [activeRoom]);
}
