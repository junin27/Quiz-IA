import { useState, useEffect } from 'react';
import { multiSourceTriviaService } from '../services/multiSourceTriviaService';
import type {
  CategoryWithProviders,
  TriviaBankQuestion,
  TriviaBankArea,
} from '../types/triviaBanks.types';

interface UseMultiSourceTriviaReturn {
  categories: CategoryWithProviders[];
  isLoadingCategories: boolean;
  selectedCategory: CategoryWithProviders | null;
  selectedAreaIds: string[];
  availableAreas: TriviaBankArea[];
  selectCategory: (categoryId: string) => void;
  selectArea: (areaId: string, isSelected: boolean) => void;
  clearSelectedAreas: () => void;
  fetchQuestions: (difficulty: string, count: number) => Promise<TriviaBankQuestion[]>;
  isLoadingQuestions: boolean;
}

export function useMultiSourceTrivia(): UseMultiSourceTriviaReturn {
  const [categories, setCategories] = useState<CategoryWithProviders[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<CategoryWithProviders | null>(null);
  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await multiSourceTriviaService.getConsolidatedCategories();
        setCategories(cats);
      } catch {
        console.error('Erro ao carregar categorias');
      } finally {
        setIsLoadingCategories(false);
      }
    };

    loadCategories();
  }, []);

  const selectCategory = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    setSelectedCategory(category || null);
    setSelectedAreaIds([]);
  };

  const selectArea = (areaId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedAreaIds((prev) => [...new Set([...prev, areaId])]);
    } else {
      setSelectedAreaIds((prev) => prev.filter((id) => id !== areaId));
    }
  };

  const clearSelectedAreas = () => {
    setSelectedAreaIds([]);
  };

  const availableAreas = selectedCategory
    ? Object.values(selectedCategory.areasByProvider)
        .flat()
        .filter((area, index, self) =>
          index === self.findIndex((a) => a.name === area.name)
        )
    : [];

  const fetchQuestions = async (
    difficulty: string,
    count: number
  ): Promise<TriviaBankQuestion[]> => {
    if (!selectedCategory) {
      return [];
    }

    setIsLoadingQuestions(true);
    try {
      const areaIds = selectedAreaIds.length > 0 ? selectedAreaIds : undefined;
      const questions = await multiSourceTriviaService.fetchQuestionsForCategory(
        selectedCategory.id,
        areaIds,
        difficulty,
        count
      );
      return questions;
    } catch {
      console.error('Erro ao buscar questões');
      return [];
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  return {
    categories,
    isLoadingCategories,
    selectedCategory,
    selectedAreaIds,
    availableAreas,
    selectCategory,
    selectArea,
    clearSelectedAreas,
    fetchQuestions,
    isLoadingQuestions,
  };
}
