import React, { useState, useEffect } from 'react';
import { roomService } from '../../services/roomService';
import type { Room, RoomMember, RoomStats, DifficultyLevel } from '../../types/quiz.types';
import { RoomMembersList } from './RoomMembersList';
import { RoomStatsView } from './RoomStatsView';
import { Button } from '../Common/Button';
import { useRoomRealtime } from '../../hooks/useRoomRealtime';
import { 
  Shield, 
  KeyRound, 
  Users, 
  Clock, 
  ChevronRight, 
  Check, 
  Copy, 
  LogOut, 
  Play, 
  BarChart3 
} from 'lucide-react';
import { QuizSetup } from '../Quiz/QuizSetup';
import type { BlendedQuizOptions } from '../Quiz/QuizSetup';

interface RoomDashboardProps {
  currentUserId: string;
  onStartRoomQuiz: (
    topic: string,
    difficulty: DifficultyLevel,
    count: number,
    options?: BlendedQuizOptions
  ) => void;
  onActiveQuizStarted: (quizId: string) => void;
  onActiveRoomChange?: (roomId: string | null) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  isIAActive: boolean;
  onNavigateToApiSetup: () => void;
  isLoadingIAQuiz: boolean;
}

const getErrorMessage = (err: unknown): string => {
  return err instanceof Error ? err.message : 'Ocorreu um erro inesperado.';
};

