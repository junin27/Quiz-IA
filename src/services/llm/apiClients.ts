import type { LLMProvider } from '../../types/apiKey.types';
import type { RagImage } from '../../types/quiz.types';
import { PROVIDER_CONFIGS } from './constants';
import type {
  GeminiPart,
  OpenAIMessageContent,
  AnthropicMessageContent,
  ApiErrorBody
} from './types';

/**
 * Envia uma requisição HTTP para a API do Gemini.
 */
export async function fetchGemini(
  apiKey: string,
  modelId: string,
  prompt: string,
  images: RagImage[] = []
): Promise<Response> {
  const url = `${PROVIDER_CONFIGS.gemini.url}/${modelId}:generateContent?key=${apiKey}`;
  const parts: GeminiPart[] = [{ text: prompt }];

  if (images && images.length > 0) {
    images.forEach((img) => {
      parts.push({
        inlineData: {
          mimeType: img.mimeType,
          data: img.base64Data,
        },
      });
    });
  }

  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.7 },
    }),
  });
}

/**
 * Envia uma requisição HTTP para APIs baseadas no formato OpenAI (GPT, DeepSeek, Groq, Mistral, OpenRouter).
 */
export async function fetchOpenAIFormat(
  provider: LLMProvider,
  apiKey: string,
  modelId: string,
  prompt: string,
  images: RagImage[] = []
): Promise<Response> {
  const url = PROVIDER_CONFIGS[provider].url;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };

  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    headers['X-Title'] = 'QuestAI';
  }

  let messageContent: OpenAIMessageContent = prompt;
  if (images && images.length > 0) {
    messageContent = [
      { type: 'text' as const, text: prompt },
      ...images.map((img) => ({
        type: 'image_url' as const,
        image_url: {
          url: `data:${img.mimeType};base64,${img.base64Data}`,
        },
      })),
    ];
  }

  return fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: 'user', content: messageContent }],
      temperature: 0.7,
    }),
  });
}

/**
 * Envia uma requisição HTTP para a API do Anthropic (Claude).
 */
export async function fetchAnthropic(
  apiKey: string,
  modelId: string,
  prompt: string,
  images: RagImage[] = []
): Promise<Response> {
  const url = PROVIDER_CONFIGS.anthropic.url;
  let messageContent: AnthropicMessageContent = prompt;

  if (images && images.length > 0) {
    messageContent = [
      { type: 'text' as const, text: prompt },
      ...images.map((img) => ({
        type: 'image' as const,
        source: {
          type: 'base64' as const,
          media_type: img.mimeType,
          data: img.base64Data,
        },
      })),
    ];
  }

  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: modelId,
      max_tokens: 2000,
      temperature: 0.7,
      messages: [{ role: 'user', content: messageContent }],
    }),
  });
}

/**
 * Extrai e formata mensagens de erro das APIs dos provedores.
 */
export async function extractApiError(response: Response, provider: LLMProvider): Promise<string> {
  let body: ApiErrorBody = {};
  try {
    const jsonParsed = await response.json() as unknown;
    body = (jsonParsed && typeof jsonParsed === 'object' ? jsonParsed : {}) as ApiErrorBody;
  } catch (parseError: unknown) {
    console.warn(`Falha ao parsear body do erro HTTP ${response.status}:`, parseError);
  }

  const apiMessage = body.error?.message ?? response.statusText;
  const apiStatus = body.error?.status ?? body.error?.code ?? body.error?.type ?? '';

  if (provider === 'gemini') {
    const statusMessages: Record<string, string> = {
      INVALID_ARGUMENT: `Chave de API com formato inválido. Verifique se ela começa com "AIza". (Detalhe: ${apiMessage})`,
      UNAUTHENTICATED: `Chave de API não reconhecida pela Google. (Detalhe: ${apiMessage})`,
      PERMISSION_DENIED: `Sua chave não tem permissão para usar este modelo. (Detalhe: ${apiMessage})`,
      RESOURCE_EXHAUSTED: `Cota da API esgotada. (Detalhe: ${apiMessage})`,
      NOT_FOUND: `Modelo não disponível para esta chave ou região. (Detalhe: ${apiMessage})`,
    };
    if (statusMessages[apiStatus]) return statusMessages[apiStatus];
  }

  if (response.status === 401) {
    return `Chave de API inválida ou revogada. Verifique suas credenciais na plataforma do provedor. (Detalhe: ${apiMessage})`;
  }
  if (response.status === 403) {
    return `Sua chave não tem permissão para acessar este modelo ou recurso. (Detalhe: ${apiMessage})`;
  }
  if (response.status === 429) {
    return `Cota da API esgotada ou limite de requisições atingido. Aguarde e tente novamente. (Detalhe: ${apiMessage})`;
  }
  if (response.status === 404) {
    return `Modelo não encontrado. Verifique se o nome do modelo digitado está correto. (Detalhe: ${apiMessage})`;
  }

  return `Erro da API do provedor (HTTP ${response.status} — ${apiStatus || response.statusText}): ${apiMessage}`;
}
