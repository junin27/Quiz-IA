import React, { useState } from 'react';
import { authService } from '../../services/authService';
import { loginSchema } from '../../utils/validation';
import { Button } from '../Common/Button';
import type { User } from '../../types/user.types';

interface LoginFormProps {
  onLoginSuccess: (user: User, password: string) => void;
  setView: (view: string) => void;
  showToastMessage: (msg: string, type: 'success' | 'error') => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onLoginSuccess,
  setView,
  showToastMessage
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: string | boolean) => {
    if (field === 'email') setEmail(value as string);
    if (field === 'password') setPassword(value as string);
    if (field === 'rememberMe') setRememberMe(value as boolean);
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    const validation = loginSchema.safeParse({ email, password, rememberMe });
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        if (issue.path[0]) fieldErrors[issue.path[0].toString()] = issue.message;
      });
      setErrors(fieldErrors);
      setIsLoading(false);
      return;
    }

    try {
      const response = await authService.login({ email, password, rememberMe });
      if (response.success) {
        showToastMessage('Login efetuado com sucesso!', 'success');
        // Fetch full user record to pass on
        const userObj = await authService.getCurrentUser();
        if (userObj) {
          // Passa a senha capturada no formulário — evita DOM scraping no App
          onLoginSuccess(userObj, password);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao efetuar login';
      showToastMessage(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-card w-full max-w-md p-8 rounded-2xl mx-auto my-10 relative overflow-hidden">
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

      <h2 className="text-2xl font-extrabold text-white text-center mb-6">Acesse sua Conta</h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="exemplo@email.com"
            className={`w-full px-4 py-3 bg-slate-950/50 border rounded-xl outline-none transition-all duration-300 text-white placeholder-slate-600 focus:ring-1 ${
              errors.email ? 'border-rose-500/50 focus:ring-rose-500' : 'border-slate-800 focus:border-rose-500 focus:ring-rose-500'
            }`}
          />
          {errors.email && <p className="text-rose-400 text-xs mt-1.5 font-medium">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            placeholder="••••••••"
            className={`w-full px-4 py-3 bg-slate-950/50 border rounded-xl outline-none transition-all duration-300 text-white placeholder-slate-600 focus:ring-1 ${
              errors.password ? 'border-rose-500/50 focus:ring-rose-500' : 'border-slate-800 focus:border-rose-500 focus:ring-rose-500'
            }`}
          />
          {errors.password && <p className="text-rose-400 text-xs mt-1.5 font-medium">{errors.password}</p>}
        </div>

        <div className="flex items-center justify-between text-sm text-slate-400">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => handleInputChange('rememberMe', e.target.checked)}
              className="accent-rose-500 w-4 h-4 rounded border-slate-800 bg-slate-950/50"
            />
            Lembrar de mim
          </label>
        </div>

        <Button type="submit" isLoading={isLoading} className="w-full">
          Entrar
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-slate-400 border-t border-slate-800/40 pt-4">
        Não tem conta?{' '}
        <button
          onClick={() => setView('register')}
          className="text-rose-400 hover:text-rose-300 font-semibold transition-colors"
        >
          Cadastre-se
        </button>
      </div>
    </div>
  );
};
export default LoginForm;
