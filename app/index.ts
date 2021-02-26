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
import { Mobius } from "~renderer/mobius";
import { getTranslation } from "~renderer/poincare-disk";
import { HyperbolicRegularTiling } from "~renderer/tiling";

/** Settings */
window.onload = main;

let originTransform = Mobius.identity;
let wheelLock = 0;

const g = (document.getElementById("polygons") as unknown) as SVGGElement;
const tiling = new HyperbolicRegularTiling(5, 5, g);
tiling.level = 2;
console.log(tiling.tiles.slice(-1)[0].center.d);

function main(): void {
  setVh();
  window.addEventListener("resize", setVh);
  window.oncontextmenu = () => false;

  tiling.render(originTransform);

  document.addEventListener("keyup", (e) => {
    if (e.key === "z") {
      resetOrigin();
    }
  });

  document.addEventListener("wheel", wheelHandler());
}

const stepSizeFactorDecrement = 0.006;

function wheelHandler(stepSizeFactor = 0.014, _boundingRect?: DOMRect) {
  const boundingRect =
    _boundingRect ??
    document.getElementById("renderer").getBoundingClientRect();

  return (e: WheelEvent) => {
    if (wheelLock > stepSizeFactor + (stepSizeFactorDecrement * 4) / 3) {
      wheelLock = 0;
      return;
    }
    wheelLock = stepSizeFactor;
    const maxDist = tiling.maxDist;
    const stepSize = stepSizeFactor * Math.abs(e.deltaY);

    const newOriginTransform = getOriginTransform(
      originTransform,
      { x: e.x, y: e.y },
      boundingRect,
      maxDist,
      stepSize
    );

    originTransform = newOriginTransform;
    tiling.render(originTransform);

    setTimeout(() => {
      if (stepSizeFactor > stepSizeFactorDecrement) {
        wheelHandler(stepSizeFactor - stepSizeFactorDecrement, boundingRect)(e);
      }
    }, 40);
  };
}

function getOriginTransform(
  originTransform: Mobius.Type,
  { x, y }: { x: number; y: number },
  boundingRect: { x: number; y: number; width: number; height: number },
  maxDist: number,
  stepSize: number
): Mobius.Type {
  const px = ((x - boundingRect.x) / boundingRect.width) * 100 - 50;
  const py = ((y - boundingRect.y) / boundingRect.height) * 100 - 50;

  const coord = cartesianCompat.toPolar(cartesian(px, -py));

  const newOriginTransform = Mobius.compose(
    originTransform,
    getTranslation(poincareDisk(0, 0), poincareDisk(stepSize, coord.p))
  );

  const newOrigin = Mobius.atPolarZero(newOriginTransform);
  if (newOrigin.r >= 1 || poincareDiskCompat.fromPolar(newOrigin).d > maxDist) {
    return originTransform;
  }
  return newOriginTransform;
}

function resetOrigin() {
  originTransform = Mobius.identity;
  tiling.render(originTransform);
}

function setVh() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty("--vh", `${vh}px`);
}
