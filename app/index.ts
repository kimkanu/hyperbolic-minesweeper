import Coordinate, {
  cartesian,
  cartesianCompat,
  poincareDisk,
  poincareDiskEq,
  polar,
} from "~renderer/coordinate-systems";
import { HyperbolicRegularTiling } from "~renderer/tiling";

/** Settings */
const DISABLE_MOUSE_MOVE = false;
const PADDING = 0;
const INNER_SCALE = 70;
const DISCOUNT_FACTOR = 0.8;
const EXP_DISCOUNT_FACTOR = 0.97;

window.onload = main;

let origin: Coordinate.PoincareDisk = poincareDisk(0, 0);

const tiling = new HyperbolicRegularTiling(5, 5);
tiling.level = 4;

function originsFromMousePosition(
  x: number,
  y: number,
  maxDistance: number,
  boundingRect: DOMRect
): [Coordinate.PoincareDisk, Coordinate.Cartesian] {
  const px =
    ((x - boundingRect.x - PADDING) / (boundingRect.width - PADDING * 2)) *
      100 -
    50;
  const py =
    ((y - boundingRect.y - PADDING) / (boundingRect.height - PADDING * 2)) *
      100 -
    50;
  const coordMayOverflow = cartesianCompat.toPolar(cartesian(px, py));
  const pointInPolar: Coordinate.Polar = {
    ...coordMayOverflow,
    r: Math.min(coordMayOverflow.r * DISCOUNT_FACTOR, INNER_SCALE / 2),
  };
  const expDiscount = (d: number) =>
    d ** EXP_DISCOUNT_FACTOR * maxDistance ** (1 - EXP_DISCOUNT_FACTOR);

  const newOrigin = poincareDisk(
    expDiscount(
      Math.min(
        maxDistance,
        (pointInPolar.r / INNER_SCALE) * 2 * (maxDistance + 1)
      )
    ),
    -pointInPolar.p
  );

  const pointInCartesian = cartesianCompat.fromPolar(
    polar(Math.min(pointInPolar.r, maxDistance - 0.3), pointInPolar.p)
  );
  const innerGroupPosition = cartesian(
    pointInCartesian.x * 2 - INNER_SCALE,
    pointInCartesian.y * 2 - INNER_SCALE
  );

  return [newOrigin, innerGroupPosition];
}

function onNewOrigin(newOrigin: Coordinate.PoincareDisk) {
  origin = newOrigin;

  tiling.render(
    (document.getElementById("polygons") as unknown) as SVGGElement,
    newOrigin
  );
}

function main(): void {
  setVh();
  window.addEventListener("resize", setVh);

  onNewOrigin(origin);

  document.getElementById("app").addEventListener("mousemove", (details) => {
    if (DISABLE_MOUSE_MOVE) return;

    const boundingRect = document
      .getElementById("renderer")
      .getBoundingClientRect();
    const [newOrigin, innerGroupPosition] = originsFromMousePosition(
      details.clientX,
      details.clientY,
      tiling.level + 1,
      boundingRect
    );

    document
      .getElementById("inner-group")
      .setAttribute("x", `${innerGroupPosition.x}`);
    document
      .getElementById("inner-group")
      .setAttribute("y", `${innerGroupPosition.y}`);

    onNewOrigin(newOrigin);
  });

  document.addEventListener("keyup", (e) => {
    if (e.key === " ") {
      // TODO: implement origin translation
      tiling.currentOrigin = origin;
    }
  });
}

function setVh() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty("--vh", `${vh}px`);
}
