import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import type { RagImage } from '../types/quiz.types';

// Helper para obter o MIME Type a partir da extensão
export function getMimeTypeFromExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimes: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
  };
  return mimes[ext || ''] || 'application/octet-stream';
}

// 1. Parser de Texto Plano (.txt, .md)
export async function parseTxt(file: File): Promise<string> {
  return await file.text();
}

// Helper para converter arquivo de imagem pura para base64
export function readImageAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo de imagem.'));
    reader.readAsDataURL(file);
  });
}

// 2. Parser do Word (.docx)
export async function parseDocx(file: File): Promise<{ text: string; images: RagImage[] }> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  
  let text = '';
  const images: RagImage[] = [];
  
  // Extrair texto principal
  const docXmlText = await zip.file('word/document.xml')?.async('text');
  if (docXmlText) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(docXmlText, 'application/xml');
    
    // Parágrafos no Word são w:p, textos são w:t
    const paragraphs = xmlDoc.getElementsByTagName('w:p');
    const paragraphTexts: string[] = [];
    
    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      const textRuns = p.getElementsByTagName('w:t');
      const runTexts: string[] = [];
      for (let j = 0; j < textRuns.length; j++) {
        runTexts.push(textRuns[j].textContent || '');
      }
      if (runTexts.length > 0) {
        paragraphTexts.push(runTexts.join(''));
      }
    }
    text = paragraphTexts.join('\n');
  } else {
    throw new Error('Formato DOCX inválido: arquivo word/document.xml não encontrado.');
  }
  
  // Extrair imagens embutidas
  const mediaFolder = zip.folder('word/media');
  if (mediaFolder) {
    const imageFiles: string[] = [];
    mediaFolder.forEach((relativePath) => {
      imageFiles.push(relativePath);
    });
    
    for (const relPath of imageFiles) {
      const imgFile = mediaFolder.file(relPath);
      if (imgFile) {
        const mimeType = getMimeTypeFromExtension(relPath);
        if (mimeType.startsWith('image/')) {
          const base64Data = await imgFile.async('base64');
          images.push({ mimeType, base64Data });
        }
      }
    }
  }
  
  return { text, images };
}

// 3. Parser do PowerPoint (.pptx)
export async function parsePptx(file: File): Promise<{ text: string; images: RagImage[] }> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  
  let text = '';
  const images: RagImage[] = [];
  
  // Encontrar slides em ppt/slides/slide[X].xml
  const slideFiles: { name: string; number: number }[] = [];
  zip.folder('ppt/slides')?.forEach((relativePath, fileObj) => {
    const match = relativePath.match(/^slide(\d+)\.xml$/);
    if (match) {
      slideFiles.push({ name: fileObj.name, number: parseInt(match[1], 10) });
    }
  });
  
  if (slideFiles.length === 0) {
    throw new Error('Formato PPTX inválido: slides não encontrados.');
  }
  
  slideFiles.sort((a, b) => a.number - b.number);
  const slideTexts: string[] = [];
  const parser = new DOMParser();
  
  for (const slideInfo of slideFiles) {
    const slideXmlText = await zip.file(slideInfo.name)?.async('text');
    if (slideXmlText) {
      const xmlDoc = parser.parseFromString(slideXmlText, 'application/xml');
      // Textos nos slides costumam ficar nas tags a:t
      const textNodes = xmlDoc.getElementsByTagName('a:t');
      const slideWords: string[] = [];
      for (let i = 0; i < textNodes.length; i++) {
        slideWords.push(textNodes[i].textContent || '');
      }
      slideTexts.push(`[Slide ${slideInfo.number}]\n` + slideWords.join(' '));
    }
  }
  text = slideTexts.join('\n\n');
  
  // Extrair imagens embutidas
  const mediaFolder = zip.folder('ppt/media');
  if (mediaFolder) {
    const imageFiles: string[] = [];
    mediaFolder.forEach((relativePath) => {
      imageFiles.push(relativePath);
    });
    
    for (const relPath of imageFiles) {
      const imgFile = mediaFolder.file(relPath);
      if (imgFile) {
        const mimeType = getMimeTypeFromExtension(relPath);
        if (mimeType.startsWith('image/')) {
          const base64Data = await imgFile.async('base64');
          images.push({ mimeType, base64Data });
        }
      }
    }
  }
  
  return { text, images };
}

// 4. Parser do Excel (.xlsx, .xls)
export async function parseXlsx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  
  let text = '';
  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    // Converte a aba para formato CSV
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    if (csv.trim()) {
      text += `[Aba: ${sheetName}]\n${csv}\n\n`;
    }
  });
  
  if (!text.trim()) {
    throw new Error('A planilha está vazia.');
  }
  
  return text;
}

export interface PdfJsDocument {
  numPages: number;
  getPage: (pageNumber: number) => Promise<{
    getTextContent: () => Promise<{
      items: Array<{ str: string }>;
    }>;
  }>;
}

export interface PdfJsEngine {
  GlobalWorkerOptions: {
    workerSrc: string;
  };
  getDocument: (options: { data: ArrayBuffer }) => {
    promise: Promise<PdfJsDocument>;
  };
}

export interface WindowWithPdfJs extends Window {
  pdfjsLib?: PdfJsEngine;
  'pdfjs-dist/build/pdf'?: PdfJsEngine;
}

// 5. Carregar biblioteca PDF.js de forma assíncrona
export async function loadPdfJS(): Promise<PdfJsEngine> {
  const win = window as unknown as WindowWithPdfJs;
  if (win.pdfjsLib) {
    return win.pdfjsLib;
  }
  
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      const pdfjs = win['pdfjs-dist/build/pdf'];
      if (!pdfjs) {
        reject(new Error('Falha ao inicializar o motor de PDF.'));
        return;
      }
      pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve(pdfjs);
    };
    script.onerror = () => reject(new Error('Falha ao carregar o motor de PDF do CDN.'));
    document.head.appendChild(script);
  });
}

// 6. Parser do PDF (.pdf)
export async function parsePdf(file: File, pdfjs: PdfJsEngine): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => item.str).join(' ');
    if (pageText.trim()) {
      text += `[Página ${i}]\n${pageText}\n\n`;
    }
  }
  
  if (!text.trim()) {
    throw new Error('O PDF não contém texto extraível.');
  }
  
  return text;
}
