import { createClient, SupabaseAuthAdapter } from '@neondatabase/neon-js';
import type { Database } from './database.types';
import { getNeonConfig } from './neonConfig';

function createNeonClient() {
  const config = getNeonConfig();
  return createClient<Database>({
    auth: {
      adapter: SupabaseAuthAdapter(),
      url: config.authUrl,
    },
    dataApi: { url: config.dataApiUrl },
  });
}

type NeonClient = ReturnType<typeof createNeonClient>;

let client: NeonClient | null = null;

export function getNeonClient(): NeonClient {
  if (client) return client;

  client = createNeonClient();
  return client;
}
