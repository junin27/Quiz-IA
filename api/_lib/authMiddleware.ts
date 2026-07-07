import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

// Inicializa um cliente Supabase específico para validação de tokens
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Valida o token JWT contido no cabeçalho Authorization e retorna o ID do usuário autenticado.
 * Lança um erro se o token for inválido, ausente ou expirado.
 */
export async function validateToken(authHeader: string | undefined): Promise<string> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Acesso negado: Cabeçalho de autorização inválido ou ausente.');
  }

  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new Error('Sessão inválida ou expirada.');
  }

  return user.id;
}
