import { useState } from 'react';
import type { RagFile, RagImage } from '../types/quiz.types';
import {
  parseTxt,
  readImageAsBase64,
  parseDocx,
  parsePptx,
  parseXlsx,
  loadPdfJS,
  parsePdf,
} from '../utils/fileParser';

export function useQuizSetupFiles() {
  const [ragFiles, setRagFiles] = useState<RagFile[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const updateFileStatus = (
    id: string,
    status: 'success' | 'error',
    errorMessage?: string,
    text: string = '',
    images: RagImage[] = []
  ) => {
    setRagFiles((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, status, errorMessage, text, images } : f
      )
    );
  };

  const handleFileChange = async (files: FileList | null) => {
    if (!files) return;

    const currentCount = ragFiles.length;
    const incomingFiles = Array.from(files);

    if (currentCount + incomingFiles.length > 5) {
      alert('Você pode carregar no máximo 5 arquivos.');
      return;
    }

    const newFiles: RagFile[] = incomingFiles.map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'loading',
      text: '',
      images: [],
    }));

    setRagFiles((prev) => [...prev, ...newFiles]);

    newFiles.forEach(async (ragFile, index) => {
      const file = incomingFiles[index];

      if (file.size > 10 * 1024 * 1024) {
        updateFileStatus(ragFile.id, 'error', 'O arquivo excede o limite de 10MB.');
        return;
      }

      try {
        const ext = file.name.split('.').pop()?.toLowerCase();
        let text = '';
        let images: RagImage[] = [];

        if (ext === 'txt' || ext === 'md') {
          text = await parseTxt(file);
        } else if (['png', 'jpg', 'jpeg', 'webp'].includes(ext || '')) {
          const base64 = await readImageAsBase64(file);
          images.push({
            mimeType: file.type || `image/${ext}`,
            base64Data: base64,
          });
          text = `[Imagem Anexa: ${file.name}]`;
        } else if (ext === 'docx') {
          const parsed = await parseDocx(file);
          text = parsed.text;
          images = parsed.images;
        } else if (ext === 'pptx') {
          const parsed = await parsePptx(file);
          text = parsed.text;
          images = parsed.images;
        } else if (ext === 'xlsx' || ext === 'xls') {
          text = await parseXlsx(file);
        } else if (ext === 'pdf') {
          const pdfjs = await loadPdfJS();
          text = await parsePdf(file, pdfjs);
        } else {
          throw new Error('Formato de arquivo não suportado.');
        }

        updateFileStatus(ragFile.id, 'success', undefined, text, images);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erro ao processar arquivo.';
        updateFileStatus(ragFile.id, 'error', message);
      }
    });
  };

  return {
    ragFiles,
    isDragging,
    setRagFiles,
    setIsDragging,
    handleFileChange,
    updateFileStatus,
  };
}
