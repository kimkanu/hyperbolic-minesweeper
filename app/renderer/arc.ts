import { clampMod } from "~utils/math";
import Coordinate, {
  polarCompat,
  cartesianAddition,
  cartesianCompat,
  cartesian,
  cartesianSubtraction,
  coordinateConversion,
} from "./coordinate-systems";
import { geodesicFromTwoPoints } from "./poincare-disk";

export function renderPoint<F extends Coordinate.System>(
  point: F,
  compat: Coordinate.Compat<F>,
  separator = ","
): string {
  const inCartesian = coordinateConversion(compat, cartesianCompat)(point);
  return `${inCartesian.x * 100}${separator}${-inCartesian.y * 100}`;
}

export function renderArc(p: Coordinate.Polar, q: Coordinate.Polar): string {
  const geodesic = geodesicFromTwoPoints(p, q);
  if (geodesic.type === "linear") {
    return `L ${renderPoint(q, polarCompat, " ")}`;
  }
  const sumOfPQInCartesian = cartesianAddition(
    cartesianCompat.fromPolar(p),
    cartesianCompat.fromPolar(q)
  );
  const middleOfPQInCartesian = cartesian(
    sumOfPQInCartesian.x / 2,
    sumOfPQInCartesian.y / 2
  );

  const centerToM = cartesianCompat.toPolar(
    cartesianSubtraction(
      middleOfPQInCartesian,
      cartesianCompat.fromPolar(geodesic.center)
    )
  );
  const pToQ = cartesianCompat.toPolar(
    cartesianSubtraction(
      cartesianCompat.fromPolar(q),
      cartesianCompat.fromPolar(p)
    )
  );
  const angleDiff = clampMod(-Math.PI, Math.PI)(pToQ.p - centerToM.p);

  return `A ${geodesic.radius * 100} ${geodesic.radius * 100} 0 0 ${
    angleDiff >= 0 ? 0 : 1
  } ${renderPoint(q, polarCompat, " ")}`;
}

export function renderConsecutiveArcs(...points: Coordinate.Polar[]): string {
  if (points.length <= 1) return "";
  return Array(points.length - 1)
    .fill(0)
    .map((x, i) => renderArc(points[i], points[i + 1]))
    .join(" ");
}
