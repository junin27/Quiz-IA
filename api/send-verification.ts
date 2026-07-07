import type { IncomingMessage, ServerResponse } from 'http';
import { handleCors } from './_lib/corsMiddleware';
import { handleRateLimit } from './_lib/rateLimitMiddleware';

interface VercelRequest extends IncomingMessage {
  body: any;
  query: any;
  cookies: any;
}

interface VercelResponse extends ServerResponse {
  send: (body: any) => VercelResponse;
  json: (jsonBody: any) => VercelResponse;
  status: (statusCode: number) => VercelResponse;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (handleRateLimit(req, res)) return;

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const { email, name, verificationLink } = req.body || {};

  if (!email || !name || !verificationLink) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Faltando parâmetros obrigatórios (email, name, verificationLink)' }));
    return;
  }

  // Prevenção de Phishing/Link Injection: O link de verificação deve pertencer ao mesmo host da requisição
  const reqHost = req.headers.host || '';
  const isLocalhost = reqHost.includes('localhost') || reqHost.includes('127.0.0.1');
  
  try {
    const parsedLink = new URL(verificationLink);
    const isAllowedHost = parsedLink.host === reqHost || (isLocalhost && parsedLink.hostname === 'localhost');
    
    if (!isAllowedHost) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Link de verificação não autorizado: domínio de destino inválido.' }));
      return;
    }
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Link de verificação malformado.' }));
    return;
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'RESEND_API_KEY não configurada no servidor Vercel' }));
    return;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Quiz Inteligente <onboarding@resend.dev>',
        to: [email],
        subject: 'Confirme seu e-mail - Quiz Inteligente ❓',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: sans-serif; background-color: #0c0c0e; color: #f1f5f9; padding: 20px; }
              .card { background-color: #141416; border: 1px solid #27272a; border-radius: 12px; padding: 24px; max-width: 480px; margin: 0 auto; }
              .title { font-size: 20px; font-weight: bold; color: #ffffff; margin-bottom: 12px; }
              .text { color: #a1a1aa; font-size: 14px; line-height: 1.5; margin-bottom: 20px; }
              .btn { display: inline-block; background-color: #e11d48; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; font-size: 14px; }
              .footer { margin-top: 24px; font-size: 11px; color: #71717a; text-align: center; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="title">❓ Verifique seu e-mail</div>
              <div class="text">Olá, <strong>${name}</strong>!<br><br>Obrigado por se cadastrar no Quiz Inteligente. Para ativar sua conta e começar a jogar, por favor clique no botão abaixo:</div>
              <a href="${verificationLink}" class="btn">Verificar E-mail</a>
              <div class="text" style="margin-top: 20px; font-size: 12px;">Se o botão não funcionar, copie e cole o seguinte link no seu navegador:<br><a href="${verificationLink}" style="color: #fda4af;">${verificationLink}</a></div>
              <div class="footer">Esta é uma simulação de envio real de e-mail usando Resend no Vercel.</div>
            </div>
          </body>
          </html>
        `
      })
    });

    const data = await response.json();
    if (!response.ok) {
      res.writeHead(response.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: data.message || 'Erro na API do Resend' }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, id: data.id }));
  } catch (error: any) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message || 'Erro interno do servidor backend' }));
  }
}
