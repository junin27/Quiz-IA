import React, { useState } from 'react';
import type { DifficultyLevel } from '../../types/quiz.types';
import { Button } from '../Common/Button';
import { AlertTriangle, Settings, Loader, UploadCloud, Trash2, CheckCircle, FileSpreadsheet, File, ChevronDown } from 'lucide-react';
import { useMultiSourceTrivia } from '../../hooks/useMultiSourceTrivia';
import { Toast } from '../Common/Toast';
import { useQuizSetupFiles } from '../../hooks/useQuizSetupFiles';
import { useQuizSetupBlend } from '../../hooks/useQuizSetupBlend';
import { DifficultySlider } from './DifficultySlider';

const COUNT_OPTIONS = [5, 10, 20] as const;
const COUNT_CUSTOM_MIN = 1;
const COUNT_CUSTOM_MAX = 50;

export interface BlendedQuizOptions {
  iaPercent: number;
  ragPercent: number;
  examPercent: number;
  ragFiles: any[]; // Mantido para compatibilidade, será tipado mais abaixo
}

interface QuizSetupProps {
  onStartQuiz: (
    topic: string,
    difficulty: DifficultyLevel,
    count: number,
    options?: BlendedQuizOptions
  ) => void;
  isLoading: boolean;
  isTriviaMode?: boolean;
  onNavigateToApiSetup?: () => void;
}

