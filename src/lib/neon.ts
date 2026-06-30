import { createClient, SupabaseAuthAdapter } from '@neondatabase/neon-js';
import type { Database } from './database.types';
import { getNeonConfig } from './neonConfig';

const config = getNeonConfig();

export const neon = createClient<Database>({
  auth: {
    adapter: SupabaseAuthAdapter(),
    url: config.authUrl,
  },
  dataApi: { url: config.dataApiUrl },
});
