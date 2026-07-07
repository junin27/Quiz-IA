import type { QuizQuestion } from '../types/quiz.types';

// ─── Categorias (Open Trivia DB → rótulos em pt-BR) ──────────────────────────

export interface TriviaCategory {
  id: number;
  label: string;
}

export const TRIVIA_CATEGORIES: TriviaCategory[] = [
  { id: 9,  label: 'Conhecimento Geral' },
  { id: 10, label: 'Literatura' },
  { id: 11, label: 'Cinema' },
  { id: 12, label: 'Música' },
  { id: 13, label: 'Musicais e Teatro' },
  { id: 14, label: 'Televisão' },
  { id: 15, label: 'Videogames' },
  { id: 16, label: 'Jogos de Tabuleiro' },
  { id: 17, label: 'Ciência e Natureza' },
  { id: 18, label: 'Tecnologia e Computação' },
  { id: 19, label: 'Matemática' },
  { id: 20, label: 'Mitologia' },
  { id: 21, label: 'Esportes' },
  { id: 22, label: 'Geografia' },
  { id: 23, label: 'História' },
  { id: 24, label: 'Política' },
  { id: 25, label: 'Arte' },
  { id: 26, label: 'Celebridades' },
  { id: 27, label: 'Animais' },
  { id: 28, label: 'Veículos' },
  { id: 29, label: 'Quadrinhos' },
  { id: 30, label: 'Gadgets e Tecnologia' },
  { id: 31, label: 'Anime e Mangá' },
  { id: 32, label: 'Desenhos e Animações' },
];

// ─── Constantes ───────────────────────────────────────────────────────────────

// Quantidade máxima aceita pelo Open Trivia DB por requisição
const TRIVIA_MAX_QUESTIONS = 50;

// Limiar de dificuldade numérica → dificuldade da API de trivia
const THRESHOLD_MEDIUM = 5;
const THRESHOLD_HARD = 7;

// Prefixo retornado pela MyMemory quando a cota gratuita é esgotada
const MYMEMORY_QUOTA_WARNING = 'MYMEMORY WARNING';

// Códigos de resposta do Open Trivia DB
const TRIVIA_CODE_SUCCESS = 0;
const TRIVIA_CODE_NO_RESULTS = 1;

// ─── Helpers internos ─────────────────────────────────────────────────────────

type TriviaDifficulty = 'easy' | 'medium' | 'hard';

/**
 * Converte a escala numérica de dificuldade (1-10) do app para o enum da API
 * de trivia: easy | medium | hard.
 */
export function mapDifficultyToTrivia(difficultyValue: string): TriviaDifficulty {
  const num = parseInt(difficultyValue, 10);
  if (isNaN(num) || num < THRESHOLD_MEDIUM) return 'easy';
  if (num < THRESHOLD_HARD) return 'medium';
  return 'hard';
}

/**
 * Mapeia dificuldades textuais de APIs de trivia para valores numéricos padrão (1-10) de string.
 */
export function mapDifficultyScaleToNumber(difficulty: string): string {
  const lower = difficulty.toLowerCase();
  if (lower === 'easy') return '3';
  if (lower === 'medium') return '5';
  if (lower === 'hard') return '7';
  return '5';
}

/**
 * Decodifica entidades HTML retornadas pelo Open Trivia DB
 * (e.g. &amp; → &, &#039; → ', &quot; → ").
 */
export function decodeHtmlEntities(text: string): string {
  if (typeof document === 'undefined') {
    // Fallback simples para ambientes que não possuem document (ex: testes sem happy-dom parcial ou scripts puros)
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&rsquo;/g, "'");
  }
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

/**
 * Embaralha as opções e rastreia qual índice ficou como correto.
 * Usa Fisher-Yates para garantir distribuição uniforme.
 */
export function shuffleOptionsWithCorrectTracking(
  correct: string,
  incorrects: string[]
): { options: string[]; correctOptionIndex: number } {
  const items = [
    { text: correct, isCorrect: true },
    ...incorrects.map((t) => ({ text: t, isCorrect: false })),
  ];

  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }

  const correctOptionIndex = items.findIndex((o) => o.isCorrect);
  return { options: items.map((o) => o.text), correctOptionIndex };
}

// ─── Tradução via MyMemory (gratuita, sem chave) ──────────────────────────────

/**
 * Traduz um único texto de inglês para pt-BR usando a MyMemory API.
 * Em caso de falha (rede, cota esgotada), retorna o texto original em inglês
 * como fallback — nunca lança exceção para não interromper o fluxo.
 */
