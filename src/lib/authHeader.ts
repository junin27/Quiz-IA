import { supabase } from './supabaseClient';

/**
 * Obtém o cabeçalho Authorization com o JWT do Supabase Auth da sessão ativa.
 * Retorna objeto vazio se não houver sessão — as rotas de API rejeitarão a requisição.
 */
export async function getAuthHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
