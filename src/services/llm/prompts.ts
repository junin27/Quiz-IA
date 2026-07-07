import { DIFFICULTY_LABELS } from './constants';

/**
 * Converte o nível de dificuldade em formato de texto amigável.
 */
export function buildDifficultyDescription(difficulty: string): string {
  const numericDiff = parseInt(difficulty, 10);
  if (isNaN(numericDiff)) return difficulty;
  const label = DIFFICULTY_LABELS[numericDiff] ?? 'Médio';
  return `${numericDiff}/10 (${label})`;
}

/**
 * Cria o prompt para geração de questões de quiz de tema livre.
 */
export function buildQuizPrompt(
  topic: string,
  difficultyDescription: string,
  count: number,
  popularExamOnly: boolean = false
): string {
  if (popularExamOnly) {
    const examQuestionsCount = Math.ceil(count / 2);
    const standardQuestionsCount = count - examQuestionsCount;

    return `Gere exatamente ${count} perguntas de quiz exclusivas sobre o tópico "${topic}" com dificuldade "${difficultyDescription}".
Como a opção de Questões Populares de Provas está ATIVADA, você deve seguir estritamente as regras de divisão abaixo:
1. Exatamente ${examQuestionsCount} perguntas devem ser questões muito frequentes/populares que costumam cair em provas reais, exames oficiais (como vestibulares, ENEM, concursos públicos ou certificações conhecidas) sobre o tema "${topic}". Para essas perguntas, você DEVE definir obrigatoriamente a propriedade "isPopularExam": true no objeto JSON.
2. Exatamente ${standardQuestionsCount} perguntas devem ser perguntas normais baseadas em informações relevantes e fatos interessantes sobre o tema "${topic}". Para essas perguntas, você DEVE definir obrigatoriamente a propriedade "isPopularExam": false no objeto JSON.

Misture as perguntas geradas de forma natural.
Cada pergunta deve conter 4 alternativas e apenas uma resposta correta.
Retorne APENAS um array JSON válido (sem markdown, sem blocos de código \`\`\`, sem texto adicional) no seguinte formato estruturado:
[
  {
    "id": "string-id-unico",
    "questionText": "Texto da pergunta aqui",
    "options": ["Opção A", "Opção B", "Opção C", "Opção D"],
    "correctOptionIndex": 0,
    "explanation": "Explicação curta do porquê ser a alternativa correta",
    "isPopularExam": true
  }
]`;
  }

  return `Gere exatamente ${count} perguntas de quiz exclusivas sobre o tópico "${topic}" com dificuldade "${difficultyDescription}".
Cada pergunta deve conter 4 alternativas e apenas uma resposta correta.
Retorne APENAS um array JSON válido (sem markdown, sem blocos de código \`\`\`, sem texto adicional) no seguinte formato estruturado:
[
  {
    "id": "string-id-unico",
    "questionText": "Texto da pergunta aqui",
    "options": ["Opção A", "Opção B", "Opção C", "Opção D"],
    "correctOptionIndex": 0,
    "explanation": "Explicação curta do porquê ser a alternativa correta"
  }
]`;
}

/**
 * Cria o prompt para geração de questões baseadas em material de estudo (RAG).
 */