export async function translateText(text: string): Promise<string> {
  if (!text.trim()) return text;

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|pt-BR`;
    const response = await fetch(url);

    if (!response.ok) return text;

    const data = await response.json() as { responseData?: { translatedText?: string } };
    const translated = data.responseData?.translatedText ?? '';

    if (!translated || translated.startsWith(MYMEMORY_QUOTA_WARNING)) {
      // Cota diária gratuita esgotada — mantém inglês
      return text;
    }

    return translated;
  } catch {
    // Falha de rede — mantém inglês como fallback
    return text;
  }
}

/**
 * Traduz todos os campos de uma questão em paralelo (Promise.all) para
 * minimizar a latência total.
 */
export async function translateQuestionFields(
  rawQuestion: string,
  rawCorrect: string,
  rawIncorrects: string[]
): Promise<{ questionText: string; options: string[]; correctOptionIndex: number }> {
  // Traduz pergunta + opção correta + opções erradas, tudo de uma vez
  const [questionText, translatedCorrect, ...translatedIncorrects] = await Promise.all([
    translateText(rawQuestion),
    translateText(rawCorrect),
    ...rawIncorrects.map(translateText),
  ]);

  const { options, correctOptionIndex } = shuffleOptionsWithCorrectTracking(
    translatedCorrect,
    translatedIncorrects
  );

  return { questionText, options, correctOptionIndex };
}

// ─── Formato da resposta do Open Trivia DB ────────────────────────────────────

interface TriviaApiResult {
  type: string;
  difficulty: string;
  category: string;
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
}

interface TriviaApiResponse {
  response_code: number;
  results: TriviaApiResult[];
}

// ─── Export público ───────────────────────────────────────────────────────────

/**
 * Busca questões no Open Trivia DB para a categoria e dificuldade indicadas,
 * traduz tudo para pt-BR via MyMemory e devolve no formato `QuizQuestion[]`
 * compatível com o resto do app.
 *
 * @param categoryId  ID numérico de categoria do Open Trivia DB (ver TRIVIA_CATEGORIES)
 * @param difficultyValue  Valor numérico de dificuldade (1–10) usado no app
 * @param count       Quantidade desejada de questões (max 50)
 */
export async function fetchTriviaQuestions(
  categoryId: number,
  difficultyValue: string,
  count: number
): Promise<QuizQuestion[]> {
  const difficulty = mapDifficultyToTrivia(difficultyValue);
  const amount = Math.min(count, TRIVIA_MAX_QUESTIONS);

  const url = `https://opentdb.com/api.php?amount=${amount}&category=${categoryId}&difficulty=${difficulty}&type=multiple`;

  let apiResponse: TriviaApiResponse;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Falha ao conectar com o banco de questões. Verifique sua conexão.');
    }
    apiResponse = (await response.json()) as TriviaApiResponse;
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error('Falha ao buscar questões. Verifique sua conexão com a internet.');
  }

  if (apiResponse.response_code === TRIVIA_CODE_NO_RESULTS) {
    throw new Error(
      'Não há questões suficientes nesta categoria com a dificuldade selecionada. ' +
        'Tente reduzir a quantidade de perguntas ou mudar a dificuldade.'
    );
  }

  if (
    apiResponse.response_code !== TRIVIA_CODE_SUCCESS ||
    apiResponse.results.length === 0
  ) {
    throw new Error('Não foi possível obter questões. Tente novamente mais tarde.');
  }

  // Decodifica entidades HTML antes de traduzir
  const decoded = apiResponse.results.map((r) => ({
    question: decodeHtmlEntities(r.question),
    correct_answer: decodeHtmlEntities(r.correct_answer),
    incorrect_answers: r.incorrect_answers.map(decodeHtmlEntities),
  }));

  // Traduz todas as questões em paralelo
  const translatedFields = await Promise.all(
    decoded.map((r) =>
      translateQuestionFields(r.question, r.correct_answer, r.incorrect_answers)
    )
  );

  return translatedFields.map((fields, index) => ({
    id: `trivia-${categoryId}-${index}-${Date.now()}`,
    questionText: fields.questionText,
    options: fields.options,
    correctOptionIndex: fields.correctOptionIndex,
    // Open Trivia DB não fornece explicação — geramos uma simples
    explanation: `A resposta correta é: "${fields.options[fields.correctOptionIndex]}".`,
  }));
}
