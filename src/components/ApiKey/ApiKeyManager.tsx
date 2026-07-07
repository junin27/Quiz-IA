import React, { useState } from 'react';
import { validateApiKey, POPULAR_MODELS } from '../../services/llmService';
import { encryptApiKey } from '../../utils/encryption';
import { sessionStore } from '../../services/sessionStore';
import type { User } from '../../types/user.types';
import type { LLMProvider } from '../../types/apiKey.types';
import { Button } from '../Common/Button';
import { CustomDropdown } from '../Common/CustomDropdown';
import { Check, X, Trash2, Edit, Plus, AlertTriangle, WifiOff } from 'lucide-react';
import { Modal } from '../Common/Modal';

interface ApiKeyManagerProps {
  currentUser: User;
  currentUserPassword: string;
  onUpdateSuccess: (updatedUser: User) => void;
  showToastMessage: (msg: string, type: 'success' | 'error') => void;
  isSetupMode?: boolean;
}

const PROVIDERS: { value: LLMProvider; label: string; placeholder: string }[] = [
  { value: 'gemini', label: 'Google Gemini', placeholder: 'Padrão: gemini-2.5-flash' },
  { value: 'openai', label: 'OpenAI', placeholder: 'Padrão: gpt-4o-mini' },
  { value: 'anthropic', label: 'Anthropic', placeholder: 'Padrão: claude-3-haiku-20240307' },
  { value: 'deepseek', label: 'DeepSeek', placeholder: 'Padrão: deepseek-chat' },
  { value: 'groq', label: 'Groq', placeholder: 'Padrão: llama3-8b-8192' },
  { value: 'mistral', label: 'Mistral AI', placeholder: 'Padrão: mistral-small-latest' },
  { value: 'openrouter', label: 'OpenRouter', placeholder: 'Padrão: openrouter/auto' },
];

