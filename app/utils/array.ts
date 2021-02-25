export function range(start: number, end: number | null = null): number[] {
  if (end === null) {
    return range(0, start);
  }
  return Array(end - start)
    .fill(0)
    .map((x, i) => i + start);
}