export const QuizSetup: React.FC<QuizSetupProps> = ({
  onStartQuiz,
  isLoading,
  isTriviaMode = false,
  onNavigateToApiSetup,
}) => {
  const triviaData = useMultiSourceTrivia();
  const [topic, setTopic] = useState<string>('');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('5');
  const [count, setCount] = useState<number>(5);
  const [isCustomCount, setIsCustomCount] = useState<boolean>(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState<boolean>(false);

  // Hooks extraídos
  const {
    ragFiles,
    isDragging,
    setRagFiles,
    setIsDragging,
    handleFileChange,
  } = useQuizSetupFiles();

  const {
    activeModels,
    percentages,
    getActiveCount,
    handleToggleModel,
    handlePercentageChange,
  } = useQuizSetupBlend();

  const [localToast, setLocalToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    isVisible: boolean;
  }>({
    message: '',
    type: 'info',
    isVisible: false,
  });

  const showLocalToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setLocalToast({ message, type, isVisible: true });
  };

  const isRagActive = activeModels.rag;

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['png', 'jpg', 'jpeg', 'webp'].includes(ext || '')) {
      return (
        <svg className="w-4 h-4 text-amber-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
      );
    }
    if (ext === 'xlsx' || ext === 'xls') {
      return <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />;
    }
    if (ext === 'pdf') {
      return (
        <svg className="w-4 h-4 text-rose-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <path d="M16 13a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2z" />
        </svg>
      );
    }
    if (ext === 'docx') {
      return <svg className="w-4 h-4 text-sky-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><path d="M16 13H8M16 17H8M10 9H8" /></svg>;
    }
    if (ext === 'pptx') {
      return (
        <svg className="w-4 h-4 text-orange-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <path d="M12 18V12M16 15H8" />
        </svg>
      );
    }
    return <File className="w-4 h-4 text-slate-400 shrink-0" />;
  };

  const handleStartLlmQuiz = (finalTopic: string) => {
    const activeCount = getActiveCount();
    if (activeCount === 0) {
      showLocalToast('Você deve manter pelo menos uma opção de elaboração de questão ativa.', 'error');
      return;
    }

    if (!finalTopic && !isRagActive) return;

    if (isRagActive) {
      const parsingFiles = ragFiles.filter((f) => f.status === 'loading');
      if (parsingFiles.length > 0) {
        alert('Aguarde a leitura de todos os arquivos ser concluída.');
        return;
      }
      const successfulFiles = ragFiles.filter((f) => f.status === 'success');
      if (successfulFiles.length === 0) {
        alert('Por favor, faça o upload de pelo menos um arquivo com sucesso para usar o RAG.');
        return;
      }
    }

    onStartQuiz(
      isRagActive && !finalTopic ? 'Material de Conteúdo' : finalTopic,
      difficulty,
      count,
      {
        iaPercent: activeModels.ia ? percentages.ia : 0,
        ragPercent: activeModels.rag ? percentages.rag : 0,
        examPercent: activeModels.exam ? percentages.exam : 0,
        ragFiles: activeModels.rag ? ragFiles : [],
      }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isTriviaMode) {
      handleStartLlmQuiz(topic.trim());
      return;
    }

    if (!triviaData.selectedCategory) return;

    const categoryAndAreas = triviaData.selectedAreaIds.length > 0
      ? `${triviaData.selectedCategory.id}|${triviaData.selectedAreaIds.join(',')}`
      : triviaData.selectedCategory.id;

    onStartQuiz(categoryAndAreas, difficulty, count);
  };

  const handleCategorySelect = (categoryId: string) => {
    triviaData.selectCategory(categoryId);
    setTopic(categoryId);
  };

  const handleAreaToggle = (areaId: string) => {
    const isSelected = triviaData.selectedAreaIds.includes(areaId);
    triviaData.selectArea(areaId, !isSelected);
  };

  return (
    <div className="glass-card w-full max-w-lg p-8 rounded-2xl mx-auto my-6 relative overflow-hidden">
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      <h2 className="text-2xl font-extrabold text-white text-center mb-6">Iniciar Novo Quiz</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {isTriviaMode && (
          <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-300 leading-relaxed">
              <strong className="text-amber-200">Modo Multi-Banco Ativo.</strong> Questões de múltiplas fontes.
              {onNavigateToApiSetup && (
                <>
                  {' '}Para questões personalizadas,{' '}
                  <button
                    type="button"
                    onClick={onNavigateToApiSetup}
                    className="inline-flex items-center gap-1 underline text-amber-200 hover:text-white transition-colors"
                  >
                    <Settings size={11} />
                    configure uma API key
                  </button>
                  .
                </>
              )}
            </div>
          </div>
        )}

        {isTriviaMode ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                CATEGORIA
              </label>
              {triviaData.isLoadingCategories ? (
                <div className="flex items-center justify-center py-6 text-slate-400">
                  <Loader size={16} className="animate-spin mr-2" />
                  Carregando categorias...
                </div>
              ) : (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl text-white outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all text-left"
                  >
                    <span className="truncate">
                      {topic
                        ? triviaData.categories.find((c) => c.id === topic)?.name
                        : 'Selecione uma categoria...'}
                    </span>
                    <ChevronDown size={16} className={`text-slate-500 transition-transform duration-200 ${isCategoryOpen ? 'rotate-180 text-rose-500' : ''}`} />
                  </button>

                  {isCategoryOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsCategoryOpen(false)} />
                      <div className="absolute left-0 right-0 mt-1.5 bg-slate-950/95 border border-slate-800 rounded-xl shadow-xl max-h-60 overflow-y-auto z-20 backdrop-blur-md">
                        <button
                          type="button"
                          onClick={() => { handleCategorySelect(''); setIsCategoryOpen(false); }}
                          className={`w-full px-4 py-2.5 text-left text-xs transition-colors hover:bg-slate-900/60 ${!topic ? 'text-rose-400 font-bold bg-rose-500/5' : 'text-slate-300'}`}
                        >
                          Selecione uma categoria...
                        </button>
                        {triviaData.categories.map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => { handleCategorySelect(cat.id); setIsCategoryOpen(false); }}
                            className={`w-full px-4 py-2.5 text-left text-xs transition-colors hover:bg-slate-900/60 border-t border-slate-900/40 ${topic === cat.id ? 'text-rose-400 font-bold bg-rose-500/5' : 'text-slate-350'}`}
                          >
                            {cat.name} ({cat.providers.length} fonte{cat.providers.length !== 1 ? 's' : ''})
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {triviaData.selectedCategory && triviaData.selectedCategory.areasAvailable && triviaData.availableAreas.length > 0 && (
              <div className="animate-fade-in">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    ÁREAS (Opcional)
                  </label>
                  {triviaData.selectedAreaIds.length > 0 && (
                    <button
                      type="button"
                      onClick={triviaData.clearSelectedAreas}
                      className="text-xs text-rose-400 hover:text-rose-300 transition-colors underline"
                    >
                      Limpar seleção
                    </button>
                  )}
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto bg-slate-950/20 border border-slate-800 rounded-lg p-3">
                  {triviaData.availableAreas.map((area) => (
                    <label
                      key={area.id}
                      className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-rose-500/5 hover:text-white transition-all duration-200 border border-transparent hover:border-rose-500/10"
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                        triviaData.selectedAreaIds.includes(area.id)
                          ? 'border-rose-500 bg-rose-500 text-white'
                          : 'border-slate-700 bg-slate-950/40 text-transparent'
                      }`}>
                        <svg className="w-2.5 h-2.5 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                      <input
                        type="checkbox"
                        checked={triviaData.selectedAreaIds.includes(area.id)}
                        onChange={() => handleAreaToggle(area.id)}
                        className="hidden"
                      />
                      <span className={`text-xs transition-colors flex-1 ${
                        triviaData.selectedAreaIds.includes(area.id) ? 'text-slate-200 font-bold' : 'text-slate-400'
                      }`}>
                        {area.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                {isRagActive ? 'Foco do Tema (Opcional)' : 'TEMA DESEJADO DO QUIZ'}
              </label>
              <input
                type="text"
                required={!isRagActive}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={isRagActive
                  ? "Ex: Focar em fórmulas específicas, focar na introdução..."
                  : "Ex: Astrofísica, Marvel, Mitologia Nórdica..."
                }
                className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl text-white outline-none placeholder-slate-700 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            NÍVEL DE DIFICULDADE DAS QUESTÕES
          </label>
          <DifficultySlider difficulty={difficulty} onDifficultyChange={setDifficulty} />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Perguntas
          </label>
          <div className="grid grid-cols-4 gap-2">
            {COUNT_OPTIONS.map((qCount) => (
              <button
                key={qCount}
                type="button"
                onClick={() => { setCount(qCount); setIsCustomCount(false); }}
                className={`py-3 rounded-xl border font-bold text-xs transition-all ${!isCustomCount && count === qCount
                  ? 'border-rose-500 bg-rose-500/10 text-white shadow-lg'
                  : 'border-slate-800 bg-slate-950/20 text-slate-400 hover:border-rose-500/40 hover:text-slate-200'
                  }`}
              >
                {qCount}
              </button>
            ))}
            <button
              type="button"
              onClick={() => { setIsCustomCount(true); setCount(COUNT_CUSTOM_MIN); }}
              className={`py-3 rounded-xl border font-bold text-xs transition-all ${isCustomCount
                ? 'border-rose-500 bg-rose-500/10 text-white shadow-lg'
                : 'border-slate-800 bg-slate-950/20 text-slate-400 hover:border-rose-500/40 hover:text-slate-200'
                }`}
            >
              Outro
            </button>
          </div>

          {isCustomCount && (
            <div className="mt-3 bg-slate-950/20 border border-slate-800/60 p-4 rounded-xl space-y-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCount((prev) => Math.max(COUNT_CUSTOM_MIN, prev - 1))}
                  className="px-3.5 py-3 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-400 font-bold hover:text-rose-400"
                >
                  −
                </button>
                <input
                  type="number"
                  min={COUNT_CUSTOM_MIN}
                  max={COUNT_CUSTOM_MAX}
                  value={count}
                  onChange={(e) => setCount(Math.max(COUNT_CUSTOM_MIN, Math.min(COUNT_CUSTOM_MAX, parseInt(e.target.value) || COUNT_CUSTOM_MIN)))}
                  className="flex-1 bg-transparent text-white font-bold font-mono text-center outline-none py-3 text-sm border border-slate-800 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setCount((prev) => Math.min(COUNT_CUSTOM_MAX, prev + 1))}
                  className="px-3.5 py-3 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-400 font-bold hover:text-rose-400"
                >
                  +
                </button>
              </div>
              <span className="block text-[10px] text-slate-500 text-center font-medium">
                Tolerado no mínimo {COUNT_CUSTOM_MIN} e no máximo {COUNT_CUSTOM_MAX} questões!
              </span>
            </div>
          )}
        </div>

        {!isTriviaMode && (
          <div className="space-y-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Elaboração das Questões
            </label>
            <div className="space-y-3 bg-slate-950/20 border border-slate-800/60 p-4 rounded-xl">
              <div className="space-y-2 border-b border-slate-800/40 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg border transition-colors ${activeModels.ia
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      : 'bg-slate-800/50 text-slate-400 border-slate-700/50'
                      }`}>
                      <svg className="w-[14px] h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-200">Geração por IA (Tema Livre)</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleModel('ia')}
                    className={`w-9 h-5 rounded-full transition-all relative ${activeModels.ia ? 'bg-rose-500' : 'bg-slate-800'}`}
                  >
                    <span className={`block w-4 h-4 rounded-full bg-white absolute top-0.5 left-0.5 transition-all ${activeModels.ia ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>
                {activeModels.ia && getActiveCount() > 1 && (
                  <div className="flex items-center gap-3 pl-8">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={percentages.ia}
                      onChange={(e) => handlePercentageChange('ia', parseInt(e.target.value) || 0)}
                      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                    />
                    <span className="text-xs font-mono font-bold text-rose-400 w-10 text-right">{percentages.ia}%</span>
                  </div>
                )}
              </div>

              <div className="space-y-2 border-b border-slate-800/40 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg border transition-colors ${activeModels.rag
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      : 'bg-slate-800/50 text-slate-400 border-slate-700/50'
                      }`}>
                      <UploadCloud size={14} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-200">Conteúdo Próprio (RAG)</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleModel('rag')}
                    className={`w-9 h-5 rounded-full transition-all relative ${activeModels.rag ? 'bg-rose-500' : 'bg-slate-800'}`}
                  >
                    <span className={`block w-4 h-4 rounded-full bg-white absolute top-0.5 left-0.5 transition-all ${activeModels.rag ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>
                {activeModels.rag && getActiveCount() > 1 && (
                  <div className="flex items-center gap-3 pl-8">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={percentages.rag}
                      onChange={(e) => handlePercentageChange('rag', parseInt(e.target.value) || 0)}
                      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                    />
                    <span className="text-xs font-mono font-bold text-rose-400 w-10 text-right">{percentages.rag}%</span>
                  </div>
                )}

                {activeModels.rag && (
                  <div className="pl-8 pt-2 space-y-3">
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileChange(e.dataTransfer.files); }}
                      onClick={() => document.getElementById('rag-file-input')?.click()}
                      className={`border border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${isDragging
                        ? 'border-rose-500 bg-rose-500/5'
                        : 'border-slate-800 hover:border-rose-500/50 hover:bg-slate-950/45'
                        }`}
                    >
                      <input
                        id="rag-file-input"
                        type="file"
                        multiple
                        className="hidden"
                        accept=".txt,.md,.pdf,.docx,.xlsx,.xls,.pptx,.png,.jpg,.jpeg,.webp"
                        onChange={(e) => handleFileChange(e.target.files)}
                      />
                      <UploadCloud size={24} className="mx-auto text-slate-500 mb-1" />
                      <p className="text-[11px] font-bold text-slate-300">Arraste seus arquivos aqui ou clique para buscar</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">PDF, DOCX, XLSX, PPTX, Imagens, TXT (Máx: 10MB)</p>
                    </div>

                    {ragFiles.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Arquivos ({ragFiles.length}/5)</p>
                        <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                          {ragFiles.map((file) => (
                            <div key={file.id} className="flex items-center justify-between p-2 bg-slate-950/40 border border-slate-900 rounded-lg">
                              <div className="flex items-center gap-2 overflow-hidden">
                                {getFileIcon(file.name)}
                                <div className="overflow-hidden">
                                  <p className="text-[11px] font-semibold text-slate-200 truncate">{file.name}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {file.status === 'loading' && <Loader size={12} className="animate-spin text-rose-500" />}
                                {file.status === 'success' && <CheckCircle size={12} className="text-emerald-400" />}
                                {file.status === 'error' && <span className="text-[9px] text-rose-400 truncate max-w-[80px]">{file.errorMessage}</span>}
                                <button
                                  type="button"
                                  onClick={() => setRagFiles((prev) => prev.filter((f) => f.id !== file.id))}
                                  className="p-0.5 text-slate-500 hover:text-rose-400 transition-colors"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg border transition-colors ${activeModels.exam
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      : 'bg-slate-800/50 text-slate-400 border-slate-700/50'
                      }`}>
                      <svg className="w-[14px] h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                        <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-200">Questões de Provas Oficiais</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleModel('exam')}
                    className={`w-9 h-5 rounded-full transition-all relative ${activeModels.exam ? 'bg-rose-500' : 'bg-slate-800'}`}
                  >
                    <span className={`block w-4 h-4 rounded-full bg-white absolute top-0.5 left-0.5 transition-all ${activeModels.exam ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>
                {activeModels.exam && getActiveCount() > 1 && (
                  <div className="flex items-center gap-3 pl-8">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={percentages.exam}
                      onChange={(e) => handlePercentageChange('exam', parseInt(e.target.value) || 0)}
                      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                    />
                    <span className="text-xs font-mono font-bold text-rose-400 w-10 text-right">{percentages.exam}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <Button
          type="submit"
          isLoading={isLoading}
          variant={!isTriviaMode && getActiveCount() === 0 ? 'secondary' : 'primary'}
          className={`w-full mt-4 ${!isTriviaMode && getActiveCount() === 0 ? 'opacity-40 cursor-not-allowed transform-none' : ''}`}
        >
          Iniciar Quiz
        </Button>
      </form>

      <Toast
        message={localToast.message}
        type={localToast.type}
        isVisible={localToast.isVisible}
        onClose={() => setLocalToast((prev) => ({ ...prev, isVisible: false }))}
      />
    </div>
  );
};

export default QuizSetup;
