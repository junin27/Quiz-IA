import type { IncomingMessage, ServerResponse } from 'http';

const WINDOW_MS = 60 * 1000; // Janela de 1 minuto
const MAX_REQUESTS = 60; // Máximo de 60 requisições por janela por IP

interface RateLimitInfo {
  count: number;
  resetTime: number;
}

// Cache em memória para rastreamento de acessos
const cache = new Map<string, RateLimitInfo>();

/**
 * Middleware para controle de taxa (Rate Limiting) simplificado para Vercel Serverless Functions.
 * Identifica o cliente pelo IP e limita requisições excessivas.
 * Retorna true se a requisição foi bloqueada (429), caso contrário retorna false.
 */
export function handleRateLimit(req: IncomingMessage, res: ServerResponse): boolean {
  // Ignorar requisições OPTIONS prévias de CORS
  if (req.method === 'OPTIONS') {
    return false;
  }

  const ip = (req.headers['x-real-ip'] as string) || 
             (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || 
             '127.0.0.1';

  const now = Date.now();

  // Limpeza de cache passiva para evitar vazamento de memória em containers warm
  if (cache.size > 2000) {
    for (const [key, value] of cache.entries()) {
      if (now > value.resetTime) {
        cache.delete(key);
      }
    }
  }

  const info = cache.get(ip);

  if (!info) {
    cache.set(ip, {
      count: 1,
      resetTime: now + WINDOW_MS
    });
    return false;
  }

  if (now > info.resetTime) {
    info.count = 1;
    info.resetTime = now + WINDOW_MS;
    return false;
  }

  info.count++;

  if (info.count > MAX_REQUESTS) {
    res.writeHead(429, {
      'Content-Type': 'application/json',
      'Retry-After': Math.ceil((info.resetTime - now) / 1000).toString()
    });
    res.end(JSON.stringify({ 
      error: 'Muitas requisições originadas deste IP. Por favor, tente novamente mais tarde.' 
    }));
    return true;
  }

  return false;
}
