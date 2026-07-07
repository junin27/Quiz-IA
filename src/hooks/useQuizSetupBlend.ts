import { useState } from 'react';

export interface ActiveModels {
  ia: boolean;
  rag: boolean;
  exam: boolean;
}

export interface Percentages {
  ia: number;
  rag: number;
  exam: number;
}

export function useQuizSetupBlend() {
  const [activeModels, setActiveModels] = useState<ActiveModels>({
    ia: true,
    rag: false,
    exam: false,
  });

  const [percentages, setPercentages] = useState<Percentages>({
    ia: 100,
    rag: 0,
    exam: 0,
  });

  const getActiveCount = (): number => {
    return (activeModels.ia ? 1 : 0) + (activeModels.rag ? 1 : 0) + (activeModels.exam ? 1 : 0);
  };

  const handleToggleModel = (model: 'ia' | 'rag' | 'exam') => {
    const nextActiveModels = {
      ...activeModels,
      [model]: !activeModels[model],
    };

    setActiveModels(nextActiveModels);

    const newActiveKeys = (Object.keys(nextActiveModels) as Array<'ia' | 'rag' | 'exam'>).filter(
      (k) => nextActiveModels[k]
    );

    const newPercentages = { ia: 0, rag: 0, exam: 0 };
    if (newActiveKeys.length === 1) {
      newPercentages[newActiveKeys[0]] = 100;
    } else if (newActiveKeys.length === 2) {
      newPercentages[newActiveKeys[0]] = 50;
      newPercentages[newActiveKeys[1]] = 50;
    } else if (newActiveKeys.length === 3) {
      newPercentages.ia = 34;
      newPercentages.rag = 33;
      newPercentages.exam = 33;
    }

    setPercentages(newPercentages);
  };

  const handlePercentageChange = (model: 'ia' | 'rag' | 'exam', newPct: number) => {
    const activeKeys = (Object.keys(activeModels) as Array<'ia' | 'rag' | 'exam'>).filter(
      (k) => activeModels[k]
    );
    if (activeKeys.length <= 1) return;

    const clampedPct = Math.max(0, Math.min(100, newPct));
    const remaining = 100 - clampedPct;
    const otherActiveKeys = activeKeys.filter((k) => k !== model);

    if (otherActiveKeys.length === 1) {
      setPercentages((prev) => ({
        ...prev,
        [model]: clampedPct,
        [otherActiveKeys[0]]: remaining,
      }));
    } else {
      const other1 = otherActiveKeys[0];
      const other2 = otherActiveKeys[1];

      const prevVal1 = percentages[other1];
      const prevVal2 = percentages[other2];
      const prevSum = prevVal1 + prevVal2;

      let newVal1 = 0;
      let newVal2 = 0;

      if (prevSum === 0) {
        newVal1 = Math.floor(remaining / 2);
        newVal2 = remaining - newVal1;
      } else {
        newVal1 = Math.round(remaining * (prevVal1 / prevSum));
        newVal1 = Math.max(0, Math.min(remaining, newVal1));
        newVal2 = remaining - newVal1;
      }

      setPercentages((prev) => ({
        ...prev,
        [model]: clampedPct,
        [other1]: newVal1,
        [other2]: newVal2,
      }));
    }
  };

  return {
    activeModels,
    percentages,
    getActiveCount,
    handleToggleModel,
    handlePercentageChange,
    setPercentages,
  };
}
