import assert = require("assert");
import { flow } from "fp-ts/lib/function";
import { clampMod, eq } from "~utils/math";
import {
  mobiusTransformation,
  complexDivision,
  complexAddition,
  complexMultiplication,
  complexSubtraction,
} from "./complex";
import Coordinate, {
  cartesian,
  cartesianAddition,
  cartesianCompat,
  cartesianMetric,
  cartesianSubtraction,
  coordinateConversion,
  poincareDiskCompat,
  PoincareDiskCoordinate,
  poincareDiskEq,
  polar,
  polarCompat,
  polarEq,
} from "./coordinate-systems";

export function polarRadiusToPoincareRadius(r: number) {
  assert(
    0 <= r && r < 1,
    "poincareDiskCompat: radius `r` is out of range [0, 1)."
  );
  return Math.acosh((1 + r ** 2) / (1 - r ** 2));
}

export function poincareRadiusToPolarRadius(d: number) {
  const c = Math.cosh(d);
  return Math.sqrt((c - 1) / (c + 1));
}

export type PoincareDiskGeodesic =
  | PoincareDiskCircularGeodesic
  | PoincareDiskLinearGeodesic;
export interface PoincareDiskCircularGeodesic {
  type: "circular";
  center: Coordinate.Polar;
  radius: number;
}
export interface PoincareDiskLinearGeodesic {
  type: "linear";
  angle: number;
}

export function getGeodesicFromTwoPoints(
  p1: Coordinate.Polar,
  p2: Coordinate.Polar
): PoincareDiskGeodesic {
  assert(
    !polarEq.equal(p1, p2),
    "getGeodesicFromTwoPoints: given two points are the same."
  );

  const halfwayClamp = clampMod(-Math.PI / 2, Math.PI / 2);

  // straight line case
  if (eq(p1.r, 0)) {
    return getGeodesicFromTwoPoints(p2, p1);
  }
  if (eq(p2.r, 0)) {
    assert(
      p1.r !== 0,
      "getGeodesicFromTwoPoints: given two points are the same."
    );
    return {
      type: "linear",
      angle: halfwayClamp(p1.p),
    };
  }
  if (eq(halfwayClamp(p1.p), halfwayClamp(p2.p))) {
    return {
      type: "linear",
      angle: halfwayClamp(p1.p),
    };
  }

  // circular case
  if (p1.r < p2.r) {
    return getGeodesicFromTwoPoints(p2, p1);
  }
  const p1Refl = polar(1 / p1.r, p1.p);
  const p1Polar = cartesianCompat.fromPolar(p1);
  const center = getCircumcenter(
    p1Polar,
    cartesianCompat.fromPolar(p2),
    cartesianCompat.fromPolar(p1Refl)
  );
  const radius = Math.hypot(center.x - p1Polar.x, center.y - p1Polar.y);
  return {
    type: "circular",
    center: cartesianCompat.toPolar(center),
    radius,
  };
}

function getCircumcenter(
  { x: x1, y: y1 }: Coordinate.Cartesian,
  { x: x2, y: y2 }: Coordinate.Cartesian,
  { x: x3, y: y3 }: Coordinate.Cartesian
): Coordinate.Cartesian {
  const denom = 2 * (x1 - x2) * (y1 - y3) - 2 * (x1 - x3) * (y1 - y2);
  const x =
    ((x1 ** 2 + y1 ** 2 - x2 ** 2 - y2 ** 2) * (y1 - y3) -
      (x1 ** 2 + y1 ** 2 - x3 ** 2 - y3 ** 2) * (y1 - y2)) /
    denom;
  const y =
    ((x1 - x2) * (x1 ** 2 + y1 ** 2 - x3 ** 2 - y3 ** 2) -
      (x1 - x3) * (x1 ** 2 + y1 ** 2 - x2 ** 2 - y2 ** 2)) /
    denom;
  return cartesian(x, y);
}

export function poincareDiskMetric(
  p: PoincareDiskCoordinate,
  q: PoincareDiskCoordinate
) {
  if (poincareDiskEq.equal(p, q)) return 0;

  const pInPolar = coordinateConversion(poincareDiskCompat, polarCompat)(p);
  const qInPolar = coordinateConversion(poincareDiskCompat, polarCompat)(q);
  const pInCartesian = coordinateConversion(
    poincareDiskCompat,
    cartesianCompat
  )(p);
  const qInCartesian = coordinateConversion(
    poincareDiskCompat,
    cartesianCompat
  )(q);
  const isometricInvariant =
    (2 * cartesianMetric(pInCartesian, qInCartesian) ** 2) /
    (1 - pInPolar.r ** 2) /
    (1 - qInPolar.r ** 2);
  return Math.acosh(1 + isometricInvariant);
}

function getGeodesicBoundaryIntersection(
  p: Coordinate.Polar,
  q: Coordinate.Polar
): [Coordinate.Polar, Coordinate.Polar] {
  const geodesic = getGeodesicFromTwoPoints(p, q);
  if (geodesic.type === "linear") {
    return [polar(1, geodesic.angle), polar(1, geodesic.angle + Math.PI)];
  }

  const phi = Math.abs(
    Math.asin(geodesic.center.r / Math.sqrt(1 + geodesic.radius ** 2)) -
      Math.atan2(1, geodesic.radius)
  );
  return [polar(1, geodesic.center.p + phi), polar(1, geodesic.center.p - phi)];
}

export function getTranslationInPolar(
  p: Coordinate.Polar,
  q: Coordinate.Polar
) {
  const one = polar(1, 0);
  const zero = polar(0, 0);
  const negativeOne = polar(1, Math.PI);
  if (polarEq.equal(p, q)) {
    return mobiusTransformation(one, zero, zero, one);
  }

  const [w1, w2] = getGeodesicBoundaryIntersection(p, q);
  const a = complexDivision(
    complexAddition(
      complexMultiplication(
        q,
        complexSubtraction(complexSubtraction(p, w1), w2)
      ),
      complexMultiplication(w1, w2)
    ),
    complexSubtraction(p, q)
  );
  const b = complexMultiplication(complexMultiplication(w1, w2), negativeOne);
  const c = one;
  const d = complexSubtraction(complexSubtraction(a, w1), w2);
  return mobiusTransformation(a, b, c, d);
}

export const getTranslation = (
  p: Coordinate.PoincareDisk,
  q: Coordinate.PoincareDisk
) =>
  flow(
    poincareDiskCompat.toPolar,
    getTranslationInPolar(
      poincareDiskCompat.toPolar(p),
      poincareDiskCompat.toPolar(q)
    ),
    poincareDiskCompat.fromPolar
  );

export function getReflection(p: Coordinate.Polar, q: Coordinate.Polar) {
  const geodesic = getGeodesicFromTwoPoints(p, q);
  if (geodesic.type === "linear") {
    return (point: Coordinate.Polar) =>
      polar(point.r, 2 * geodesic.angle - point.p);
  }
  return (point: Coordinate.Polar) => {
    const diff = cartesianCompat.toPolar(
      cartesianSubtraction(
        cartesianCompat.fromPolar(point),
        cartesianCompat.fromPolar(geodesic.center)
      )
    );
    const newDiff = polar(geodesic.radius ** 2 / diff.r, diff.p);
    return cartesianCompat.toPolar(
      cartesianAddition(
        cartesianCompat.fromPolar(newDiff),
        cartesianCompat.fromPolar(geodesic.center)
      )
    );
  };
}
