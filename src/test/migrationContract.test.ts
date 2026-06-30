import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Neon migration contract', () => {
  const sql = readFileSync(
    'scripts/migrations/001_initial_schema.sql',
    'utf8',
  );
  const runner = readFileSync('scripts/migrate.js', 'utf8');

  it('uses server timestamp defaults and authenticated grants', () => {
    expect(sql).toContain('DEFAULT CURRENT_TIMESTAMP');
    expect(sql).toContain('GRANT SELECT, INSERT, UPDATE, DELETE');
    expect(sql).toContain('TO authenticated');
  });

  it('does not replace the Data API auth schema', () => {
    expect(sql).not.toContain('CREATE SCHEMA IF NOT EXISTS auth');
    expect(sql).not.toContain('CREATE OR REPLACE FUNCTION auth.user_id');
  });

  it('runs each migration in a transaction', () => {
    expect(runner).toContain("client.query('BEGIN')");
    expect(runner).toContain("client.query('COMMIT')");
    expect(runner).toContain("client.query('ROLLBACK')");
  });

  it('rejects the checked-in placeholder credentials', () => {
    expect(runner).toContain("dbUrl.includes('user:password')");
  });
});
