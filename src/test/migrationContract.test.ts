import { existsSync, readFileSync } from 'node:fs';
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

  it('enforces named new-write integrity constraints', () => {
    const names = [
      'user_settings_salary_positive',
      'user_settings_work_hours_range',
      'attendance_date_valid',
      'attendance_check_in_valid',
      'attendance_check_out_valid',
      'attendance_total_hours_range',
      'attendance_status_time_consistency',
    ];

    for (const name of names) {
      expect(sql).toContain(`CONSTRAINT ${name}`);
    }
    expect(sql.match(/NOT VALID/g)?.length).toBeGreaterThanOrEqual(names.length);
  });

  it('removes obsolete Firebase scripts and rule tests', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts).not.toHaveProperty('test:rules');
    expect(packageJson.scripts).not.toHaveProperty('deploy:rules');
    expect(existsSync('vitest.rules.config.ts')).toBe(false);
    expect(existsSync('test/firestore.rules.test.ts')).toBe(false);
  });
});
