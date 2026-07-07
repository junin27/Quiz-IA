import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { PREDEFINED_DEMO_QUESTIONS } from './demoQuestions';
import { Dna, BookOpen, Cpu, Zap, Users, TrendingUp } from 'lucide-react';

export const MarketingHeader: React.FC = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-4xl lg:text-5xl font-black text-white leading-none tracking-tight">
        DESAFIE SUA MENTE COM <span className="bg-gradient-to-r from-rose-500 via-red-500 to-orange-400 bg-clip-text text-transparent">INTELIGÊNCIA ARTIFICIAL</span>
      </h2>
      <p className="text-slate-300 text-sm lg:text-base leading-relaxed max-w-2xl font-medium">
        A primeira plataforma de estudo interativo que gera perguntas dinâmicas e personalizadas em segundos sobre qualquer assunto do universo.
      </p>
    </div>
  );
};

export const MarketingStats: React.FC = () => {
  const cards = [
    {
      icon: <Dna size={20} />,
      title: "Geração Híbrida (Blend Mode)",
      subtitle: "Quizzes sob medida",
      description: "Defina a proporção perfeita para o seu quiz: mescle conhecimentos gerais gerados por IA, questões de concursos/provas oficiais e o conteúdo do seu próprio material de estudo.",
    },
    {
      icon: <BookOpen size={20} />,
      title: "RAG Avançado (Material de Estudo)",
      subtitle: "Estudos sem alucinação",
      description: "Faça o upload de textos e imagens didáticas como pdf, word, markdown, excel, entre outros. Nossa engine de RAG gera perguntas baseadas estritamente no seu contexto para evitar respostas incorretas e garantir foco total no conteúdo desejado.",
    },
    {
      icon: <Cpu size={20} />,
      title: "Conexão Multi-LLM",
      subtitle: "Use a IA da sua escolha",
      description: "Insira a sua API key com total segurança e escolha o modelo ideal para rodar seu gerador: de GPT-4o e Gemini 2.5 Pro a Claude 3.7 e DeepSeek R1 (puro raciocínio lógico), entre outros modelos de LLM.",
    },
    {
      icon: <Zap size={20} />,
      title: "Resiliência com 9 APIs de Trivia",
      subtitle: "Banco infinito de perguntas",
      description: "Acesso a um ecossistema consolidado de 9 provedores gratuitos integrados em paralelo. Se uma API cair, o algoritmo realiza um fallback silencioso instantâneo para outra fonte ativa.",
    },
    {
      icon: <Users size={20} />,
      title: "Salas MultiJogadores em Tempo Real",
      subtitle: "Compita em tempo real",
      description: "Crie salas exclusivas para até 50 pessoas. Ideal para professores que querem gamificar a sala de aula ou para competições rápidas entre amigos.",
    },
    {
      icon: <TrendingUp size={20} />,
      title: "Análise Estatística Avançada",
      subtitle: "Performance detalhada",
      description: "Acompanhe métricas detalhadas de tempo médio de resposta por pergunta, maior sequência de acertos e taxas de erro cumulativas da sala inteira em um dashboard analítico nativo.",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className="glass-card p-5 rounded-2xl border border-slate-800/80 bg-slate-950/40 relative overflow-hidden transition-all duration-300 hover:border-rose-500/30 hover:scale-[1.02] hover:bg-slate-950/60 group"
        >
          {/* Efeito de brilho gradiente suave em hover */}
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-rose-500/10 transition-all duration-300" />

          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-rose-500/10 text-rose-450 border border-rose-500/20 rounded-xl shrink-0 group-hover:bg-rose-500/25 group-hover:text-rose-400 transition-all duration-300">
              {card.icon}
            </div>
            <div className="space-y-1">
              <span className="block text-[9px] text-rose-400 font-extrabold uppercase tracking-wider">{card.subtitle}</span>
              <h4 className="text-sm font-bold text-white group-hover:text-rose-350 transition-colors">{card.title}</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-medium pt-1.5">{card.description}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const MarketingDemo: React.FC = () => {
  const [demoQuestionIndex, setDemoQuestionIndex] = useState<number>(0);
  const [demoSelectedAnswer, setDemoSelectedAnswer] = useState<number | null>(null);
  const [demoSubmitted, setDemoSubmitted] = useState<boolean>(false);

  const activeQuestion = PREDEFINED_DEMO_QUESTIONS[demoQuestionIndex];

  const handleSelectTopic = (idx: number) => {
    setDemoQuestionIndex(idx);
    setDemoSelectedAnswer(null);
    setDemoSubmitted(false);
  };

  const handleAnswerOption = (idx: number, isCorrect: boolean) => {
    setDemoSelectedAnswer(idx);
    setDemoSubmitted(true);
    if (isCorrect) {
      try {
        const fireConfetti = confetti || (window as any).confetti;
        if (fireConfetti) {
          fireConfetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
        }
      } catch (err) {
        console.error('Erro ao disparar confetes na demo:', err);
      }
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div className="pt-1">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
          Selecione um tema para testar o simulador:
        </p>
      </div>

      {/* Pool de Temas */}
      <div className="flex flex-wrap gap-2 max-w-lg">
        {PREDEFINED_DEMO_QUESTIONS.map((q, idx) => {
          const isActive = demoQuestionIndex === idx;
          return (
            <button
              key={q.topic}
              onClick={() => handleSelectTopic(idx)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all duration-300 group cursor-pointer ${isActive
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 scale-105 shadow-md shadow-rose-500/5'
                : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
            >
              {q.icon()}
              <span>{q.topic}</span>
            </button>
          );
        })}
      </div>

      {/* Mockup Interativo Real e Jogável */}
      <div className="relative max-w-md w-full bg-slate-950/80 border border-slate-850 rounded-2xl p-5 shadow-2xl transform lg:-rotate-2 hover:rotate-0 transition-transform duration-500 overflow-hidden group animate-fade-in mx-auto lg:mx-0">
        {/* Brilho de Decoração */}
        <div className="absolute -right-20 -top-20 w-40 h-40 bg-rose-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-rose-500/20 transition-all duration-500" />

        <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 uppercase tracking-widest border-b border-slate-900 pb-2.5 mb-3.5">
          <span>TÓPICO: {activeQuestion.topic}</span>
          <span className="text-rose-400 font-bold">Dificuldade: {activeQuestion.difficulty}/10</span>
        </div>

        <p className="text-sm font-bold text-slate-200 leading-snug mb-4">
          {activeQuestion.questionText}
        </p>

        <div className="space-y-2">
          {activeQuestion.options.map((option, idx) => {
            const isSelected = demoSelectedAnswer === idx;
            const isCorrectOption = activeQuestion.correctOptionIndex === idx;

            let optionStyle = 'border-slate-800 bg-slate-900/40 text-slate-300 hover:border-rose-500/35 hover:bg-rose-500/5 cursor-pointer';
            if (demoSubmitted) {
              if (isCorrectOption) {
                optionStyle = 'border-emerald-500 bg-emerald-500/10 text-emerald-300 shadow-inner';
              } else if (isSelected) {
                optionStyle = 'border-rose-500 bg-rose-500/10 text-rose-300 shadow-inner';
              } else {
                optionStyle = 'border-slate-900 bg-slate-950/20 text-slate-600 opacity-50';
              }
            }

            return (
              <button
                key={idx}
                disabled={demoSubmitted}
                onClick={() => handleAnswerOption(idx, isCorrectOption)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left text-xs font-bold transition-all duration-200 ${optionStyle}`}
              >
                <span className={`w-5 h-5 flex items-center justify-center rounded font-mono text-[9px] font-black ${demoSubmitted && isCorrectOption ? 'bg-emerald-500 text-white' :
                  demoSubmitted && isSelected ? 'bg-rose-500 text-white' :
                    'bg-slate-900 text-slate-500'
                  }`}>
                  {['A', 'B', 'C'][idx]}
                </span>
                <span>{option}</span>
              </button>
            );
          })}
        </div>

        {/* Explicação e Feedback */}
        {demoSubmitted && (
          <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-900 space-y-1.5 mt-4 animate-fade-in text-[11px] leading-relaxed">
            <div className="flex items-center gap-1.5">
              {demoSelectedAnswer === activeQuestion.correctOptionIndex ? (
                <span className="text-emerald-400 font-black uppercase text-[10px] tracking-wider">✓ Resposta Correta</span>
              ) : (
                <span className="text-rose-400 font-black uppercase text-[10px] tracking-wider">✗ Resposta Incorreta</span>
              )}
            </div>
            <p className="text-slate-400">
              {activeQuestion.explanation}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
