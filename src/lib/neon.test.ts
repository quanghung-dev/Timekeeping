import { describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({
  createClient: vi.fn(() => ({ auth: {}, from: vi.fn() })),
  adapter: { kind: 'supabase-adapter' },
  getConfig: vi.fn(() => ({
    authUrl: 'https://auth.test/neondb/auth',
    dataApiUrl: 'https://data.test/neondb/rest/v1',
  })),
}));

vi.mock('@neondatabase/neon-js', () => ({
  createClient: sdk.createClient,
  SupabaseAuthAdapter: vi.fn(() => sdk.adapter),
}));

vi.mock('./neonConfig', () => ({
  getNeonConfig: sdk.getConfig,
}));

describe('neon', () => {
  it('defers configuration and creates one client on demand', async () => {
    const module = await import('./neon');

    expect(sdk.getConfig).not.toHaveBeenCalled();
    const first = module.getNeonClient();
    const second = module.getNeonClient();

    expect(first).toBe(second);
    expect(sdk.getConfig).toHaveBeenCalledOnce();
    expect(sdk.createClient).toHaveBeenCalledTimes(1);
    expect(sdk.createClient).toHaveBeenCalledWith({
      auth: {
        adapter: sdk.adapter,
        url: 'https://auth.test/neondb/auth',
      },
      dataApi: { url: 'https://data.test/neondb/rest/v1' },
    });
  });
});
