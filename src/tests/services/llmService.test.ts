import { describe, it, expect, vi, afterEach } from 'vitest';
import { validateApiKey, generateQuizQuestions } from '../../services/llmService';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

afterEach(() => {
  mockFetch.mockReset();
});

function buildErrorResponse(
  status: number,
  statusText: string,
  apiStatus: string,
  apiMessage: string
) {
  return {
    ok: false,
    status,
    statusText,
    json: () =>
      Promise.resolve({
        error: { code: status, message: apiMessage, status: apiStatus },
      }),
  };
}

function buildSuccessResponse(text: string, provider: string) {
  let jsonPayload = {};
  if (provider === 'gemini') {
    jsonPayload = { candidates: [{ content: { parts: [{ text }] } }] };
  } else if (provider === 'anthropic') {
    jsonPayload = { content: [{ text }] };
  } else {
    jsonPayload = { choices: [{ message: { content: text } }] };
  }
  
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(jsonPayload),
  };
}

const VALID_QUESTIONS_JSON = JSON.stringify([
  {
    id: 'q1',
    questionText: 'Pergunta de teste?',
    options: ['A', 'B', 'C', 'D'],
    correctOptionIndex: 0,
    explanation: 'Explicação teste.',
  },
]);

describe('validateApiKey', () => {
  it('retorna válido para mock-key-for-testing sem fetch', async () => {
    const result = await validateApiKey('mock-key-for-testing', 'gemini');
    expect(result.valid).toBe(true);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('valida corretamente usando provider gemini', async () => {
    mockFetch.mockResolvedValue(buildSuccessResponse('', 'gemini'));
    const result = await validateApiKey('key', 'gemini');
    expect(result.valid).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('generativelanguage'), expect.any(Object));
  });

  it('valida corretamente usando provider openai', async () => {
    mockFetch.mockResolvedValue(buildSuccessResponse('', 'openai'));
    const result = await validateApiKey('key', 'openai');
    expect(result.valid).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('api.openai.com'), expect.any(Object));
  });

  it('valida corretamente usando provider anthropic e envia headers custom', async () => {
    mockFetch.mockResolvedValue(buildSuccessResponse('', 'anthropic'));
    const result = await validateApiKey('key', 'anthropic');
    expect(result.valid).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('api.anthropic.com'), expect.objectContaining({
      headers: expect.objectContaining({ 'anthropic-version': '2023-06-01' })
    }));
  });

  it('trata erro genérico com status 401', async () => {
    mockFetch.mockResolvedValue(buildErrorResponse(401, 'Unauthorized', '', 'Invalid token'));
    const result = await validateApiKey('key', 'openai');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/inválida ou revogada/);
  });
});

describe('generateQuizQuestions', () => {
  it('lança erro Offline Mode para chaves vazias', async () => {
    await expect(generateQuizQuestions('', 'Topico', '5', 5, 'openai')).rejects.toThrow(/Modo Offline/);
  });

  it('gera questões com sucesso usando Gemini', async () => {
    mockFetch.mockResolvedValue(buildSuccessResponse(VALID_QUESTIONS_JSON, 'gemini'));
    const q = await generateQuizQuestions('key', 'Topico', '5', 1, 'gemini');
    expect(q).toHaveLength(1);
  });

  it('gera questões com sucesso usando OpenAI', async () => {
    mockFetch.mockResolvedValue(buildSuccessResponse(VALID_QUESTIONS_JSON, 'openai'));
    const q = await generateQuizQuestions('key', 'Topico', '5', 1, 'openai');
    expect(q).toHaveLength(1);
  });

  it('gera questões com sucesso usando Anthropic', async () => {
    mockFetch.mockResolvedValue(buildSuccessResponse(VALID_QUESTIONS_JSON, 'anthropic'));
    const q = await generateQuizQuestions('key', 'Topico', '5', 1, 'anthropic');
    expect(q).toHaveLength(1);
  });

  it('gera questões usando OpenRouter e injeta Referer', async () => {
    mockFetch.mockResolvedValue(buildSuccessResponse(VALID_QUESTIONS_JSON, 'openrouter'));
    await generateQuizQuestions('key', 'Topico', '5', 1, 'openrouter');
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('openrouter.ai'), expect.objectContaining({
      headers: expect.objectContaining({ 'HTTP-Referer': expect.any(String) })
    }));
  });

  it('repassa modelId corretamente para API', async () => {
    mockFetch.mockResolvedValue(buildSuccessResponse(VALID_QUESTIONS_JSON, 'openai'));
    await generateQuizQuestions('key', 'Topico', '5', 1, 'openai', 'gpt-4o');
    // Para OpenAI o modelId vai no body
    const reqBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(reqBody.model).toBe('gpt-4o');
  });

  it('lança erro específico de limite (429)', async () => {
    mockFetch.mockResolvedValue(buildErrorResponse(429, 'Too Many Requests', '', 'Rate limit exceeded'));
    await expect(generateQuizQuestions('key', 'Topico', '5', 1, 'anthropic')).rejects.toThrow(/limite de requisições/);
  });

  it('lança erro se o JSON retornado pelo LLM falhar na validação de estrutura do Zod', async () => {
    const invalidJson = JSON.stringify([
      {
        id: 'q1',
        questionText: 'Pergunta inválida?',
        options: ['A', 'B', 'C'], // Apenas 3 opções, viola o limite de 4 do schema
        correctOptionIndex: 0,
        explanation: 'Explicação.',
      },
    ]);
    mockFetch.mockResolvedValue(buildSuccessResponse(invalidJson, 'gemini'));
    await expect(generateQuizQuestions('key', 'Topico', '5', 1, 'gemini')).rejects.toThrow(
      /falha de validação de estrutura/
    );
  });

  it('envia diretrizes de exames no prompt se popularExamOnly for true', async () => {
    mockFetch.mockResolvedValue(buildSuccessResponse(VALID_QUESTIONS_JSON, 'gemini'));
    await generateQuizQuestions('key', 'Física Quântica', '5', 4, 'gemini', undefined, true);
    
    const callArgs = mockFetch.mock.calls[0];
    const reqOptions = callArgs[1];
    const reqBody = JSON.parse(reqOptions.body);
    const promptText = reqBody.contents[0].parts[0].text;
    
    expect(promptText).toContain('Questões Populares de Provas');
    expect(promptText).toContain('isPopularExam');
  });

  it('gera questões com base no RAG se ragData for fornecido', async () => {
    mockFetch.mockResolvedValue(buildSuccessResponse(VALID_QUESTIONS_JSON, 'gemini'));
    
    const ragData = {
      text: 'Este é o conteúdo do material de estudo. A capital da França é Paris.',
      images: [{ mimeType: 'image/png', base64Data: 'abcd' }]
    };
    
    await generateQuizQuestions(
      'key',
      'Geografia',
      '5',
      1,
      'gemini',
      undefined,
      false,
      ragData
    );
    
    expect(mockFetch).toHaveBeenCalled();
    const reqOptions = mockFetch.mock.calls[0][1];
    const reqBody = JSON.parse(reqOptions.body);
    const parts = reqBody.contents[0].parts;
    
    // O primeiro part deve ser o texto do prompt contendo o material
    expect(parts[0].text).toContain('Você é um gerador de quiz profissional e bem treinado');
    expect(parts[0].text).toContain('Este é o conteúdo do material de estudo');
    
    // O segundo part deve ser o inlineData da imagem
    expect(parts[1].inlineData).toBeDefined();
    expect(parts[1].inlineData.mimeType).toBe('image/png');
    expect(parts[1].inlineData.data).toBe('abcd');
  });
});
