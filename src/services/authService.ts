import { supabase } from '../lib/supabaseClient';
import { CONFIG } from '../config';
import { encryptApiKey } from '../utils/encryption';
import type { User } from '../types/user.types';
import type { ApiKeyInfo } from '../types/apiKey.types';
import type { RegisterInput, LoginInput } from '../utils/validation';
import { verifyAccessToken } from '../utils/token';
import { sessionStore } from './sessionStore';

interface SupabaseAuthUpdate {
  email?: string;
  password?: string;
}

interface ProfileUpdate {
  name?: string;
  api_key?: ApiKeyInfo | null;
}

export class AuthService {
  /** Registra um novo usuário no Supabase Auth */
  async register(input: RegisterInput): Promise<{ success: boolean; message: string; userId: string }> {
    const { data, error } = await supabase.auth.signUp({
      email: input.email.toLowerCase().trim(),
      password: input.password,
      options: {
        data: {
          name: input.name,
        },
      },
    });

    if (error || !data.user) {
      throw new Error(error?.message || 'Falha no cadastro com as informações fornecidas.');
    }

    return {
      success: true,
      message: 'Verifique seu email para ativar a conta',
      userId: data.user.id,
    };
  }

  /** Realiza o login utilizando o Supabase Auth */
  async login(input: LoginInput): Promise<{
    success: boolean;
    token: string;
    user: { id: string; email: string; name: string; emailVerified: boolean };
  }> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email.toLowerCase().trim(),
      password: input.password,
    });

    if (error || !data.user || !data.session) {
      throw new Error(error?.message || 'Email ou senha inválidos.');
    }

    // Obter dados do perfil complementar
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', data.user.id)
      .single();

    return {
      success: true,
      token: data.session.access_token,
      user: {
        id: data.user.id,
        email: data.user.email || '',
        name: profile?.name || data.user.user_metadata?.name || 'Participante',
        emailVerified: !!data.user.email_confirmed_at,
      },
    };
  }

  /** Faz o logout no Supabase Auth */
  async logout(): Promise<void> {
    await supabase.auth.signOut();
  }

  /** Reenvia o e-mail de verificação */
  async sendVerificationEmail(_userId: string, email: string): Promise<boolean> {
    // No Supabase, podemos usar a função de reenvio de OTP/link do próprio Auth
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });

    if (error) {
      console.warn('Erro ao reenviar e-mail de verificação:', error.message);
      return false;
    }
    return true;
  }

  /** Login especial para o modo de simulação / feira */
  async loginFair(name?: string, email?: string): Promise<{
    success: boolean;
    token: string;
    user: { id: string; email: string; name: string; emailVerified: boolean };
  }> {
    const finalName = name?.trim() || 'Jogador não informado';
    const finalEmail = email?.trim().toLowerCase() || `guest_${Math.random().toString(36).substring(2, 9)}@feira.local`;
    const dummyPassword = 'FairModePassword123!';

    // Tentar fazer login. Se falhar por não existir, cria o usuário.
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: finalEmail,
        password: dummyPassword,
      });

      if (error || !data.user || !data.session) {
        throw new Error('Usuário inexistente');
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', data.user.id)
        .single();

      return {
        success: true,
        token: data.session.access_token,
        user: {
          id: data.user.id,
          email: data.user.email || '',
          name: profile?.name || finalName,
          emailVerified: true,
        },
      };
    } catch {
      // Criar usuário Fair
      const { data, error } = await supabase.auth.signUp({
        email: finalEmail,
        password: dummyPassword,
        options: {
          data: {
            name: finalName,
          },
        },
      });

      if (error || !data.user || !data.session) {
        throw new Error(`Falha ao criar usuário convidado: ${error?.message}`);
      }

      // Adicionar chave de API padrão se houver
      if (CONFIG.DEFAULT_API_KEY) {
        const encryptedKey = await encryptApiKey(CONFIG.DEFAULT_API_KEY, dummyPassword);

        await supabase
          .from('profiles')
          .update({
            api_key: {
              provider: 'gemini',
              encryptedKey,
              lastFourChars: CONFIG.DEFAULT_API_KEY.slice(-4),
              createdAt: new Date().toISOString(),
              lastUsedAt: new Date().toISOString(),
              isActive: true,
            },
          })
          .eq('id', data.user.id);
      }

      return {
        success: true,
        token: data.session.access_token,
        user: {
          id: data.user.id,
          email: data.user.email || '',
          name: finalName,
          emailVerified: true,
        },
      };
    }
  }

  /** Atualiza o perfil do usuário (nome, e-mail, senha, chave de API) */
  async updateProfile(
    userId: string,
    currentPasswordText: string,
    input: { name?: string; email?: string; password?: string; apiKey?: ApiKeyInfo | null }
  ): Promise<User> {
    // 1. Validar a senha atual antes de permitir alterações sensíveis (Supabase requer reautenticação)
    const { data: userSession } = await supabase.auth.getSession();
    const userEmail = userSession.session?.user.email;

    if (userEmail && (input.email || input.password)) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: currentPasswordText,
      });

      if (signInError) {
        throw new Error('Senha atual incorreta.');
      }
    }

    // 2. Atualizar dados no Supabase Auth se necessário
    if (input.email || input.password) {
      const updateData: SupabaseAuthUpdate = {};
      if (input.email) updateData.email = input.email.toLowerCase().trim();
      if (input.password) updateData.password = input.password;

      const { error: authUpdateError } = await supabase.auth.updateUser(updateData);
      if (authUpdateError) {
        throw new Error(`Erro ao atualizar credenciais: ${authUpdateError.message}`);
      }
    }

    // 3. Atualizar dados na tabela profiles
    const profileUpdate: ProfileUpdate = {};
    if (input.name) profileUpdate.name = input.name.trim();
    if (input.apiKey !== undefined) profileUpdate.api_key = input.apiKey;

    if (Object.keys(profileUpdate).length > 0) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('id', userId);

      if (profileError) {
        throw new Error(`Erro ao atualizar perfil público: ${profileError.message}`);
      }
    }

    // 4. Retornar usuário atualizado
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // Obtém o e-mail atualizado se ele foi alterado, senão usa o antigo
    const finalEmail = input.email ? input.email.toLowerCase().trim() : (userEmail || '');

    return {
      id: userId,
      email: finalEmail,
      passwordHash: '', // Não expomos hashes de senha com Supabase
      name: profile?.name || 'Participante',
      emailVerified: true,
      apiKey: profile?.api_key || undefined,
      createdAt: profile?.created_at || new Date().toISOString(),
    };
  }

  /** Valida o token de verificação e marca o e-mail como verificado */
  async verifyEmail(token: string): Promise<boolean> {
    try {
      const payload = await verifyAccessToken(token);
      if (!payload || !payload.userId) {
        return false;
      }
      const localUser = sessionStore.getUser(payload.userId);
      if (localUser) {
        localUser.emailVerified = true;
        sessionStore.saveUser(localUser);
      }
      return true;
    } catch (err) {
      console.error('Erro na verificação de e-mail:', err);
      return false;
    }
  }

  /** Retorna as informações do usuário atualmente logado */
  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error || !profile) return null;

    return {
      id: user.id,
      email: user.email || '',
      passwordHash: '',
      name: profile.name,
      emailVerified: !!user.email_confirmed_at,
      apiKey: profile.api_key || undefined,
      createdAt: profile.created_at,
    };
  }
}

export const authService = new AuthService();
