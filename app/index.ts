import { pipe } from "fp-ts/lib/function";
import {
  PointerClickEvent,
  PointerLockChangeEvent,
  PointerManager,
  PointerPositionChangeEvent,
} from "~pointer";
import Coordinate, {
  cartesian,
  cartesianAddition,
  cartesianCompat,
  cartesianSubtraction,
  poincareDisk,
  poincareDiskCompat,
  polar,
} from "~renderer/coordinate-systems";
import { getTranslation } from "~renderer/poincare-disk";
import { HyperbolicRegularTiling } from "~renderer/tiling";

/** Settings */
const DISABLE_MOUSE_MOVE = false;
const PADDING = 0;
const INNER_SCALE = 70;

window.onload = main;

const pointerManager = new PointerManager();

pointerManager.addEventListener(
  "pointerpositionchange",
  (e: PointerPositionChangeEvent) => {
    const CURSOR_MARGIN = 12.88333;
    document.getElementById("cursor").style.left = `${e.x - CURSOR_MARGIN}px`;
    document.getElementById("cursor").style.top = `${e.y - CURSOR_MARGIN}px`;
  }
);
pointerManager.addEventListener(
  "pointerlockchange",
  (e: PointerLockChangeEvent) => {
    console.log("LOCK CHANGED", e.locked);
  }
);
pointerManager.addEventListener("pointerclick", (e: PointerClickEvent) => {
  console.log("CLICKED", e.x, e.y, e.buttons);
});

let origin: Coordinate.PoincareDisk = poincareDisk(0, 0);

// origin for translating cursor position into poincare coord
let lockedOrigin: Coordinate.PoincareDisk = poincareDisk(0, 0);
// in cartesian; each coordinate in percent
let lockedCursorPosition: Coordinate.Cartesian = cartesian(0, 0);

const g = (document.getElementById("polygons") as unknown) as SVGGElement;
const tiling = new HyperbolicRegularTiling(5, 5, g);
tiling.level = 2;

function originsFromMousePosition(
  x: number,
  y: number,
  maxDistance: number
): [Coordinate.PoincareDisk, Coordinate.Cartesian] {
  const boundingRect = document
    .getElementById("renderer")
    .getBoundingClientRect();

  const px =
    ((x - boundingRect.x - PADDING) / (boundingRect.width - PADDING * 2)) *
      100 -
    lockedCursorPosition.x -
    50;
  const py =
    ((y - boundingRect.y - PADDING) / (boundingRect.height - PADDING * 2)) *
      100 -
    lockedCursorPosition.y -
    50;

  const coordMayOverflow = cartesianCompat.toPolar(cartesian(px, py));
  const pointInPolar: Coordinate.Polar = {
    ...coordMayOverflow,
    r: Math.min(coordMayOverflow.r, INNER_SCALE / 2),
  };
  const translation = getTranslation(
    polar(0, 0),
    poincareDiskCompat.toPolar(lockedOrigin)
  );

  const newOrigin = pipe(
    poincareDisk(
      Math.min(
        maxDistance,
        (pointInPolar.r / INNER_SCALE) * 2 * (maxDistance + 1)
      ),
      -pointInPolar.p
    ),
    poincareDiskCompat.toPolar,
    translation,
    poincareDiskCompat.fromPolar
  );

  const pointInCartesian = cartesianCompat.fromPolar(
    polar(pointInPolar.r, pointInPolar.p)
  );
  const innerGroupPosition = pipe(
    pointInCartesian,
    (v) => cartesianAddition(v, lockedCursorPosition),
    (v) => cartesian(v.x * 2 - INNER_SCALE, v.y * 2 - INNER_SCALE)
  );

  return [newOrigin, innerGroupPosition];
}

function setInnerGroupPosition(innerGroupPosition: Coordinate.Cartesian) {
  document
    .getElementById("inner-group")
    .setAttribute("x", `${innerGroupPosition.x}`);
  document
    .getElementById("inner-group")
    .setAttribute("y", `${innerGroupPosition.y}`);
}

function main(): void {
  setVh();
  window.addEventListener("resize", setVh);
  window.oncontextmenu = () => false;

  tiling.render(origin);

  pointerManager.addEventListener(
    "pointerpositionchange",
    (e: PointerPositionChangeEvent) => {
      if (DISABLE_MOUSE_MOVE) return;
      const [newOrigin, innerGroupPosition] = originsFromMousePosition(
        e.x,
        e.y,
        tiling.level + 2
      );

      setInnerGroupPosition(innerGroupPosition);

      origin = newOrigin;
      tiling.render(origin);
    }
  );

  document.addEventListener("keyup", (e) => {
    if (e.key === " ") {
      setLockedOrigin();
    } else if (e.key === "z") {
      resetOrigin();
      rerender();
    }
  });
}

function rerender() {
  const [newOrigin, innerGroupPosition] = originsFromMousePosition(
    pointerManager.x,
    pointerManager.y,
    tiling.level + 2
  );

  setInnerGroupPosition(innerGroupPosition);

  origin = newOrigin;
  tiling.render(origin);
}

function resetOrigin() {
  lockedOrigin = poincareDisk(0, 0);
  lockedCursorPosition = cartesian(0, 0);
}

function setLockedOrigin() {
  if (!pointerManager.locked) {
    pointerManager.lock();
  }

  const rendererSize = document.getElementById("renderer").clientWidth;
  const screenCenter = cartesian(window.innerWidth / 2, window.innerHeight / 2);
  let vectorFromCenterInCartesian = cartesianSubtraction(
    cartesian(pointerManager.x, pointerManager.y),
    screenCenter
  );
  let vectorFromCenter = cartesianCompat.toPolar(vectorFromCenterInCartesian);
  let vectorFromCenterScaled = polar(
    (vectorFromCenter.r / rendererSize) * 100,
    vectorFromCenter.p
  );

  if (vectorFromCenterScaled.r > INNER_SCALE / 2) {
    vectorFromCenterScaled = polar(INNER_SCALE / 2, vectorFromCenter.p);
    const pointerPosition = pipe(
      polar(
        (vectorFromCenterScaled.r / 100) * rendererSize,
        vectorFromCenter.p
      ),
      cartesianCompat.fromPolar,
      (v) => cartesianAddition(v, screenCenter)
    );
    pointerManager.setPointerPosition(pointerPosition.x, pointerPosition.y);
  }

  lockedCursorPosition = cartesianCompat.fromPolar(vectorFromCenterScaled);
  lockedOrigin = origin;
}

function setVh() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty("--vh", `${vh}px`);
}
