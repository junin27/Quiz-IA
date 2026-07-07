import { BaseTriviaBankProvider } from './baseProvider';
import { translateText } from '../translationService';
import { mapDifficultyScaleToNumber } from '../triviaService';
import type {
  TriviaBankCategory,
  TriviaBankQuestion,
  TriviaBankFetchOptions,
  TriviaBankArea,
} from '../../types/triviaBanks.types';

interface TheTriviaApiQuestion {
  category: string;
  id: string;
  correctAnswer: string;
  incorrectAnswers: string[];
  question: string;
  tags: string[];
  type: string;
  difficulty: string;
  regions: string[];
}

const THE_TRIVIA_CATEGORIES = [
  { id: 1, name: 'Science' },
  { id: 2, name: 'History' },
  { id: 3, name: 'Geography' },
  { id: 4, name: 'Music' },
  { id: 5, name: 'Film' },
  { id: 6, name: 'Sport' },
  { id: 7, name: 'Arts & Literature' },
  { id: 8, name: 'General Knowledge' },
  { id: 9, name: 'Food & Drink' },
  { id: 10, name: 'Society & Culture' },
];

const CATEGORY_MAP: Record<string, string> = {
  'Science': 'science',
  'History': 'history',
  'Geography': 'geography',
  'Music': 'music',
  'Film': 'film',
  'Sport': 'sport',
  'Arts & Literature': 'arts',
  'General Knowledge': 'general',
  'Food & Drink': 'food',
  'Society & Culture': 'society',
};

export class TheTriviaApiProvider extends BaseTriviaBankProvider {
  providerName = 'theTriviaApi' as const;
  private areasCache: Map<string, TriviaBankArea[]> = new Map();

  async getCategories(): Promise<TriviaBankCategory[]> {
    const categories = THE_TRIVIA_CATEGORIES.map((cat) => ({
      id: `theTriviaApi_${cat.id}`,
      name: cat.name,
      provider: this.providerName,
    }));

    for (const cat of categories) {
      const areas = await this.fetchAreas(cat.name);
      if (areas.length > 0) {
        (cat as any).areas = areas;
      }
    }

    return categories;
  }

  async fetchQuestions(
    options: TriviaBankFetchOptions
  ): Promise<TriviaBankQuestion[]> {
    const categoryName = Array.from(THE_TRIVIA_CATEGORIES.values()).find(
      (c) => `theTriviaApi_${c.id}` === options.categoryId
    )?.name;

    if (!categoryName) {
      return [];
    }

    const categoryParam = CATEGORY_MAP[categoryName] || categoryName.toLowerCase();

    try {
      let url = `https://the-trivia-api.com/v2/questions?categories=${categoryParam}&limit=${options.count}`;

      if (options.difficulty) {
        url += `&difficulty=${options.difficulty}`;
      }

      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });

      if (!response.ok) {
        return [];
      }

      const data = (await response.json()) as TheTriviaApiQuestion[];
      if (!Array.isArray(data) || data.length === 0) {
        return [];
      }

      return data.map((q, index) => {
        const allOptions = [q.correctAnswer, ...q.incorrectAnswers];
        const shuffled = this.shuffleArray(allOptions);
        const correctIndex = shuffled.indexOf(q.correctAnswer);

        return {
          id: `theTriviaApi-${categoryName}-${q.id}-${index}`,
          text: q.question,
          options: shuffled,
          correctIndex,
          provider: this.providerName,
          category: categoryName,
          categoryId: options.categoryId,
          areaId: options.areaIds?.[0],
          areaName: options.areaIds && options.areaIds.length > 0 ? this.extractAreaName(q.tags) : undefined,
          difficulty: mapDifficultyScaleToNumber(q.difficulty),
          explanation: `A resposta correta é: "${q.correctAnswer}".`,
        };
      });
    } catch {
      return [];
    }
  }

  private async fetchAreas(categoryName: string): Promise<TriviaBankArea[]> {
    const cacheKey = categoryName;
    if (this.areasCache.has(cacheKey)) {
      return this.areasCache.get(cacheKey) || [];
    }

    const categoryParam = CATEGORY_MAP[categoryName] || categoryName.toLowerCase();

    try {
      const url = `https://the-trivia-api.com/v2/questions?categories=${categoryParam}&limit=100`;
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });

      if (!response.ok) {
        this.areasCache.set(cacheKey, []);
        return [];
      }

      const data = (await response.json()) as TheTriviaApiQuestion[];
      const tagSet = new Set<string>();

      data.forEach((q) => {
        if (q.tags && Array.isArray(q.tags)) {
          q.tags.forEach((tag) => tagSet.add(tag));
        }
      });

      const tagArray = Array.from(tagSet).slice(0, 10);

      // Traduzir tags para português
      const translatedTags = await Promise.all(
        tagArray.map((tag) => translateText(tag))
      );

      const areas = translatedTags.map((translatedTag, index) => ({
        id: `theTriviaApi_area_${categoryName}_${index}`,
        name: translatedTag.charAt(0).toUpperCase() + translatedTag.slice(1),
        provider: this.providerName,
      }));

      this.areasCache.set(cacheKey, areas);
      return areas;
    } catch {
      this.areasCache.set(cacheKey, []);
      return [];
    }
  }

  private extractAreaName(tags: string[]): string {
    return tags && tags.length > 0 ? tags[0] : 'General';
  }
}