export function buildQuizPromptWithContent(
  topic: string,
  difficultyDescription: string,
  count: number,
  content: string,
  popularExamOnly: boolean = false
): string {
  const topicFocus = topic.trim()
    ? `Foque especialmente no seguinte tema ou aspectos específicos: "${topic}".`
    : `Gere perguntas gerais abrangendo de forma equilibrada todo o conteúdo do material fornecido.`;

  if (popularExamOnly) {
    const examQuestionsCount = Math.ceil(count / 2);
    const standardQuestionsCount = count - examQuestionsCount;

    return `Você é um gerador de quiz profissional e bem treinado. Sua tarefa é ler o material de estudo (texto e imagens extraídas) fornecido abaixo e gerar exatamente ${count} perguntas de quiz exclusivas e de altíssima qualidade baseadas estritamente nas informações contidas neste material.

Dificuldade das questões: "${difficultyDescription}".
${topicFocus}

Como a opção de Questões Populares de Provas está ATIVADA, siga estritamente a divisão de tipos abaixo:
1. Exatamente ${examQuestionsCount} perguntas devem focar em conceitos fundamentais do material que são recorrentemente cobrados em exames oficiais (como ENEM, vestibulares, concursos públicos ou certificações). Para essas perguntas, defina "isPopularExam": true no JSON.
2. Exatamente ${standardQuestionsCount} perguntas devem cobrir fatos e detalhes interessantes do material fornecido de forma direta. Para essas perguntas, defina "isPopularExam": false no JSON.

REGRAS DE CONTEXTO E FATO (RAG PROFISSIONAL):
- Suas perguntas devem ser baseadas APENAS em informações explicitamente contidas no material de contexto abaixo. Não invente ou presuma nada fora do texto.
- Se houver imagens anexas na mensagem, analise-as como parte do material (gráficos, esquemas, tabelas e diagramas).
- Cada pergunta deve conter exatamente 4 alternativas e apenas uma resposta correta.
- A explicação deve referenciar diretamente trechos ou ideias do texto para provar o motivo de aquela alternativa ser a correta.

CONTEÚDO DO MATERIAL DE ESTUDO (CONTEXTO):
"""
${content}
"""

Retorne APENAS um array JSON válido (sem markdown, sem blocos de código \`\`\`, sem texto adicional) no seguinte formato estruturado:
[
  {
    "id": "string-id-unico",
    "questionText": "Texto da pergunta aqui",
    "options": ["Opção A", "Opção B", "Opção C", "Opção D"],
    "correctOptionIndex": 0,
    "explanation": "Explicação detalhada referenciando o material de estudo",
    "isPopularExam": true
  }
]`;
  }

  return `Você é um gerador de quiz profissional e bem treinado. Sua tarefa é ler o material de estudo (texto e imagens extraídas) fornecido abaixo e gerar exatamente ${count} perguntas de quiz exclusivas e de altíssima qualidade baseadas estritamente nas informações contidas neste material.

Dificuldade das questões: "${difficultyDescription}".
${topicFocus}

REGRAS DE CONTEXTO E FATO (RAG PROFISSIONAL):
- Suas perguntas devem ser baseadas APENAS em informações explicitamente contidas no material de contexto abaixo. Não invente ou presuma nada fora do texto.
- Se houver imagens anexas na mensagem, analise-as como parte do material (gráficos, esquemas, tabelas e diagramas).
- Cada pergunta deve conter exatamente 4 alternativas e apenas uma resposta correta.
- A explicação deve referenciar diretamente trechos ou ideias do texto para provar o motivo de aquela alternativa ser a correta.

CONTEÚDO DO MATERIAL DE ESTUDO (CONTEXTO):
"""
${content}
"""

Retorne APENAS um array JSON válido (sem markdown, sem blocos de código \`\`\`, sem texto adicional) no seguinte formato estruturado:
[
  {
    "id": "string-id-unico",
    "questionText": "Texto da pergunta aqui",
    "options": ["Opção A", "Opção B", "Opção C", "Opção D"],
    "correctOptionIndex": 0,
    "explanation": "Explicação detalhada referenciando o material de estudo"
  }
]`;
}

/**
 * Cria o prompt híbrido (Blend) com divisão proporcional de questões por fonte.
 */
export function buildBlendedQuizPrompt(
  topic: string,
  difficultyDescription: string,
  count: number,
  counts: { ia: number; rag: number; exam: number },
  ragDataContent?: string
): string {
  const instructions: string[] = [];

  if (counts.ia > 0) {
    instructions.push(
      `- exatamente ${counts.ia} pergunta(s) baseada(s) em conhecimentos gerais, fatos interessantes e explicações completas sobre o tema "${topic}". Para estas perguntas, defina "isPopularExam": false no JSON.`
    );
  }
  if (counts.rag > 0 && ragDataContent) {
    instructions.push(
      `- exatamente ${counts.rag} pergunta(s) baseada(s) estritamente nas informações contidas no "CONTEÚDO DO MATERIAL DE ESTUDO (CONTEXTO)" fornecido abaixo. Não use conhecimentos externos para estas. Para estas perguntas, defina "isPopularExam": false no JSON.`
    );
  }
  if (counts.exam > 0) {
    instructions.push(
      `- exatamente ${counts.exam} pergunta(s) baseada(s) em questões recorrentes de exames oficiais (como ENEM, vestibulares, concursos públicos ou certificações) sobre o tema "${topic}". Para essas perguntas, defina obrigatoriamente a propriedade "isPopularExam": true no objeto JSON.`
    );
  }

  const contextSection =
    counts.rag > 0 && ragDataContent
      ? `\nCONTEÚDO DO MATERIAL DE ESTUDO (CONTEXTO):\n"""\n${ragDataContent}\n"""\n`
      : '';

  return `Você é um gerador de quiz profissional. Sua tarefa é gerar exatamente ${count} perguntas de quiz exclusivas e de altíssima qualidade com nível de dificuldade "${difficultyDescription}".

Você deve seguir rigorosamente a seguinte distribuição de fontes para as perguntas (o total deve somar exatamente ${count}):
${instructions.join('\n')}
${contextSection}
Regras adicionais importantes:
1. Misture as perguntas geradas de forma natural.
2. Cada pergunta deve conter exatamente 4 alternativas e apenas uma resposta correta.
3. Certifique-se de que a propriedade "isPopularExam" esteja definida corretamente para cada pergunta: true para as de exames oficiais, false para as outras.
4. Retorne APENAS um array JSON válido (sem markdown, sem blocos de código \`\`\`, sem texto adicional) no seguinte formato:
[
  {
    "id": "string-id-unico",
    "questionText": "Texto da pergunta aqui",
    "options": ["Opção A", "Opção B", "Opção C", "Opção D"],
    "correctOptionIndex": 0,
    "explanation": "Explicação detalhada do porquê ser a alternativa correta",
    "isPopularExam": true/false
  }
]`;
}
