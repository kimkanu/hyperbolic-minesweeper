export function clampMod(min: number, max: number, precision = 1e-8) {
  return (n: number) => {
    const gap = max - min;
    const mod = (n: number, d: number) => n - d * Math.floor(n / d);
    const res = (mod(n - min, gap) || gap) + min;
    return Math.abs(res - min) <= precision ? max : res;
  };
}

export function clamp(min: number, max: number) {
  return (n: number) => Math.max(min, Math.min(max, n));
}

export function eq(a: number, b: number, precision = 1e-8) {
  return Math.abs(a - b) <= precision;
}

export function sum(...a: number[]) {
  return a.reduce((x, y) => x + y, 0);
}

export function prod(...a: number[]) {
  return a.reduce((x, y) => x * y, 1);
}
