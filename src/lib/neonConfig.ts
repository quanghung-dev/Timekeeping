type NeonEnvironment = {
  VITE_NEON_AUTH_URL?: string;
  VITE_NEON_DATA_API_URL?: string;
};

export type NeonConfig = {
  authUrl: string;
  dataApiUrl: string;
};

function validEndpoint(value: string | undefined, suffix: string): value is string {
  if (!value || value.includes('your-neon-project')) return false;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.pathname.endsWith(suffix);
  } catch {
    return false;
  }
}

export function parseNeonConfig(env: NeonEnvironment): NeonConfig {
  if (
    !validEndpoint(env.VITE_NEON_AUTH_URL, '/auth') ||
    !validEndpoint(env.VITE_NEON_DATA_API_URL, '/rest/v1')
  ) {
    throw new Error(
      'Cấu hình Neon không hợp lệ. Hãy kiểm tra Auth URL và Data API URL.',
    );
  }

  return {
    authUrl: env.VITE_NEON_AUTH_URL,
    dataApiUrl: env.VITE_NEON_DATA_API_URL,
  };
}

export function getNeonConfig(): NeonConfig {
  return parseNeonConfig(import.meta.env);
}
