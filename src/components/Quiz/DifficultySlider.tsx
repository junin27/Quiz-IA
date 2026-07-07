import React from 'react';

const DIFFICULTY_MIN = 1;
const DIFFICULTY_MAX = 10;

interface NumberStepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (val: number) => void;
  label: string;
}

const NumberStepper: React.FC<NumberStepperProps> = ({ value, min, max, onChange, label }) => {
  const clamp = (v: number) => Math.max(min, Math.min(max, v));

  return (
    <div className="flex items-center gap-0 bg-slate-950/50 border border-slate-800 rounded-xl overflow-hidden focus-within:border-rose-500 focus-within:ring-1 focus-within:ring-rose-500 transition-all">
      <button
        type="button"
        onClick={() => onChange(clamp(value - 1))}
        disabled={value <= min}
        className="px-3.5 py-3 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-25 disabled:cursor-not-allowed transition-colors font-bold text-base select-none"
        aria-label={`Diminuir ${label}`}
      >
        −
      </button>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(clamp(parseInt(e.target.value, 10) || min))}
        className="quiz-number-input flex-1 bg-transparent text-white font-bold font-mono text-center outline-none py-3 text-sm"
        aria-label={label}
      />
      <button
        type="button"
        onClick={() => onChange(clamp(value + 1))}
        disabled={value >= max}
        className="px-3.5 py-3 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-25 disabled:cursor-not-allowed transition-colors font-bold text-base select-none"
        aria-label={`Aumentar ${label}`}
      >
        +
      </button>
    </div>
  );
};

interface DifficultySliderProps {
  difficulty: string;
  onDifficultyChange: (diff: string) => void;
}

export const DifficultySlider: React.FC<DifficultySliderProps> = ({
  difficulty,
  onDifficultyChange,
}) => {
  const diffVal = parseInt(difficulty, 10) || DIFFICULTY_MIN;

  const getDifficultyLabel = (val: number): string => {
    if (val >= 10) return 'Muito Difícil';
    if (val >= 7) return 'Difícil';
    if (val >= 5) return 'Médio';
    if (val >= 3) return 'Fácil';
    return 'Muito Fácil';
  };

  const getDifficultyMultiplier = (val: number): string =>
    (1 + val / 10).toFixed(1);

  const getDifficultyColor = (val: number): string => {
    if (val >= 7) return 'text-rose-400';
    if (val >= 5) return 'text-yellow-400';
    return 'text-emerald-400';
  };

  const getDifficultyHex = (val: number): string => {
    if (val >= 7) return '#f43f5e'; // rose-500
    if (val >= 5) return '#facc15'; // yellow-400
    return '#34d399';               // emerald-400
  };

  const sliderPercent = (val: number): string =>
    `${((val - DIFFICULTY_MIN) / (DIFFICULTY_MAX - DIFFICULTY_MIN)) * 100}%`;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onDifficultyChange(e.target.value);
  };

  const handleDifficultyStep = (newVal: number) => {
    const clamped = Math.max(DIFFICULTY_MIN, Math.min(DIFFICULTY_MAX, newVal));
    onDifficultyChange(clamped.toString());
  };

  return (
    <div className="space-y-4 bg-slate-950/20 border border-slate-800/60 p-4 rounded-xl transition-all duration-300">
      <input
        type="range"
        min={DIFFICULTY_MIN}
        max={DIFFICULTY_MAX}
        step="1"
        value={difficulty}
        onChange={handleSliderChange}
        className="quiz-slider"
        style={{
          '--slider-pct': sliderPercent(diffVal),
          '--slider-color': getDifficultyHex(diffVal),
        } as React.CSSProperties}
        aria-label="Nível de dificuldade"
      />

      <NumberStepper
        value={diffVal}
        min={DIFFICULTY_MIN}
        max={DIFFICULTY_MAX}
        onChange={handleDifficultyStep}
        label="Nível de dificuldade"
      />

      <div className="text-center text-xs font-semibold pt-1">
        <span className="text-slate-300">Nível {diffVal}: </span>
        <span className={`font-bold transition-colors duration-300 ${getDifficultyColor(diffVal)}`}>
          {getDifficultyLabel(diffVal)}
        </span>
        <span className="text-slate-500 font-medium">
          {' '}(Multiplicador x{getDifficultyMultiplier(diffVal)})
        </span>
      </div>
    </div>
  );
};
