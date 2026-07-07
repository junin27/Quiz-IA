import React from 'react';
import type { User } from '../../types/user.types';

interface HeaderProps {
  currentUser: User | null;
  currentView?: string;
  onTitleClick: () => void;
  onNavigateToProfile: () => void;
  onNavigateToRooms: () => void;
  onNavigateToHistory: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  currentView,
  onTitleClick,
  onNavigateToProfile,
  onNavigateToRooms,
  onNavigateToHistory,
  onLogout
}) => {
  const isApiKeyActive = currentUser && (
    currentUser.apiKey || (
      localStorage.getItem('quiz_app_global_api_key') &&
      localStorage.getItem('quiz_app_global_api_key') !== 'mock-key-for-testing'
    )
  );

  const activeProvider = (
    currentUser?.apiKey?.provider ||
    localStorage.getItem('quiz_app_global_api_provider') ||
    'gemini'
  );

  const getProviderLabel = (prov: string): string => {
    const labels: Record<string, string> = {
      gemini: 'Gemini',
      openai: 'OpenAI',
      anthropic: 'Anthropic',
      deepseek: 'DeepSeek',
      groq: 'Groq',
      mistral: 'Mistral',
      openrouter: 'OpenRouter'
    };
    return labels[prov.toLowerCase()] || prov;
  };

  // Cálculo das abas ativas
  const isQuizActive = currentView === 'quiz-setup' || currentView === 'api-key-setup' || currentView === 'quiz';
  const isRoomsActive = currentView === 'rooms';
  const isHistoryActive = currentView === 'scores';
  const isProfileActive = currentView === 'profile';

  const getTabClass = (isActive: boolean, hasLeftBorder = false) => {
    const baseColor = isActive 
      ? 'text-rose-400 font-extrabold' 
      : 'text-slate-400 hover:text-rose-400 font-semibold';
    const border = hasLeftBorder ? 'border-l border-slate-800 pl-4' : '';
    return `${baseColor} transition-all duration-300 cursor-pointer flex items-center gap-1.5 group shrink-0 ${border}`;
  };

  const getSvgClass = (isActive: boolean) => {
    return isActive
      ? 'w-[18px] h-[18px] text-rose-400 shrink-0'
      : 'w-[18px] h-[18px] text-slate-450 group-hover:text-rose-400 transition-colors shrink-0';
  };

  return (
    <header className="glass-panel w-full px-6 py-4 flex flex-col sm:flex-row justify-between items-center shadow-lg border-b border-slate-800/50 gap-4">
      <h1
        onClick={onTitleClick}
        className="text-xl font-extrabold tracking-wide cursor-pointer m-0 flex items-center gap-2"
      >
        <svg className="w-[26px] h-[26px] text-rose-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M 7 8.5 C 7 4.5, 17 4.5, 17 8.5 C 17 12.5, 12 12, 12 16" />
          <circle cx="12" cy="20.5" r="1.5" fill="currentColor" stroke="none" />
        </svg>
        <span className="select-none bg-gradient-to-r from-rose-500 to-orange-400 bg-clip-text text-transparent font-black">
          QuestAI
        </span>
      </h1>
      {currentUser && (
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-4 sm:gap-5 text-xs">
          {/* NOVO QUIZ */}
          <button
            onClick={onTitleClick}
            className={getTabClass(isQuizActive)}
          >
            <svg className={getSvgClass(isQuizActive)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M 7 8.5 C 7 4.5, 17 4.5, 17 8.5 C 17 12.5, 12 12, 12 16" />
              <circle cx="12" cy="20.5" r="1.5" fill="currentColor" stroke="none" />
            </svg>
            <span>NOVO QUIZ</span>
          </button>

          {/* SALAS */}
          <button
            onClick={onNavigateToRooms}
            className={getTabClass(isRoomsActive)}
          >
            <svg className={getSvgClass(isRoomsActive)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>SALAS</span>
          </button>

          {/* HISTÓRICO */}
          <button
            onClick={onNavigateToHistory}
            className={getTabClass(isHistoryActive)}
          >
            <svg className={getSvgClass(isHistoryActive)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>HISTÓRICO</span>
          </button>

          {/* MINHA CONTA */}
          <button
            onClick={onNavigateToProfile}
            className={getTabClass(isProfileActive, true)}
          >
            <svg className={getSvgClass(isProfileActive)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span>MINHA CONTA</span>
          </button>
          
          {isApiKeyActive && (
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1.5 shrink-0 font-bold">
              <span>{getProviderLabel(activeProvider).toUpperCase()}</span>
            </span>
          )}
          
          {/* SAIR */}
          <button
            onClick={onLogout}
            className="text-slate-400 hover:text-rose-400 font-semibold transition-all duration-300 cursor-pointer flex items-center gap-1.5 group shrink-0 border-l border-slate-800 pl-4"
          >
            <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-400 transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            <span>SAIR</span>
          </button>
        </div>
      )}
    </header>
  );
};
export default Header;
