import assert = require("assert");
import Coordinate, {
  polar,
  cartesianCompat,
  cartesianAddition,
  cartesianSubtraction,
} from "./coordinate-systems";

export function complexMultiplication(
  p: Coordinate.Polar,
  q: Coordinate.Polar
) {
  return polar(p.r * q.r, p.p + q.p);
}
export function complexDivision(p: Coordinate.Polar, q: Coordinate.Polar) {
  assert(q.r !== 0, "complexDivision: division by 0.");
  return polar(p.r / q.r, p.p - q.p);
}
export function complexAddition(p: Coordinate.Polar, q: Coordinate.Polar) {
  return cartesianCompat.toPolar(
    cartesianAddition(
      cartesianCompat.fromPolar(p),
      cartesianCompat.fromPolar(q)
    )
  );
}
export function complexSubtraction(p: Coordinate.Polar, q: Coordinate.Polar) {
  return cartesianCompat.toPolar(
    cartesianSubtraction(
      cartesianCompat.fromPolar(p),
      cartesianCompat.fromPolar(q)
    )
  );
}
export function mobiusTransformation(
  a: Coordinate.Polar,
  b: Coordinate.Polar,
  c: Coordinate.Polar,
  d: Coordinate.Polar
) {
  return (z: Coordinate.Polar) =>
    complexDivision(
      complexAddition(complexMultiplication(a, z), b),
      complexAddition(complexMultiplication(c, z), d)
    );
}
