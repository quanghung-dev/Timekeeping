/** Calculate decimal hours between HH:mm values, including an overnight shift. */
export function calculateTotalHours(checkIn: string, checkOut: string): number {
  const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  if (!timePattern.test(checkIn) || !timePattern.test(checkOut)) {
    throw new Error('Thời gian không hợp lệ');
  }

  const [inHours, inMins] = checkIn.split(':').map(Number);
  const [outHours, outMins] = checkOut.split(':').map(Number);
  const startMinutes = inHours * 60 + inMins;
  const endMinutes = outHours * 60 + outMins;

  if (endMinutes === startMinutes) {
    throw new Error('Thời lượng ca làm phải lớn hơn 0');
  }

  const durationMinutes =
    endMinutes < startMinutes
      ? 24 * 60 - startMinutes + endMinutes
      : endMinutes - startMinutes;
  return Math.round((durationMinutes / 60) * 100) / 100;
}
