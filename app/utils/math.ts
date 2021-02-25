export function clampMod(min: number, max: number, precision = 1e-8) {
  return (n: number) => {
    const gap = max - min;
    const mod = (n: number, d: number) => n - d * Math.floor(n / d);
    const res = (mod(n - min, gap) || gap) + min;
    return Math.abs(res - min) <= precision ? max : res;
  };
}

export function eq(a: number, b: number, precision = 1e-8) {
  return Math.abs(a - b) <= precision;
}
