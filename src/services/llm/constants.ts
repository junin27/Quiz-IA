import type { PopularModelsConfig, ProviderConfig, DifficultyLabelsConfig } from './types';

export const OFFLINE_KEY = 'mock-key-for-testing';

export const POPULAR_MODELS: PopularModelsConfig = {
  gemini: [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Recomendado)' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
  ],
  openai: [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Recomendado)' },
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'o3-mini', label: 'o3-mini (Raciocínio lógico rápido)' },
    { value: 'o1', label: 'o1 (Raciocínio avançado)' },
    { value: 'o1-mini', label: 'o1-mini' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  ],
  anthropic: [
    { value: 'claude-3-7-sonnet-latest', label: 'Claude 3.7 Sonnet (Mais inteligente - Híbrido)' },
    { value: 'claude-3-5-sonnet-latest', label: 'Claude 3.5 Sonnet' },
    { value: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku' },
    { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
  ],
  deepseek: [
    { value: 'deepseek-chat', label: 'DeepSeek V3 (Chat)' },
    { value: 'deepseek-reasoner', label: 'DeepSeek R1 (Raciocínio puro)' },
    { value: 'deepseek-coder', label: 'DeepSeek Coder' },
  ],
  groq: [
    { value: 'llama-3.3-70b-specdec', label: 'Llama 3.3 70B SpecDec (Recomendado)' },
    { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versátil' },
    { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant' },
    { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
    { value: 'gemma2-9b-it', label: 'Gemma 2 9B' },
  ],
  mistral: [
    { value: 'mistral-small-latest', label: 'Mistral Small (Recomendado)' },
    { value: 'mistral-large-latest', label: 'Mistral Large 2' },
    { value: 'pixtral-large-latest', label: 'Pixtral Large (Multimodal)' },
    { value: 'codestral-latest', label: 'Codestral (Programação)' },
  ],
  openrouter: [
    { value: 'openrouter/auto', label: 'Auto (Melhor custo/benefício)' },
    { value: 'deepseek/deepseek-r1:free', label: 'DeepSeek R1 (Grátis)' },
    { value: 'deepseek/deepseek-chat', label: 'DeepSeek V3' },
    { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B Instruct' },
    { value: 'anthropic/claude-3.7-sonnet', label: 'Claude 3.7 Sonnet' },
  ],
};

export const PROVIDER_CONFIGS: ProviderConfig = {
  gemini: {
    url: 'https://generativelanguage.googleapis.com/v1beta/models',
    defaultModel: 'gemini-2.5-flash',
  },
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini',
  },
  anthropic: {
    url: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-3-haiku-20240307',
  },
  deepseek: {
    url: 'https://api.deepseek.com/chat/completions',
    defaultModel: 'deepseek-chat',
  },
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    defaultModel: 'llama3-8b-8192',
  },
  mistral: {
    url: 'https://api.mistral.ai/v1/chat/completions',
    defaultModel: 'mistral-small-latest',
  },
  openrouter: {
    url: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: 'openrouter/auto',
  },
};

export const DIFFICULTY_LABELS: DifficultyLabelsConfig = {
  1: 'Muito Fácil', 2: 'Muito Fácil',
  3: 'Fácil', 4: 'Fácil',
  5: 'Médio', 6: 'Médio',
  7: 'Difícil', 8: 'Difícil',
  9: 'Difícil', 10: 'Muito Difícil',
};
