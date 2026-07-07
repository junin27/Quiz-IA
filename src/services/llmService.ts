import { type QuizQuestion, type RagImage, quizQuestionsSchema } from '../types/quiz.types';
import type { LLMProvider } from '../types/apiKey.types';
import type { ModelOption } from './llm/types';
import { OFFLINE_KEY, POPULAR_MODELS, PROVIDER_CONFIGS } from './llm/constants';
import {
  buildDifficultyDescription,
  buildQuizPrompt,
  buildQuizPromptWithContent,
  buildBlendedQuizPrompt,
} from './llm/prompts';
import {
  fetchGemini,
  fetchOpenAIFormat,
  fetchAnthropic,
  extractApiError,
} from './llm/apiClients';
import {
  cleanJsonText,
  parseGeminiResponse,
  parseOpenAIResponse,
  parseAnthropicResponse,
} from './llm/responseParsers';

export { OFFLINE_KEY, POPULAR_MODELS, PROVIDER_CONFIGS };
export type { ModelOption };

/**
 * Valida a chave de API testando uma chamada simples ao provedor.
 */
export async function validateApiKey(
  apiKey: string,
  provider: LLMProvider = 'gemini',
  customModelId?: string
): Promise<{ valid: boolean; error?: string }> {
  if (apiKey === OFFLINE_KEY) return { valid: true };

  const modelId = customModelId?.trim() || PROVIDER_CONFIGS[provider].defaultModel;
  const prompt = 'Responda apenas OK';

  try {
    const response = await executeValidationRequest(provider, apiKey, modelId, prompt);
    if (!response.ok) {
      const specificError = await extractApiError(response, provider);
      return { valid: false, error: specificError };
    }
    return { valid: true };
  } catch (err: unknown) {
    return handleValidationError(err);
  }
}

/**
 * Orquestra e gera as questões do quiz a partir de um provedor de IA ou RAG.
 */
export async function generateQuizQuestions(
  apiKey: string,
  topic: string,
  difficulty: string,
  count: number,
  provider: LLMProvider = 'gemini',
  customModelId?: string,
  popularExamOnly: boolean = false,
  ragData?: { text: string; images: RagImage[] },
  percentages?: { ia: number; rag: number; exam: number }
): Promise<QuizQuestion[]> {
  validateInput(apiKey);

  const modelId = resolveModelId(provider, customModelId);
  const difficultyDescription = buildDifficultyDescription(difficulty);
  const prompt = resolvePrompt(topic, difficultyDescription, count, popularExamOnly, ragData, percentages);
  const images = ragData?.images || [];

  const response = await sendRequest(provider, apiKey, modelId, prompt, images);
  const rawText = await handleResponse(response, provider);
  return parseQuizResult(rawText);
}

// ─── Funções Auxiliares Internas ──────────────────────────────────────────────

async function executeValidationRequest(
  provider: LLMProvider,
  apiKey: string,
  modelId: string,
  prompt: string
): Promise<Response> {
  if (provider === 'gemini') {
    return fetchGemini(apiKey, modelId, prompt);
  }
  if (provider === 'anthropic') {
    return fetchAnthropic(apiKey, modelId, prompt);
  }
  return fetchOpenAIFormat(provider, apiKey, modelId, prompt);
}

function handleValidationError(err: unknown): { valid: boolean; error: string } {
  if (err instanceof Error && err.message.length > 20) {
    return { valid: false, error: err.message };
  }
  return {
    valid: false,
    error: 'Não foi possível conectar à API. Verifique sua conexão com a internet.',
  };
}

function validateInput(apiKey: string): void {
  if (!apiKey || apiKey === OFFLINE_KEY) {
    throw new Error(
      'Modo Offline ativo: configure uma Chave de API válida em "Minha Conta" para gerar questões reais.'
    );
  }
}

function resolveModelId(provider: LLMProvider, customModelId?: string): string {
  return customModelId?.trim() || PROVIDER_CONFIGS[provider].defaultModel;
}

function resolvePrompt(
  topic: string,
  difficultyDescription: string,
  count: number,
  popularExamOnly: boolean,
  ragData?: { text: string; images: RagImage[] },
  percentages?: { ia: number; rag: number; exam: number }
): string {
  if (percentages) {
    const counts = calculateBlendCounts(count, percentages, !!ragData);
    return buildBlendedQuizPrompt(topic, difficultyDescription, count, counts, ragData?.text);
  }
  return ragData
    ? buildQuizPromptWithContent(topic, difficultyDescription, count, ragData.text, popularExamOnly)
    : buildQuizPrompt(topic, difficultyDescription, count, popularExamOnly);
}

function getActiveKeys(
  pct: { ia: number; rag: number; exam: number },
  hasRag: boolean
): { keys: Array<'ia' | 'rag' | 'exam'>; pct: { ia: number; rag: number; exam: number } } {
  const keys: Array<'ia' | 'rag' | 'exam'> = [];
  if (pct.ia > 0) keys.push('ia');
  if (pct.rag > 0 && hasRag) keys.push('rag');
  if (pct.exam > 0) keys.push('exam');

  const copy = { ...pct };
  if (keys.length === 0) {
    keys.push('ia');
    copy.ia = 100;
  }
  return { keys, pct: copy };
}

function calculateBlendCounts(
  count: number,
  percentages: { ia: number; rag: number; exam: number },
  hasRagData: boolean
): { ia: number; rag: number; exam: number } {
  const active = getActiveKeys(percentages, hasRagData);
  const counts = { ia: 0, rag: 0, exam: 0 };
  let sum = 0;
  active.keys.forEach((key, index) => {
    if (index === active.keys.length - 1) {
      counts[key] = count - sum;
    } else {
      const val = Math.round((active.pct[key] / 100) * count);
      counts[key] = val;
      sum += val;
    }
  });
  return counts;
}

async function sendRequest(
  provider: LLMProvider,
  apiKey: string,
  modelId: string,
  prompt: string,
  images: RagImage[]
): Promise<Response> {
  try {
    if (provider === 'gemini') {
      return await fetchGemini(apiKey, modelId, prompt, images);
    }
    if (provider === 'anthropic') {
      return await fetchAnthropic(apiKey, modelId, prompt, images);
    }
    return await fetchOpenAIFormat(provider, apiKey, modelId, prompt, images);
  } catch (err: unknown) {
    throw new Error('Falha na comunicação com a API. Verifique sua conexão.');
  }
}

async function handleResponse(response: Response, provider: LLMProvider): Promise<string> {
  if (response.status === 429) {
    const rateDetail = await extractApiError(response, provider);
    throw new Error(
      `Cota da API esgotada — você atingiu o limite de requisições. Aguarde alguns minutos e tente novamente. (${rateDetail})`
    );
  }

  if (!response.ok) {
    const specificError = await extractApiError(response, provider);
    throw new Error(specificError);
  }

  const responseJson: unknown = await response.json();
  if (provider === 'gemini') return parseGeminiResponse(responseJson);
  if (provider === 'anthropic') return parseAnthropicResponse(responseJson);
  return parseOpenAIResponse(responseJson);
}

function parseQuizResult(rawText: string): QuizQuestion[] {
  const cleanText = cleanJsonText(rawText);
  try {
    const parsed = JSON.parse(cleanText);
    return quizQuestionsSchema.parse(parsed);
  } catch (err: unknown) {
    throw new Error(
      'A IA retornou dados em formato inesperado (falha de validação de estrutura). Tente novamente com um tema diferente.'
    );
  }
}
