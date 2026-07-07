import type {
  TriviaBankQuestion,
  TriviaBankProvider,
  TriviaBankFetchOptions,
  CategoryWithProviders,
  ConsolidatedCategoryMap,
} from '../types/triviaBanks.types';
import { translateBatch } from './translationService';
import { BaseTriviaBankProvider } from './providers/baseProvider';
import { OpenTriviaBankProvider } from './providers/openTriviaBankProvider';
// import { JServiceProvider } from './providers/jServiceProvider'; // Desabilitado - CORS
// import { TriviousProvider } from './providers/triviousProvider'; // Desabilitado - SSL
import { BongoTriviaProvider } from './providers/bongoTriviaProvider';
import { TheTriviaApiProvider } from './providers/theTriviaApiProvider';
import { NumbersApiProvider } from './providers/numbersApiProvider';
import { DadJokesApiProvider } from './providers/dadJokesApiProvider';
import { PeterApiProvider } from './providers/peterApiProvider';
import { OfficialJokeApiProvider } from './providers/officialJokeApiProvider';

class MultiSourceTriviaService {
  private providers: Map<TriviaBankProvider, BaseTriviaBankProvider>;
  private categoriesCache: Map<string, CategoryWithProviders> = new Map();
  private categoryIdMap: Map<string, Map<TriviaBankProvider, string>> = new Map();
  private cacheTimestamp = 0;
  private CACHE_DURATION = 60 * 60 * 1000; // 1 hora em ms

  constructor() {
    this.providers = new Map();
    this.providers.set('openTrivia', new OpenTriviaBankProvider());
    // jService desabilitado - CORS bloqueado (usa HTTP)
    // this.providers.set('jService', new JServiceProvider());
    this.providers.set('bongoTrivia', new BongoTriviaProvider());
    // Trivious desabilitado - SSL inválido
    // this.providers.set('trivious', new TriviousProvider());
    this.providers.set('theTriviaApi', new TheTriviaApiProvider());
    this.providers.set('numbersApi', new NumbersApiProvider());
    this.providers.set('dadJokes', new DadJokesApiProvider());
    this.providers.set('peterApi', new PeterApiProvider());
    this.providers.set('officialJokes', new OfficialJokeApiProvider());
  }

  async getConsolidatedCategories(): Promise<CategoryWithProviders[]> {
    const now = Date.now();
    if (
      this.categoriesCache.size > 0 &&
      now - this.cacheTimestamp < this.CACHE_DURATION
    ) {
      return Array.from(this.categoriesCache.values());
    }

    const allCategories = await Promise.all(
      Array.from(this.providers.values()).map((provider) =>
        provider.getCategories().catch(() => [])
      )
    );

    const categoryMap: ConsolidatedCategoryMap = {};
    this.categoryIdMap.clear();

    allCategories.forEach((categories) => {
      categories.forEach((cat) => {
        const normalized = this.normalizeText(cat.name);

        if (!categoryMap[normalized]) {
          categoryMap[normalized] = [];
          this.categoryIdMap.set(normalized, new Map());
        }

        const existing = categoryMap[normalized].find(
          (c) => c.id === cat.id
        );
        if (!existing) {
          categoryMap[normalized].push(cat);
        }

        this.categoryIdMap.get(normalized)?.set(cat.provider, cat.id);
      });
    });

    const consolidated: CategoryWithProviders[] = [];

    for (const normalizedName in categoryMap) {
      const categories = categoryMap[normalizedName];
      const uniqueName = categories[0].name;
      const providers = categories.map((c) => c.provider);

      const areasByProvider: Record<TriviaBankProvider, any[]> = {} as Record<TriviaBankProvider, any[]>;
      for (const provider of providers) {
        const areas = (categories.find((c) => c.provider === provider)?.areas) || [];
        areasByProvider[provider] = areas;
      }

      consolidated.push({
        id: normalizedName,
        name: uniqueName,
        providers,
        areasAvailable: Object.values(areasByProvider).some((a) => a.length > 0),
        areasByProvider,
      });
    }

    // Traduzir nomes das categorias em paralelo
    const categoriesToTranslate = consolidated.filter((cat) => {
      // Evitar traduzir se já está em português (heurística simples)
      const lowerName = cat.name.toLowerCase();
      return !['história', 'música', 'esportes', 'geografia', 'ciência', 'matemática', 'arte', 'fauna', 'anime'].some(
        (pt) => lowerName.includes(pt)
      );
    });

    if (categoriesToTranslate.length > 0) {
      try {
        const namesToTranslate = categoriesToTranslate.map((cat) => cat.name);
        const translated = await translateBatch(namesToTranslate);
        categoriesToTranslate.forEach((cat, index) => {
          cat.name = translated[index] || cat.name;
        });
      } catch {
        // Se tradução falhar, mantém nomes originais
      }
    }

    this.categoriesCache = new Map(
      consolidated.map((cat) => [cat.id, cat])
    );
    this.cacheTimestamp = now;

    return consolidated;
  }

