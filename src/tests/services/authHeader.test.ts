import { describe, it, expect, vi, afterEach } from 'vitest';
import { getAuthHeader } from '../../lib/authHeader';

// Mock do supabaseClient — nunca acessa rede real em testes
vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

import { supabase } from '../../lib/supabaseClient';

const mockGetSession = supabase.auth.getSession as ReturnType<typeof vi.fn>;

afterEach(() => {
  mockGetSession.mockReset();
});

describe('getAuthHeader', () => {
  it('retorna cabeçalho Authorization com Bearer token quando sessão existe', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'token-abc-123' } },
    });

    const headers = await getAuthHeader();

    expect(headers).toEqual({ Authorization: 'Bearer token-abc-123' });
  });

  it('retorna objeto vazio quando não há sessão ativa', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const headers = await getAuthHeader();

    expect(headers).toEqual({});
  });

  it('retorna objeto vazio quando session.access_token é undefined', async () => {
    mockGetSession.mockResolvedValue({ data: { session: {} } });

    const headers = await getAuthHeader();

    expect(headers).toEqual({});
  });
});
