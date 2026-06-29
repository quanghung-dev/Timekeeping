import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let environment: RulesTestEnvironment;

const validAttendance = (userId: string, date = '2026-06-29') => ({
  userId,
  date,
  checkIn: '08:00',
  checkOut: '17:00',
  totalHours: 9,
  status: 'work',
  note: '',
  createdAt: '2026-06-29T01:00:00.000Z',
  updatedAt: '2026-06-29T10:00:00.000Z',
});

beforeAll(async () => {
  environment = await initializeTestEnvironment({
    projectId: 'timekeeping-rules-test',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8085,
    },
  });
});

beforeEach(async () => {
  await environment.clearFirestore();
});

afterAll(async () => {
  await environment.cleanup();
});

describe('attendance rules', () => {
  it('allows the owner query used by the application', async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'attendance', 'user-1_2026-06-29'),
        validAttendance('user-1'),
      );
    });
    const database = environment.authenticatedContext('user-1').firestore();

    await assertSucceeds(
      getDocs(
        query(
          collection(database, 'attendance'),
          where('userId', '==', 'user-1'),
        ),
      ),
    );
  });

  it('denies reading another user attendance document', async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'attendance', 'user-2_2026-06-29'),
        validAttendance('user-2'),
      );
    });
    const database = environment.authenticatedContext('user-1').firestore();

    await assertFails(getDoc(doc(database, 'attendance', 'user-2_2026-06-29')));
  });

  it('allows a valid owner create and delete', async () => {
    const database = environment.authenticatedContext('user-1').firestore();
    const reference = doc(database, 'attendance', 'user-1_2026-06-29');

    await assertSucceeds(setDoc(reference, validAttendance('user-1')));
    await assertSucceeds(deleteDoc(reference));
  });

  it('denies malformed and mismatched attendance writes', async () => {
    const database = environment.authenticatedContext('user-1').firestore();

    await assertFails(
      setDoc(
        doc(database, 'attendance', 'user-1_2026-06-29'),
        validAttendance('user-2'),
      ),
    );
    await assertFails(
      setDoc(doc(database, 'attendance', 'user-1_2026-06-29'), {
        ...validAttendance('user-1'),
        status: 'remote',
      }),
    );
  });
});

describe('profile and settings rules', () => {
  it('keeps profile and settings documents owner-only', async () => {
    const owner = environment.authenticatedContext('user-1').firestore();
    const other = environment.authenticatedContext('user-2').firestore();
    const profile = doc(owner, 'users', 'user-1');
    const settings = doc(owner, 'settings', 'user-1');

    await assertSucceeds(
      setDoc(profile, {
        name: 'Personal User',
        email: 'user@example.com',
        createdAt: '2026-06-29T00:00:00.000Z',
      }),
    );
    await assertSucceeds(
      setDoc(settings, {
        userId: 'user-1',
        salaryType: 'hourly',
        salaryAmount: 50_000,
        workHoursPerDay: 8,
        theme: 'light',
        updatedAt: '2026-06-29T00:00:00.000Z',
      }),
    );
    await assertFails(getDoc(doc(other, 'users', 'user-1')));
    await assertFails(getDoc(doc(other, 'settings', 'user-1')));
  });

  it('denies invalid settings ranges', async () => {
    const owner = environment.authenticatedContext('user-1').firestore();

    await assertFails(
      setDoc(doc(owner, 'settings', 'user-1'), {
        userId: 'user-1',
        salaryType: 'hourly',
        salaryAmount: 0,
        workHoursPerDay: 25,
        theme: 'light',
        updatedAt: '2026-06-29T00:00:00.000Z',
      }),
    );
  });
});
