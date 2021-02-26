import { flow, identity } from "fp-ts/lib/function";
import { clampMod, eq, sum } from "~utils/math";
import {
  poincareRadiusToPolarRadius,
  polarRadiusToPoincareRadius,
} from "./poincare-disk";

export interface CoordinateSystem {
  type: string;
}
/**
 * Caution: CoordinateCompat does not mean the conversion is ISOMETRIC
 */
export interface CoordinateCompat<F extends CoordinateSystem> {
  fromPolar(polar: Coordinate.Polar): F;
  toPolar(point: F): Coordinate.Polar;
}
export function coordinateConversion<
  F extends CoordinateSystem,
  G extends CoordinateSystem
>(fCompat: CoordinateCompat<F>, gCompat: CoordinateCompat<G>): (point: F) => G {
  return flow(fCompat.toPolar, gCompat.fromPolar);
}

export interface Eq<F> {
  equal(a: F, b: F): boolean;
}

/**
 * Polar coordinate system
 */
export interface PolarCoordinate extends CoordinateSystem {
  type: "polar";
  r: number; // radius
  p: number; // angle (phi)
}
export function polar(r: number, p: number): PolarCoordinate {
  return {
    type: "polar",
    r,
    p: clampMod(-Math.PI, Math.PI)(p),
  };
}
export const polarCompat: CoordinateCompat<PolarCoordinate> = {
  fromPolar: identity,
  toPolar: identity,
};
export const polarEq: Eq<PolarCoordinate> = {
  equal(a, b) {
    return (eq(a.r, 0) && eq(b.r, 0)) || (eq(a.r, b.r) && eq(a.p, b.p));
  },
};

/**
 * Polar coordinate system
 */
export interface CartesianCoordinate extends CoordinateSystem {
  type: "cartesian";
  x: number;
  y: number;
}
export function cartesian(x: number, y: number): CartesianCoordinate {
  return {
    type: "cartesian",
    x,
    y,
  };
}
export const cartesianCompat: CoordinateCompat<CartesianCoordinate> = {
  fromPolar({ r, p }) {
    return cartesian(r * Math.cos(p), r * Math.sin(p));
  },
  toPolar({ x, y }) {
    return polar(Math.hypot(x, y), Math.atan2(y, x));
  },
};
export const cartesianEq: Eq<CartesianCoordinate> = {
  equal(a, b) {
    return eq(a.x, b.x) && eq(a.y, b.y);
  },
};
export function cartesianAddition(...ps: CartesianCoordinate[]) {
  return cartesian(sum(...ps.map((p) => p.x)), sum(...ps.map((p) => p.y)));
}
export function cartesianSubtraction(
  p: CartesianCoordinate,
  q: CartesianCoordinate
) {
  return cartesian(p.x - q.x, p.y - q.y);
}
export function cartesianMetric(
  a: CartesianCoordinate,
  b: CartesianCoordinate
) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Poincare disk coordinate system
 */
export interface PoincareDiskCoordinate extends CoordinateSystem {
  type: "poincare-disk";
  d: number;
  p: number;
}
export function poincareDisk(d: number, p: number): PoincareDiskCoordinate {
  return {
    type: "poincare-disk",
    d,
    p: clampMod(-Math.PI, Math.PI)(p),
  };
}
export const poincareDiskCompat: CoordinateCompat<PoincareDiskCoordinate> = {
  fromPolar({ r, p }) {
    return poincareDisk(polarRadiusToPoincareRadius(r), p);
  },
  toPolar({ d, p }) {
    return polar(poincareRadiusToPolarRadius(d), p);
  },
};
export const poincareDiskEq: Eq<PoincareDiskCoordinate> = {
  equal(a, b) {
    return (
      (eq(a.d, 0, 1e-3) && eq(b.d, 0, 1e-3)) ||
      (eq(a.d, b.d, 1e-6) && eq(a.p, b.p, 1e-6))
    );
  },
};

export namespace Coordinate {
  export type System = CoordinateSystem;
  export type Compat<F extends System> = CoordinateCompat<F>;

  // coordinate systems
  export type Polar = PolarCoordinate;
  export type Cartesian = CartesianCoordinate;
  export type PoincareDisk = PoincareDiskCoordinate;
}
export default Coordinate;
