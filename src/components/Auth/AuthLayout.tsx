import React from 'react';
import type { User } from '../../types/user.types';
import type { ToastType } from '../Common/Toast';
import { CONFIG } from '../../config';
import { LoginForm } from './LoginForm';
import { FairLoginForm } from './FairLoginForm';
import { RegisterForm } from './RegisterForm';
import { EmailVerification } from './EmailVerification';
import { MarketingHeader, MarketingStats, MarketingDemo } from '../Marketing/MarketingSection';

interface AuthLayoutProps {
  view: string;
  setView: (view: string) => void;
  verifyData: { userId: string; email: string } | null;
  onLoginSuccess: (user: User, password: string) => void;
  onRegisterSuccess: (userId: string, email: string) => void;
  onVerificationSuccess: () => void;
  showToast: (message: string, type?: ToastType) => void;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  view,
  setView,
  verifyData,
  onLoginSuccess,
  onRegisterSuccess,
  onVerificationSuccess,
  showToast
}) => {
  return (
    <div className="w-full max-w-5xl mx-auto my-6 space-y-16 lg:space-y-20 animate-fade-in">
      {/* Seção Superior: Título/Descrição + Simulador (esquerda) e Formulário de Acesso (direita) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start">
        {/* Lado Esquerdo: Header de Marketing + Demo Interativa */}
        <div className="lg:col-span-6 space-y-8 text-left">
          <MarketingHeader />
          <MarketingDemo />
        </div>

        {/* Lado Direito: Formulário de Autenticação */}
        <div className="lg:col-span-6 w-full flex justify-center lg:sticky lg:top-6">
          {view === 'login' && (
            CONFIG.FAIR_MODE ? (
              <FairLoginForm
                onLoginSuccess={(user) => onLoginSuccess(user, 'FairModePassword123!')}
                showToastMessage={showToast}
              />
            ) : (
              <LoginForm
                onLoginSuccess={onLoginSuccess}
                setView={setView}
                showToastMessage={showToast}
              />
            )
          )}
          {view === 'register' && (
            <RegisterForm
              onRegisterSuccess={onRegisterSuccess}
              setView={setView}
              showToastMessage={showToast}
            />
          )}
          {view === 'verify-email' && verifyData && (
            <EmailVerification
              userId={verifyData.userId}
              email={verifyData.email}
              onVerificationSuccess={onVerificationSuccess}
              setView={setView}
              showToastMessage={showToast}
            />
          )}
        </div>
      </div>

      {/* Seção Inferior: Recursos Premium em Largura Total */}
      <div className="border-t border-slate-800/40 pt-12">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <h3 className="text-xl lg:text-2xl font-black text-white tracking-tight uppercase">
            POR QUE ESTUDAR COM A <span className="bg-gradient-to-r from-rose-500 to-orange-400 bg-clip-text text-transparent">QUESTAI</span>?
          </h3>
          <p className="text-xs text-slate-400 font-medium">
            Uma plataforma completa desenvolvida sob medida para simplificar seu aprendizado e maximizar seus resultados.
          </p>
        </div>
        <MarketingStats />
      </div>
    </div>
  );
};

export default AuthLayout;
