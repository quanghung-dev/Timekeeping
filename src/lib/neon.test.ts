import { describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({
  createClient: vi.fn(() => ({ auth: {}, from: vi.fn() })),
  adapter: { kind: 'supabase-adapter' },
}));

vi.mock('@neondatabase/neon-js', () => ({
  createClient: sdk.createClient,
  SupabaseAuthAdapter: vi.fn(() => sdk.adapter),
}));

vi.mock('./neonConfig', () => ({
  getNeonConfig: () => ({
    authUrl: 'https://auth.test/neondb/auth',
    dataApiUrl: 'https://data.test/neondb/rest/v1',
  }),
}));

describe('neon', () => {
  it('creates one client with the Supabase-compatible auth adapter', async () => {
    await import('./neon');

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