export const RoomDashboard: React.FC<RoomDashboardProps> = ({
  currentUserId,
  onStartRoomQuiz,
  onActiveQuizStarted,
  onActiveRoomChange,
  showToast,
  isIAActive,
  onNavigateToApiSetup,
  isLoadingIAQuiz
}) => {
  const [userRooms, setUserRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [stats, setStats] = useState<RoomStats | null>(null);
  
  const [joinCode, setJoinCode] = useState('');
  const [activeTab, setActiveTab] = useState<'lobby' | 'members' | 'stats'>('lobby');
  const [copied, setCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isStartingQuiz, setIsStartingQuiz] = useState(false);

  useEffect(() => {
    if (onActiveRoomChange) {
      onActiveRoomChange(activeRoom ? activeRoom.id : null);
    }
  }, [activeRoom, onActiveRoomChange]);

  useEffect(() => {
    loadUserRooms();
  }, [currentUserId]);

  const loadUserRooms = async () => {
    try {
      const rooms = await roomService.getUserRooms();
      setUserRooms(rooms);
    } catch {
      showToast('Erro ao carregar suas salas.', 'error');
    }
  };

  const loadRoomData = async (roomId: string) => {
    try {
      const [membersList, roomStats] = await Promise.all([
        roomService.getRoomMembers(roomId),
        roomService.getRoomStats(roomId)
      ]);
      setMembers(membersList);
      setStats(roomStats);
    } catch {
      showToast('Erro ao atualizar dados da sala.', 'error');
    }
  };

  // Consumir hook de Supabase Realtime isolado
  useRoomRealtime({
    activeRoom,
    onActiveQuizStarted,
    loadRoomData,
    showToast,
    setActiveTab,
  });

  const handleCreateRoom = async () => {
    setIsCreating(true);
    try {
      const room = await roomService.createRoom();
      setActiveRoom(room);
      await loadUserRooms();
      showToast('Sala de quiz criada com sucesso!', 'success');
    } catch (err: unknown) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      showToast('Por favor, digite o código da sala.', 'error');
      return;
    }

    setIsJoining(true);
    try {
      const room = await roomService.joinRoom(joinCode);
      setActiveRoom(room);
      await loadUserRooms();
      setJoinCode('');
      showToast('Você entrou na sala!', 'success');
    } catch (err: unknown) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (!activeRoom) return;
    const confirmMsg = activeRoom.ownerId === currentUserId 
      ? 'Deseja realmente sair? Como você é o dono, a sala inteira será encerrada.'
      : 'Deseja sair desta sala de quiz?';
      
    if (!window.confirm(confirmMsg)) return;

    try {
      await roomService.kickMember(activeRoom.id, currentUserId, currentUserId);
      setActiveRoom(null);
      await loadUserRooms();
      showToast('Você saiu da sala.', 'info');
    } catch (err: unknown) {
      showToast(getErrorMessage(err), 'error');
    }
  };

  const copyRoomLink = () => {
    if (!activeRoom) return;
    const joinUrl = `${window.location.origin}?room=${activeRoom.code}`;
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    showToast('Link de convite copiado!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKickMember = async (targetId: string) => {
    if (!activeRoom) return;
    try {
      await roomService.kickMember(activeRoom.id, targetId, currentUserId);
      showToast('Membro removido da sala.', 'success');
      loadRoomData(activeRoom.id);
    } catch (err: unknown) {
      showToast(getErrorMessage(err), 'error');
    }
  };

  const handleToggleAbsent = async (targetId: string, currentStatus: 'active' | 'absent') => {
    if (!activeRoom) return;
    try {
      const nextStatus = currentStatus === 'active' ? 'absent' : 'active';
      await roomService.updateMemberStatus(activeRoom.id, targetId, nextStatus);
      showToast(nextStatus === 'absent' ? 'Membro marcado como Ausente.' : 'Membro marcado como Ativo.', 'success');
      loadRoomData(activeRoom.id);
    } catch (err: unknown) {
      showToast(getErrorMessage(err), 'error');
    }
  };

  const handleToggleRole = async (targetId: string, currentRole: 'owner' | 'leader' | 'member') => {
    if (!activeRoom) return;
    try {
      const nextRole = currentRole === 'leader' ? 'member' : 'leader';
      await roomService.updateMemberRole(activeRoom.id, targetId, nextRole);
      showToast(nextRole === 'leader' ? 'Membro promovido a Líder.' : 'Líder rebaixado a Membro.', 'success');
      loadRoomData(activeRoom.id);
    } catch (err: unknown) {
      showToast(getErrorMessage(err), 'error');
    }
  };

  const getMyRole = (): 'owner' | 'leader' | 'member' => {
    const me = members.find((m) => m.userId === currentUserId);
    return me?.role || 'member';
  };

  const myRole = getMyRole();
  const canStartQuiz = myRole === 'owner' || myRole === 'leader';

  const formatExpiration = (expiresAtStr: string): string => {
    const diff = new Date(expiresAtStr).getTime() - Date.now();
    if (diff <= 0) return 'Expirou';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    if (days > 0) {
      return `Expira em ${days} dia${days > 1 ? 's' : ''} e ${hours}h`;
    }
    return `Expira em ${hours}h`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto my-6 space-y-6">
      {!activeRoom ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-6">
            <div className="glass-card p-6 rounded-2xl relative overflow-hidden space-y-4">
              <div className="absolute -top-10 -right-10 w-28 h-28 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Shield size={18} className="text-rose-400" />
                Criar Sala de Quiz
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Gere um código exclusivo de 7 dias e convide até 50 pessoas para responder aos mesmos quizzes gerados por você.
              </p>
              <Button onClick={handleCreateRoom} isLoading={isCreating} className="w-full mt-2">
                Criar Nova Sala
              </Button>
            </div>

            <div className="glass-card p-6 rounded-2xl relative overflow-hidden">
              <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />
              <form onSubmit={handleJoinRoom} className="space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <KeyRound size={18} className="text-rose-400" />
                  Entrar com Código
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Digite o código de 6 caracteres fornecido pelo criador da sala.
                </p>
                <div className="flex flex-col gap-3">
                  <input
                    type="text"
                    maxLength={6}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="EX: A1B2C3"
                    className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl text-white outline-none placeholder-slate-700 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 text-center font-bold tracking-widest font-mono text-sm uppercase"
                  />
                  <Button type="submit" isLoading={isJoining} className="w-full">
                    Entrar na Sala
                  </Button>
                </div>
              </form>
            </div>
          </div>

          <div className="md:col-span-2 glass-card p-6 rounded-2xl flex flex-col min-h-[300px]">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
              <Users size={18} className="text-rose-400" />
              Suas Salas Ativas
            </h3>

            {userRooms.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <Users size={40} className="stroke-[1.5] mb-2 text-slate-700" />
                <p className="text-sm font-semibold">Nenhuma sala ativa encontrada.</p>
                <p className="text-xs max-w-[300px] mt-1">Crie uma nova sala ou ingresse em uma existente usando um código de convite.</p>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-[400px] pr-1">
                {userRooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => setActiveRoom(room)}
                    className="w-full flex items-center justify-between p-4 bg-slate-950/30 border border-slate-800/60 rounded-xl hover:border-rose-500/40 hover:bg-slate-950/60 transition-all text-left group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold font-mono tracking-wider">{room.code}</span>
                        {room.ownerId === currentUserId && (
                          <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full text-[9px] font-bold">
                            Dono
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                        <Clock size={11} />
                        <span>{formatExpiration(room.expiresAt)}</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-slate-600 group-hover:text-rose-400 transition-colors" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-6 bg-slate-950/40 border-b border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-extrabold text-white font-mono tracking-wider">{activeRoom.code}</span>
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-semibold">
                  <Clock size={11} className="text-slate-500" />
                  <span>{formatExpiration(activeRoom.expiresAt)}</span>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Sala de Quiz Multiplayer • Limite de 50 convidados • Cargo na sala: <strong className="text-rose-400 uppercase text-[10px] tracking-wider">{myRole}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={copyRoomLink}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-xl text-xs text-slate-350 font-bold transition-all"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>Copiar Link</span>
              </button>

              <button
                onClick={handleLeaveRoom}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/35 rounded-xl text-xs text-rose-400 font-bold transition-all"
              >
                <LogOut size={14} />
                <span>{activeRoom.ownerId === currentUserId ? 'Encerrar Sala' : 'Sair'}</span>
              </button>
            </div>
          </div>

          <div className="flex border-b border-slate-800 bg-slate-950/20">
            <button
              onClick={() => { setActiveTab('lobby'); setIsStartingQuiz(false); }}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all border-b-2 ${
                activeTab === 'lobby'
                  ? 'border-rose-500 text-white bg-rose-500/5'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <Play size={14} />
              Lobby do Quiz
            </button>
            <button
              onClick={() => { setActiveTab('members'); setIsStartingQuiz(false); }}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all border-b-2 ${
                activeTab === 'members'
                  ? 'border-rose-500 text-white bg-rose-500/5'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <Users size={14} />
              Membros ({members.length})
            </button>
            <button
              onClick={() => { setActiveTab('stats'); setIsStartingQuiz(false); }}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all border-b-2 ${
                activeTab === 'stats'
                  ? 'border-rose-500 text-white bg-rose-500/5'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <BarChart3 size={14} />
              Estatísticas da Sala
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'lobby' && (
              <div className="space-y-6">
                {!isStartingQuiz ? (
                  <div className="text-center py-10 space-y-4 max-w-md mx-auto">
                    <div className="w-16 h-16 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-2 animate-pulse">
                      <Play size={28} className="ml-1" />
                    </div>
                    <h3 className="text-lg font-bold text-white">Pronto para Jogar?</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Quando um líder ou o dono da sala iniciar um quiz, todos os participantes ativos entrarão no jogo automaticamente em tempo real.
                    </p>
                    
                    {canStartQuiz ? (
                      <div className="pt-2">
                        {isIAActive ? (
                          <Button onClick={() => setIsStartingQuiz(true)} className="w-full flex items-center justify-center gap-2">
                            <Play size={14} />
                            Iniciar Novo Quiz
                          </Button>
                        ) : (
                          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2 text-left">
                            <p className="text-xs text-amber-300 leading-relaxed">
                              <strong>Chave de API do Dono pendente:</strong> Para poder gerar quizzes personalizados nesta sala, você precisa configurar uma chave de IA em suas credenciais.
                            </p>
                            <Button onClick={onNavigateToApiSetup} className="w-full text-xs py-2 bg-amber-500 hover:bg-amber-600 border-none text-slate-950 font-bold">
                              Configurar API Key
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-[10px] text-slate-500 font-semibold font-mono">
                        Aguardando início pelo líder...
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
                      <h3 className="text-base font-bold text-white">Configurar Quiz da Sala</h3>
                      <button
                        onClick={() => setIsStartingQuiz(false)}
                        className="text-xs text-slate-400 hover:text-white underline"
                      >
                        Voltar
                      </button>
                    </div>

                    <QuizSetup
                      isLoading={isLoadingIAQuiz}
                      isTriviaMode={false}
                      onStartQuiz={async (topic, difficulty, count, options) => {
                        onStartRoomQuiz(topic, difficulty, count, options);
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'members' && (
              <RoomMembersList
                members={members}
                currentUserId={currentUserId}
                myRole={myRole}
                onKick={handleKickMember}
                onToggleAbsent={handleToggleAbsent}
                onToggleRole={handleToggleRole}
              />
            )}

            {activeTab === 'stats' && (
              <RoomStatsView stats={stats} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomDashboard;
