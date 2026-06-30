import { describe, expect, it } from 'vitest';
import { parseNeonConfig } from './neonConfig';

describe('parseNeonConfig', () => {
  it('accepts real HTTPS Auth and Data API endpoints', () => {
    expect(
      parseNeonConfig({
        VITE_NEON_AUTH_URL:
          'https://ep-demo.neonauth.us-east-2.aws.neon.tech/neondb/auth',
        VITE_NEON_DATA_API_URL:
          'https://ep-demo.apirest.us-east-2.aws.neon.tech/neondb/rest/v1',
      }),
    ).toEqual({
      authUrl: 'https://ep-demo.neonauth.us-east-2.aws.neon.tech/neondb/auth',
      dataApiUrl:
        'https://ep-demo.apirest.us-east-2.aws.neon.tech/neondb/rest/v1',
    });
  });

  it.each([
    '',
    'https://your-neon-project.auth.neon.tech/neondb/auth',
    'http://localhost/auth',
  ])('rejects invalid Auth URL %s', (authUrl) => {
    expect(() =>
      parseNeonConfig({
        VITE_NEON_AUTH_URL: authUrl,
        VITE_NEON_DATA_API_URL:
          'https://ep-demo.apirest.us-east-2.aws.neon.tech/neondb/rest/v1',
      }),
    ).toThrow('Cấu hình Neon không hợp lệ');
  });

  it('rejects a Data API URL without the REST path', () => {
    expect(() =>
      parseNeonConfig({
        VITE_NEON_AUTH_URL:
          'https://ep-demo.neonauth.us-east-2.aws.neon.tech/neondb/auth',
        VITE_NEON_DATA_API_URL:
          'https://ep-demo.apirest.us-east-2.aws.neon.tech',
      }),
    ).toThrow('Cấu hình Neon không hợp lệ');
  });
});
