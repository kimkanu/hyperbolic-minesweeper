export class Cycle<T> {
  constructor(public inner: T[] = []) {}

  get(index: number): T {
    if (index < 0 || index >= this.inner.length) {
      const remainder =
        index - this.inner.length * Math.floor(index / this.inner.length);
      return this.get(remainder);
    }
    return this.inner[index];
  }

  get length() {
    return this.inner.length;
  }

  // [0, 1, 2, 3, 4, 5] |> .rotate(2) |> [2, 3, 4, 5, 0, 1]
  rotated(index: number = 0) {
    if (index < 0 || index >= this.inner.length) {
      const remainder =
        index - this.inner.length * Math.floor(index / this.inner.length);
      return this.rotated(remainder);
    }
    return [...this.inner.slice(index), ...this.inner.slice(0, index)];
  }
  rotate(index: number = 0) {
    this.inner = this.rotated(index);
    return this.inner;
  }

  // [0, 1, 2, 3, 4, 5] |> .reverse(2) |> [4, 3, 2, 1, 0, 5]
  reversed(index: number = 0) {
    const reversed = this.inner.slice(0).reverse();
    return new Cycle(reversed).rotated(2 * (length - index) - 1);
  }
  reverse(index: number = 0) {
    this.inner = this.reversed(index);
    return this.inner;
  }
}
