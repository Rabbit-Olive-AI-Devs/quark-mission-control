export interface WindowedDayInput {
  dayKey: string;
}

export function inWindow(dayKey: string, startDayKey: string, endDayKey: string): boolean {
  return dayKey >= startDayKey && dayKey <= endDayKey;
}

export function filterByWindow<T extends WindowedDayInput>(
  rows: T[],
  startDayKey: string,
  endDayKey: string
): T[] {
  return rows.filter((row) => inWindow(row.dayKey, startDayKey, endDayKey));
}
