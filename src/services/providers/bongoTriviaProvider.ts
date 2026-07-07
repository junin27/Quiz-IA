import { BaseTriviaBankProvider } from './baseProvider';
import type {
  TriviaBankCategory,
  TriviaBankQuestion,
  TriviaBankFetchOptions,
} from '../../types/triviaBanks.types';

import { mapDifficultyScaleToNumber } from '../triviaService';

interface BongoTriviaQuestion {
  id: number;
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
  category: string;
  type: string;
  difficulty: string;
}

const BONGO_CATEGORIES = [
  { id: 1, name: 'Entertainment' },
  { id: 2, name: 'Sports' },
  { id: 3, name: 'Science' },
  { id: 4, name: 'Animals' },
  { id: 5, name: 'General Knowledge' },
  { id: 6, name: 'Mythology' },
  { id: 7, name: 'Politics' },
  { id: 8, name: 'Geography' },
  { id: 9, name: 'History' },
];

export class BongoTriviaProvider extends BaseTriviaBankProvider {
  providerName = 'bongoTrivia' as const;

  async getCategories(): Promise<TriviaBankCategory[]> {
    return BONGO_CATEGORIES.map((cat) => ({
      id: `bongoTrivia_${cat.id}`,
      name: cat.name,
      provider: this.providerName,
    }));
  }

  async fetchQuestions(
    options: TriviaBankFetchOptions
  ): Promise<TriviaBankQuestion[]> {
    const categoryId = parseInt(options.categoryId.split('_')[1], 10);
    if (isNaN(categoryId)) {
      return [];
    }

    const categoryMap: Record<number, string> = {
      1: 'entertainment',
      2: 'sports',
      3: 'science',
      4: 'animals',
      5: 'general',
      6: 'mythology',
      7: 'politics',
      8: 'geography',
      9: 'history',
    };

    const category = categoryMap[categoryId];
    if (!category) {
      return [];
    }

    try {
      const url = `https://beta-trivia.bongobot.io/api/?category=${category}&limit=${options.count}&type=multiple`;
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });

      if (!response.ok) {
        return [];
      }

      const data = (await response.json()) as BongoTriviaQuestion[];
      if (!Array.isArray(data) || data.length === 0) {
        return [];
      }

      const categoryName = BONGO_CATEGORIES.find((c) => c.id === categoryId)?.name || category;

      return data.map((q, index) => {
        const allOptions = [q.correct_answer, ...q.incorrect_answers];
        const shuffled = this.shuffleArray(allOptions);
        const correctIndex = shuffled.indexOf(q.correct_answer);

        return {
          id: `bongoTrivia-${categoryId}-${q.id}-${index}`,
          text: q.question,
          options: shuffled,
          correctIndex,
          provider: this.providerName,
          category: categoryName,
          categoryId: options.categoryId,
          difficulty: mapDifficultyScaleToNumber(q.difficulty),
          explanation: `A resposta correta é: "${q.correct_answer}".`,
        };
      });
    } catch {
      return [];
    }
  }
}