  async fetchQuestionsForCategory(
    categoryId: string,
    areaIds?: string | string[],
    difficulty: string = '5',
    count: number = 5
  ): Promise<TriviaBankQuestion[]> {
    const categoryWithProviders = this.categoriesCache.get(categoryId);

    if (!categoryWithProviders) {
      return [];
    }

    let providersToUse = categoryWithProviders.providers;
    const areaIdArray = Array.isArray(areaIds) ? areaIds : areaIds ? [areaIds] : [];

    if (areaIdArray.length > 0) {
      const providersWithAreas = new Set<TriviaBankProvider>();
      areaIdArray.forEach((aid) => {
        const providerFromArea = this.extractProviderFromAreaId(aid);
        if (providerFromArea && categoryWithProviders.providers.includes(providerFromArea)) {
          providersWithAreas.add(providerFromArea);
        }
      });
      if (providersWithAreas.size > 0) {
        providersToUse = Array.from(providersWithAreas);
      }
    }

    const questionsPerProvider = Math.ceil(count / providersToUse.length);
    const questionPromises = providersToUse.map((provider) => {
      const providerInstance = this.providers.get(provider);
      if (!providerInstance) {
        return Promise.resolve([]);
      }

      const categoryIdForProvider = this.findCategoryIdForProvider(
        categoryId,
        provider
      );

      if (!categoryIdForProvider) {
        return Promise.resolve([]);
      }

      const options: TriviaBankFetchOptions = {
        categoryId: categoryIdForProvider,
        difficulty,
        count: questionsPerProvider,
        areaIds: areaIdArray.length > 0 ? areaIdArray : undefined,
      };

      return providerInstance.fetchQuestions(options).catch(() => []);
    });

    const results = await Promise.allSettled(questionPromises);
    const allQuestions: TriviaBankQuestion[] = [];

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        allQuestions.push(...result.value);
      }
    });

    return this.shuffleArrayExtended(allQuestions).slice(0, count);
  }

  private normalizeText(text: string): string {
    return text
      .trim()
      .toLowerCase()
      .replace(/[^\w\s]/g, '');
  }

  private findCategoryIdForProvider(
    normalizedCategoryId: string,
    provider: TriviaBankProvider
  ): string | null {
    const providerMap = this.categoryIdMap.get(normalizedCategoryId);
    if (!providerMap) {
      return null;
    }

    return providerMap.get(provider) || null;
  }

  private extractProviderFromAreaId(areaId: string): TriviaBankProvider | null {
    const match = areaId.match(/^(\w+)_area_/);
    if (match) {
      const provider = match[1] as TriviaBankProvider;
      if (this.providers.has(provider)) {
        return provider;
      }
    }
    return null;
  }

  private shuffleArrayExtended<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  getProviderName(provider: TriviaBankProvider): string {
    const names: Record<TriviaBankProvider, string> = {
      openTrivia: 'Open Trivia DB',
      jService: 'jService (Jeopardy)',
      bongoTrivia: 'Bongo Trivia',
      trivious: 'Trivious',
      theTriviaApi: 'The Trivia API',
      numbersApi: 'Numbers API',
      dadJokes: 'Dad Jokes',
      peterApi: 'Peter API',
      officialJokes: 'Official Jokes',
    };
    return names[provider] || provider;
  }
}

export const multiSourceTriviaService = new MultiSourceTriviaService();
