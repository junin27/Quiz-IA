/**
 * Configurações do aplicativo lidas de variáveis de ambiente.
 * Todas as variáveis VITE_* são injetadas em tempo de build pelo Vite.
 * Consulte .env.example para a lista completa e instruções de configuração.
 */
export const CONFIG = {
  // Ativa o Modo Feira (login simplificado sem verificação de e-mail)
  FAIR_MODE: import.meta.env.VITE_FAIR_MODE === 'true',

  // Chave de API global do Gemini para o Modo Feira (opcional)
  // Se preenchida, todos os participantes compartilham esta chave
  DEFAULT_API_KEY: import.meta.env.VITE_DEFAULT_API_KEY ?? '',
};
