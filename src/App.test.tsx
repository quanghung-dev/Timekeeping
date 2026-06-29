import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('route bundle boundaries', () => {
  it('lazy-loads every protected page', () => {
    const source = readFileSync('src/App.tsx', 'utf8');

    for (const page of ['Dashboard', 'Attendance', 'History', 'Statistics', 'Settings']) {
      expect(source).toContain(`lazy(() => import('./pages/${page}')`);
    }
    expect(source).toContain('<Suspense');
  });
});
