/**
 * Limpa marcadores Markdown em volta de JSON (comum quando o LLM ignora a instrução de responder apenas JSON).
 */
export function cleanJsonText(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```/, '');
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.replace(/```$/, '');
  }
  return cleaned.trim();
}

/**
 * Extrai o texto gerado de uma resposta da API do Gemini.
 */
export function parseGeminiResponse(json: unknown): string {
  const data = json as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };
  const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!candidate) {
    throw new Error('A IA retornou uma resposta vazia. Tente novamente.');
  }
  return candidate;
}

/**
 * Extrai o texto gerado de uma resposta no formato da API da OpenAI.
 */
export function parseOpenAIResponse(json: unknown): string {
  const data = json as {
    choices?: Array<{
      message?: { content?: string };
    }>;
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error('A IA retornou uma resposta vazia. Tente novamente.');
  }
  return text;
}

/**
 * Extrai o texto gerado de uma resposta da API do Anthropic.
 */
export function parseAnthropicResponse(json: unknown): string {
  const data = json as {
    content?: Array<{ text?: string }>;
  };
  const text = data.content?.[0]?.text;
  if (!text) {
    throw new Error('A IA retornou uma resposta vazia. Tente novamente.');
  }
  return text;
}
