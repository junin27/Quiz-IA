import React, { useState } from 'react';
import { authService } from '../../services/authService';
import { Button } from '../Common/Button';
import type { User } from '../../types/user.types';

interface FairLoginFormProps {
  onLoginSuccess: (user: User) => void;
  showToastMessage: (msg: string, type: 'success' | 'error') => void;
}

export const FairLoginForm: React.FC<FairLoginFormProps> = ({
  onLoginSuccess,
  showToastMessage
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: 'name' | 'email', value: string) => {
    if (field === 'name') setName(value);
    if (field === 'email') setEmail(value);
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validateInput = (): boolean => {
    const emailTrimmed = email.trim();
    if (emailTrimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      setErrors({ email: 'Formato de e-mail inválido' });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    if (!validateInput()) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await authService.loginFair(name, email);
      if (response.success) {
        showToastMessage('Entrada realizada com sucesso!', 'success');
        const userObj = await authService.getCurrentUser();
        if (userObj) {
          onLoginSuccess(userObj);
        }
      }
    } catch (err: any) {
      showToastMessage(err.message || 'Erro ao entrar', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-card w-full max-w-md p-8 rounded-2xl mx-auto my-10 relative overflow-hidden">
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

      <h2 className="text-2xl font-extrabold text-white text-center mb-1">
        Bem-vindo ao <span className="text-red-500">Quest</span><span className="text-orange-500">AI</span>!
      </h2>
      <p className="text-slate-400 text-xs text-center mb-6 leading-relaxed">
        Preencha os campos abaixo para iniciar. Ambos são opcionais!
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Seu Nome (Opcional)
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Ex: João Silva"
            className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl outline-none transition-all duration-300 text-white placeholder-slate-600 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Seu E-mail (Opcional)
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="Ex: joao@email.com"
            className={`w-full px-4 py-3 bg-slate-950/50 border rounded-xl outline-none transition-all duration-300 text-white placeholder-slate-600 focus:ring-1 ${
              errors.email ? 'border-rose-500/50 focus:ring-rose-500' : 'border-slate-800 focus:border-rose-500 focus:ring-rose-500'
            }`}
          />
          {errors.email && <p className="text-rose-400 text-xs mt-1.5 font-medium">{errors.email}</p>}
        </div>

        <Button type="submit" isLoading={isLoading} className="w-full">
          Entrar e Começar
        </Button>
      </form>
    </div>
  );
};

export default FairLoginForm;
