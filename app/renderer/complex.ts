import assert = require("assert");
import { clampMod, prod, sum } from "~utils/math";
import Coordinate, {
  cartesianCompat,
  cartesianAddition,
  cartesianSubtraction,
} from "./coordinate-systems";

function polar(r: number, p: number): Coordinate.Polar {
  return {
    type: "p",
    r,
    p: clampMod(-Math.PI, Math.PI)(p),
  };
}

export function complexMultiplication(...ps: Coordinate.Polar[]) {
  return polar(prod(...ps.map((p) => p.r)), sum(...ps.map((p) => p.p)));
}
export function complexDivision(p: Coordinate.Polar, q: Coordinate.Polar) {
  assert(q.r !== 0, "complexDivision: division by 0.");
  return polar(p.r / q.r, p.p - q.p);
}
export function complexAddition(...ps: Coordinate.Polar[]) {
  return cartesianCompat.toPolar(
    cartesianAddition(...ps.map(cartesianCompat.fromPolar))
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

export const one = polar(1, 0);
export const zero = polar(0, 0);
