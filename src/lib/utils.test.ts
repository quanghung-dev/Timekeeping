import { describe, expect, it } from 'vitest';
import { calculateTotalHours } from './utils';

describe('calculateTotalHours', () => {
  it('rejects an equal start and end time', () => {
    expect(() => calculateTotalHours('08:00', '08:00')).toThrow(
      'Thời lượng ca làm phải lớn hơn 0',
    );
  });
});
