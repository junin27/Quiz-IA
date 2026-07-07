import { describe, it, expect, vi } from 'vitest';
import { 
  getMimeTypeFromExtension, 
  parseTxt, 
  parseDocx, 
  parsePptx, 
  parseXlsx, 
  parsePdf 
} from '../../utils/fileParser';
// JSZip e XLSX são mockados via vi.mock

// Mock do JSZip
vi.mock('jszip', () => {
  const mockFileContent = '<w:p><w:t>Texto de Teste do Word</w:t></w:p>';
  const mockSlideContent = '<a:t>Texto do Slide</a:t>';
  
  return {
    default: {
      loadAsync: vi.fn().mockResolvedValue({
        file: vi.fn().mockImplementation((path) => {
          if (path === 'word/document.xml') {
            return { async: vi.fn().mockResolvedValue(mockFileContent) };
          }
          if (path.includes('slide')) {
            return { async: vi.fn().mockResolvedValue(mockSlideContent) };
          }
          return null;
        }),
        folder: vi.fn().mockImplementation((path) => {
          if (path === 'word/media' || path === 'ppt/media') {
            return {
              forEach: vi.fn((callback) => {
                callback('image1.png', { name: 'image1.png' });
              }),
              file: vi.fn().mockReturnValue({
                async: vi.fn().mockResolvedValue('base64DataString')
              })
            };
          }
          if (path === 'ppt/slides') {
            return {
              forEach: vi.fn((callback) => {
                callback('slide1.xml', { name: 'ppt/slides/slide1.xml' });
              })
            };
          }
          return null;
        })
      })
    }
  };
});

// Mock do XLSX
vi.mock('xlsx', () => {
  return {
    read: vi.fn().mockReturnValue({
      SheetNames: ['SheetTest'],
      Sheets: {
        SheetTest: {}
      }
    }),
    utils: {
      sheet_to_csv: vi.fn().mockReturnValue('A1,B1\nVal1,Val2')
    }
  };
});

describe('fileParser utils', () => {
  describe('getMimeTypeFromExtension', () => {
    it('retorna os mime-types corretos para extensões comuns', () => {
      expect(getMimeTypeFromExtension('test.pdf')).toBe('application/pdf');
      expect(getMimeTypeFromExtension('image.png')).toBe('image/png');
      expect(getMimeTypeFromExtension('doc.docx')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(getMimeTypeFromExtension('sheet.xlsx')).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(getMimeTypeFromExtension('unknown.abc')).toBe('application/octet-stream');
    });
  });

  describe('parseTxt', () => {
    it('lê conteúdo de arquivo de texto', async () => {
      const file = new File(['conteudo de texto'], 'test.txt', { type: 'text/plain' });
      const result = await parseTxt(file);
      expect(result).toBe('conteudo de texto');
    });
  });

  describe('parseDocx', () => {
    it('extrai texto e imagens do arquivo .docx mockado', async () => {
      const file = new File([new ArrayBuffer(100)], 'test.docx');
      
      // Cria mock global de DOMParser para o ambiente de testes node do vitest
      const originalDOMParser = (globalThis as any).DOMParser;
      (globalThis as any).DOMParser = class {
        parseFromString() {
          return {
            getElementsByTagName: (name: string) => {
              if (name === 'w:p') {
                return [{
                  getElementsByTagName: (subName: string) => {
                    if (subName === 'w:t') {
                      return [{ textContent: 'Texto de Teste do Word' }];
                    }
                    return [];
                  }
                }];
              }
              return [];
            }
          } as any;
        }
      } as any;

      const result = await parseDocx(file);
      expect(result.text).toContain('Texto de Teste do Word');
      expect(result.images).toHaveLength(1);
      expect(result.images[0].mimeType).toBe('image/png');
      expect(result.images[0].base64Data).toBe('base64DataString');

      (globalThis as any).DOMParser = originalDOMParser;
    });
  });

  describe('parsePptx', () => {
    it('extrai slides e imagens do arquivo .pptx mockado', async () => {
      const file = new File([new ArrayBuffer(100)], 'test.pptx');
      
      const originalDOMParser = (globalThis as any).DOMParser;
      (globalThis as any).DOMParser = class {
        parseFromString() {
          return {
            getElementsByTagName: (name: string) => {
              if (name === 'a:t') {
                return [{ textContent: 'Texto do Slide' }];
              }
              return [];
            }
          } as any;
        }
      } as any;

      const result = await parsePptx(file);
      expect(result.text).toContain('[Slide 1]');
      expect(result.text).toContain('Texto do Slide');
      expect(result.images).toHaveLength(1);
      expect(result.images[0].mimeType).toBe('image/png');

      (globalThis as any).DOMParser = originalDOMParser;
    });
  });

  describe('parseXlsx', () => {
    it('converte planilha Excel mockada para CSV', async () => {
      const file = new File([new ArrayBuffer(100)], 'test.xlsx');
      const result = await parseXlsx(file);
      expect(result).toContain('[Aba: SheetTest]');
      expect(result).toContain('A1,B1\nVal1,Val2');
    });
  });

  describe('parsePdf', () => {
    it('extrai texto de páginas PDF usando o mock do motor PDFJS', async () => {
      const file = new File([new ArrayBuffer(100)], 'test.pdf');
      
      const mockPdfJs = {
        GlobalWorkerOptions: {
          workerSrc: ''
        },
        getDocument: vi.fn().mockReturnValue({
          promise: Promise.resolve({
            numPages: 2,
            getPage: vi.fn().mockResolvedValue({
              getTextContent: vi.fn().mockResolvedValue({
                items: [
                  { str: 'Texto da Página' }
                ]
              })
            })
          })
        })
      };

      const result = await parsePdf(file, mockPdfJs);
      expect(result).toContain('[Página 1]');
      expect(result).toContain('[Página 2]');
      expect(result).toContain('Texto da Página');
    });
  });
});
