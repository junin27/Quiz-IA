import type { IncomingMessage, ServerResponse } from 'http';

/**
 * Configura os cabeçalhos de CORS e responde antecipadamente a requisições do tipo OPTIONS.
 * Retorna true se a requisição foi finalizada (OPTIONS), caso contrário retorna false.
 */
export function handleCors(req: IncomingMessage, res: ServerResponse): boolean {
  const origin = req.headers.origin || '';
  
  // Obter origens permitidas estritamente da variável de ambiente
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : [];

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return true;
  }
  
  return false;
}
