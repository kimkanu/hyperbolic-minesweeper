import { flow } from "fp-ts/lib/function";
import {
  complexDivision as div,
  complexAddition as add,
  complexMultiplication as mul,
  complexSubtraction as sub,
} from "./complex";
import Coordinate, { poincareDiskCompat, polar } from "./coordinate-systems";

export class MobiusTransformation {
  static get identity() {
    const one = polar(1, 0);
    const zero = polar(0, 0);
    return new MobiusTransformation(one, zero, zero, one);
  }

  public a: Coordinate.Polar;
  public b: Coordinate.Polar;
  public c: Coordinate.Polar;
  public d: Coordinate.Polar;

  constructor(
    a: Coordinate.Polar,
    b: Coordinate.Polar,
    c: Coordinate.Polar,
    d: Coordinate.Polar
  ) {
    // normalize a, b, c, and d
    const normalizeFactor = Math.max(a.r, b.r, c.r, d.r);
    this.a = polar(a.r / normalizeFactor, a.p);
    this.b = polar(b.r / normalizeFactor, b.p);
    this.c = polar(c.r / normalizeFactor, c.p);
    this.d = polar(d.r / normalizeFactor, d.p);
  }

  apply = (z: Coordinate.Polar) =>
    div(add(mul(this.a, z), this.b), add(mul(this.c, z), this.d));

  applyPoincare = flow(
    poincareDiskCompat.toPolar,
    this.apply,
    poincareDiskCompat.fromPolar
  );

  get applyZero() {
    return div(this.b, this.d);
  }

  andThen = ({ a: p, b: q, c: r, d: s }: MobiusTransformation) => {
    // (f.andThen(g))(z) = g(f(z))
    const { a, b, c, d } = this;
    const dotProd = (
      a: Coordinate.Polar,
      b: Coordinate.Polar,
      c: Coordinate.Polar,
      d: Coordinate.Polar
    ) => add(mul(a, b), mul(c, d));
    return new MobiusTransformation(
      dotProd(a, p, c, q),
      dotProd(b, p, d, q),
      dotProd(a, r, c, s),
      dotProd(b, r, d, s)
    );
  };

  get inverse() {
    const { a, b, c, d } = this;
    const det = sub(mul(a, d), mul(b, c));
    const negative = (z: Coordinate.Polar) => mul(polar(1, Math.PI), z);
    return new MobiusTransformation(
      div(d, det),
      div(negative(b), det),
      div(negative(c), det),
      div(a, det)
    );
  }
}
