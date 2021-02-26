import { flow } from "fp-ts/lib/function";
import {
  complexDivision as div,
  complexAddition as add,
  complexMultiplication as mul,
  complexSubtraction as sub,
  one,
  zero,
} from "./complex";
import Coordinate, { poincareDiskCompat, polar } from "./coordinate-systems";

export namespace Mobius {
  export type Type = [
    Coordinate.Polar,
    Coordinate.Polar,
    Coordinate.Polar,
    Coordinate.Polar
  ];

  export const identity: Type = [one, zero, zero, one];

  export function normalize([a, b, c, d]: Type): Type {
    const f = Math.max(a.r, b.r, c.r, d.r);
    return [
      polar(a.r / f, a.p),
      polar(b.r / f, b.p),
      polar(c.r / f, c.p),
      polar(d.r / f, d.p),
    ];
  }

  export function inPolar([a, b, c, d]: Type) {
    return (z: Coordinate.Polar) => div(add(mul(a, z), b), add(mul(c, z), d));
  }

  export const inPoincareDisk = (m: Type) =>
    flow(poincareDiskCompat.toPolar, inPolar(m), poincareDiskCompat.fromPolar);

  export const atPolarZero = ([, b, , d]: Type) => div(b, d);

  export const atPoincareDiskZero = ([, b, , d]: Type) =>
    poincareDiskCompat.fromPolar(div(b, d));

  export function compose([p, q, r, s]: Type, [a, b, c, d]: Type): Type {
    const dotProd = (
      a: Coordinate.Polar,
      b: Coordinate.Polar,
      c: Coordinate.Polar,
      d: Coordinate.Polar
    ) => add(mul(a, b), mul(c, d));
    return normalize([
      dotProd(a, p, c, q),
      dotProd(b, p, d, q),
      dotProd(a, r, c, s),
      dotProd(b, r, d, s),
    ]);
  }

  export function inverse([a, b, c, d]: Type): Type {
    const det = sub(mul(a, d), mul(b, c));
    const negative = (z: Coordinate.Polar) => mul(polar(1, Math.PI), z);
    return normalize([
      div(d, det),
      div(negative(b), det),
      div(negative(c), det),
      div(a, det),
    ]);
  }
}