export const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({
  currentUser,
  currentUserPassword,
  onUpdateSuccess,
  showToastMessage,
  isSetupMode = false
}) => {
  const globalKey = localStorage.getItem('quiz_app_global_api_key');
  const globalProvider = (localStorage.getItem('quiz_app_global_api_provider') as LLMProvider) || 'gemini';
  const globalModelId = localStorage.getItem('quiz_app_global_api_modelId') || undefined;

  const keyRecord = currentUser.apiKey || (globalKey ? {
    provider: globalProvider,
    modelId: globalModelId,
    encryptedKey: { cipherText: '', iv: '', salt: '' },
    lastFourChars: globalKey === 'mock-key-for-testing' ? 'MOCK' : globalKey.slice(-4),
    createdAt: new Date().toISOString(),
    lastUsedAt: new Date().toISOString(),
    isActive: true
  } : undefined);

  const isOfflineMock = keyRecord?.lastFourChars === 'MOCK' || globalKey === 'mock-key-for-testing';
  const hasActiveKey = !!keyRecord && !isOfflineMock;

  const initialProvider = keyRecord?.provider || 'gemini';
  const initialModelId = keyRecord?.modelId || '';

  const isModelPopular = (prov: LLMProvider, mId: string) => {
    return POPULAR_MODELS[prov]?.some(m => m.value === mId);
  };

  const getInitialModelOption = (prov: LLMProvider, mId: string) => {
    if (!mId) {
      const defaults = POPULAR_MODELS[prov];
      return defaults && defaults.length > 0 ? defaults[0].value : 'outro';
    }
    return isModelPopular(prov, mId) ? mId : 'outro';
  };

  const getInitialCustomModelId = (prov: LLMProvider, mId: string) => {
    if (!mId) return '';
    return isModelPopular(prov, mId) ? '' : mId;
  };

  const [apiKey, setApiKey] = useState('');
  const [provider, setProvider] = useState<LLMProvider>(initialProvider);
  const [selectedModelOption, setSelectedModelOption] = useState<string>(() => getInitialModelOption(initialProvider, initialModelId));
  const [customModelId, setCustomModelId] = useState<string>(() => getInitialCustomModelId(initialProvider, initialModelId));
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(isSetupMode);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const displayProviderLabel = PROVIDERS.find(p => p.value === keyRecord?.provider)?.label || 'Desconhecido';

  const handleProviderChange = (newProvider: LLMProvider) => {
    setProvider(newProvider);
    const defaults = POPULAR_MODELS[newProvider];
    if (defaults && defaults.length > 0) {
      setSelectedModelOption(defaults[0].value);
    } else {
      setSelectedModelOption('outro');
    }
    setCustomModelId('');
  };

  const handleDeleteClick = () => {
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    const updatedUser: User = {
      ...currentUser,
      apiKey: undefined
    };

    localStorage.removeItem('quiz_app_global_api_key');
    localStorage.removeItem('quiz_app_global_api_provider');
    localStorage.removeItem('quiz_app_global_api_modelId');
    sessionStore.saveUser(updatedUser);
    showToastMessage('Chave de API excluída com sucesso.', 'success');
    onUpdateSuccess(updatedUser);
    setIsEditing(false);
    setIsConfirmOpen(false);
  };

  const handleUpdate = async (e?: React.FormEvent, mockKey?: string) => {
    if (e) e.preventDefault();
    const keyToUse = mockKey || apiKey.trim();
    if (!keyToUse) {
      showToastMessage('Por favor, informe a nova chave.', 'error');
      return;
    }

    setIsUpdating(true);
    try {
      const isMock = keyToUse === 'mock-key-for-testing';
      const finalModelId = selectedModelOption === 'outro' ? customModelId.trim() : selectedModelOption;
      if (selectedModelOption === 'outro' && !finalModelId) {
        showToastMessage('Por favor, especifique o ID do modelo personalizado.', 'error');
        setIsUpdating(false);
        return;
      }

      const validation = await validateApiKey(keyToUse, provider, finalModelId || undefined);
      if (!validation.valid) {
        showToastMessage(validation.error || 'Chave inválida.', 'error');
        setIsUpdating(false);
        return;
      }

      // Salva a chave de forma global no localStorage
      localStorage.setItem('quiz_app_global_api_key', keyToUse);
      localStorage.setItem('quiz_app_global_api_provider', provider);
      if (finalModelId) {
        localStorage.setItem('quiz_app_global_api_modelId', finalModelId);
      } else {
        localStorage.removeItem('quiz_app_global_api_modelId');
      }

      const encrypted = await encryptApiKey(keyToUse, currentUserPassword);
      const updatedUser: User = {
        ...currentUser,
        apiKey: {
          provider,
          modelId: finalModelId || undefined,
          encryptedKey: encrypted,
          lastFourChars: isMock ? 'MOCK' : keyToUse.slice(-4),
          createdAt: new Date().toISOString(),
          lastUsedAt: new Date().toISOString(),
          isActive: true
        }
      };

      sessionStore.saveUser(updatedUser);
      showToastMessage(
        isMock
          ? 'Modo Offline (Simulador) ativado com sucesso!'
          : 'Chave de API configurada com sucesso!',
        'success'
      );
      onUpdateSuccess(updatedUser);
      setIsEditing(false);
      setApiKey('');
    } catch {
      showToastMessage('Erro ao atualizar a chave de API.', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const dropdownProvidersOptions = PROVIDERS.map(p => ({
    value: p.value,
    label: p.label
  }));

  const dropdownModelsOptions = [
    ...(POPULAR_MODELS[provider] || []).map(m => ({
      value: m.value,
      label: m.label
    })),
    { value: 'outro', label: 'Outro modelo (especificar)...' }
  ];

  return (
    <div className="glass-card p-6 rounded-2xl border border-slate-800/80 shadow-2xl space-y-6">
      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
        <h3 className="text-lg font-bold text-white">
          {isSetupMode ? 'CONFIGURAR INTELIGÊNCIA ARTIFICIAL' : 'GERENCIAMENTO DE CHAVE DE API'}
        </h3>
        {keyRecord && !isOfflineMock && !isEditing && (
          <span className="text-xs bg-rose-500/20 text-rose-400 font-semibold px-2.5 py-1 rounded-full">
            {displayProviderLabel}
          </span>
        )}
      </div>

      {isSetupMode && isEditing && (
        <p className="text-slate-400 text-xs leading-relaxed">
          Insira sua chave de API para que a IA gere perguntas personalizadas em tempo real.
        </p>
      )}

      {/* Estado: sem chave real ativa (null ou simulador mock) */}
      {!hasActiveKey && !isEditing ? (
        <div className="space-y-4">
          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-900 space-y-3">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-400">STATUS:</span>
              <span className="text-rose-400 font-bold">Nenhuma chave de IA ativa</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Você está sem chave de IA configurada. Adicione uma chave para gerar quizzes
              personalizados sobre qualquer tema, ou continue usando o banco gratuito do Open Trivia DB.
            </p>
          </div>

          <Button
            variant="success"
            onClick={() => {
              setIsEditing(true);
              setProvider('gemini');
              setSelectedModelOption('gemini-2.5-flash');
              setCustomModelId('');
            }}
            className="w-full text-xs font-bold uppercase gap-2"
          >
            <Plus size={16} strokeWidth={3.5} />
            ADICIONAR CHAVE DE API
          </Button>
        </div>
      ) : hasActiveKey && !isEditing ? (
        /* Estado: chave real ativa */
        <div className="space-y-4">
          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-900 space-y-3">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-400">STATUS:</span>
              <span className="text-emerald-400">Ativa e Criptografada (AES-256)</span>
            </div>
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-400">CHAVE:</span>
              <span className="text-slate-200 font-mono">•••••••••••••{keyRecord!.lastFourChars}</span>
            </div>
            {keyRecord!.modelId && (
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-400">MODELO CUSTOMIZADO:</span>
                <span className="text-slate-200">{keyRecord!.modelId}</span>
              </div>
            )}
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-400">ADICIONADA EM:</span>
              <span className="text-slate-400">
                {new Date(keyRecord!.createdAt).toLocaleDateString()} às {new Date(keyRecord!.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              variant="danger"
              onClick={handleDeleteClick}
              className="flex-1 text-xs font-bold uppercase gap-2"
            >
              <Trash2 size={16} strokeWidth={3.5} />
              EXCLUIR CHAVE
            </Button>
            <Button
              variant="warning"
              onClick={() => {
                setIsEditing(true);
                const prov = keyRecord!.provider;
                const mId = keyRecord!.modelId || '';
                setProvider(prov);
                setSelectedModelOption(getInitialModelOption(prov, mId));
                setCustomModelId(getInitialCustomModelId(prov, mId));
              }}
              className="flex-1 text-xs font-bold uppercase gap-2"
            >
              <Edit size={16} strokeWidth={3.5} />
              ALTERAR CHAVE
            </Button>
          </div>
        </div>

      ) : (
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CustomDropdown
              label="Provedor"
              value={provider}
              onChange={(val) => handleProviderChange(val as LLMProvider)}
              options={dropdownProvidersOptions}
            />

            <CustomDropdown
              label="Modelo"
              value={selectedModelOption}
              onChange={setSelectedModelOption}
              options={dropdownModelsOptions}
            />
          </div>

          {selectedModelOption === 'outro' && (
            <div className="animate-fade-in">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                ID do Modelo Customizado
              </label>
              <input
                type="text"
                value={customModelId}
                onChange={(e) => setCustomModelId(e.target.value)}
                placeholder="Ex: gpt-4-32k ou claude-3-opus"
                className="w-full px-4 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-white outline-none placeholder-slate-700 focus:border-rose-500 transition-colors text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Nova Chave de API
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Sua chave secreta..."
              className="w-full px-4 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-white outline-none placeholder-slate-700 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors text-sm"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            {isSetupMode ? (
              <>
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => handleUpdate(undefined, 'mock-key-for-testing')}
                  disabled={isUpdating}
                  className="flex-1 text-xs font-bold uppercase gap-2"
                >
                  <WifiOff size={16} strokeWidth={3.5} />
                  USAR SIMULADOR OFFLINE
                </Button>
                <Button
                  type="submit"
                  variant="success"
                  isLoading={isUpdating}
                  className="flex-1 text-xs font-bold uppercase gap-2"
                >
                  <Check size={16} strokeWidth={3.5} />
                  VALIDAR E SALVAR
                </Button>
              </>
            ) : (
              <>
                {keyRecord && (
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 text-xs font-bold uppercase gap-2"
                  >
                    <X size={16} strokeWidth={3.5} />
                    CANCELAR
                  </Button>
                )}
                <Button
                  type="submit"
                  variant="success"
                  isLoading={isUpdating}
                  className="flex-1 text-xs font-bold uppercase gap-2"
                >
                  <Check size={16} strokeWidth={3.5} />
                  SALVAR CHAVE
                </Button>
              </>
            )}
          </div>
        </form>
      )}

      {/* Modal de confirmação de exclusão */}
      <Modal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title="EXCLUIR CHAVE DE API"
      >
        <div className="space-y-6">
          <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl flex items-start gap-3">
            <AlertTriangle className="text-rose-400 shrink-0 mt-0.5" size={20} />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-rose-300">Atenção!</h4>
              <p className="text-xs text-rose-200/80 leading-relaxed">
                Tem certeza de que deseja excluir sua chave de API? Esta ação removerá a chave de IA ativa e você não poderá gerar quizzes personalizados até configurar uma nova chave.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="danger"
              onClick={() => setIsConfirmOpen(false)}
              className="flex-1 text-xs font-bold uppercase gap-2"
            >
              <X size={16} strokeWidth={3.5} />
              Cancelar
            </Button>
            <Button
              variant="success"
              onClick={handleConfirmDelete}
              className="flex-1 text-xs font-bold uppercase gap-2"
            >
              <Trash2 size={16} strokeWidth={3.5} />
              EXCLUIR
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
export default ApiKeyManager;
