import { describe, expect, it } from 'vitest';
import { calculateTotalHours } from './utils';

describe('calculateTotalHours', () => {
  it('rejects an equal start and end time', () => {
    expect(() => calculateTotalHours('08:00', '08:00')).toThrow(
      'Thời lượng ca làm phải lớn hơn 0',
    );
  });

  it('calculates an overnight shift', () => {
    expect(calculateTotalHours('22:00', '06:00')).toBe(8);
  });

  it('rejects malformed clock values', () => {
    expect(() => calculateTotalHours('24:00', '06:00')).toThrow(
      'Thời gian không hợp lệ',
    );
  });
});
