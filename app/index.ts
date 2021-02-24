import { flow } from "fp-ts/lib/function";
import Coordinate, {
  cartesian,
  cartesianAddition,
  cartesianCompat,
  cartesianSubtraction,
  coordinateConversion,
  poincareDisk,
  poincareDiskCompat,
  polar,
  polarCompat,
} from "~renderer/coordinate-systems";
import {
  geodesicFromTwoPoints,
  geodesicReflection,
  mobiusTranslation,
  polarRadiusToPoincareRadius,
} from "~renderer/poincare-disk";
import {
  getTileOuterRadius,
  HyperbolicRegularTileGraph,
} from "~renderer/tiling";
import { Cycle } from "~utils/cycle";
import { clampMod } from "~utils/math";

window.onload = main;

function drawPoint<F extends Coordinate.System>(
  index: number,
  point: F,
  compat: Coordinate.Compat<F>
) {
  const inCartesian = coordinateConversion(compat, cartesianCompat)(point);
  const el = document.getElementById("points").children[index];
  el.setAttribute("r", `${1}`);
  el.setAttribute("cx", `${inCartesian.x * 100}`);
  el.setAttribute("cy", `${-inCartesian.y * 100}`);
}

const MAX_DISTANCE = 5;

const tiling = new HyperbolicRegularTileGraph(4, 5);
tiling.addLevel();
tiling.addLevel();

function onNewOrigin(newOrigin: Coordinate.PoincareDisk) {
  tiling.render(
    (document.getElementById("polygons") as unknown) as SVGGElement,
    newOrigin
  );
}

function main(): void {
  setVh();
  window.addEventListener("resize", setVh);

  onNewOrigin(poincareDisk(0, 0));

  document.getElementById("app").addEventListener("mousemove", (details) => {
    const boundingRect = document
      .getElementById("renderer")
      .getBoundingClientRect();
    const px =
      ((details.clientX - boundingRect.x - 32) / (boundingRect.width - 64)) *
        100 -
      50;
    const py =
      ((details.clientY - boundingRect.y - 32) / (boundingRect.height - 64)) *
        100 -
      50;
    const coordMayOverflow = cartesianCompat.toPolar(cartesian(px, py));
    const pointInPolar: Coordinate.Polar = {
      ...coordMayOverflow,
      r: Math.min(coordMayOverflow.r, 35),
    };
    const pointInCartesian = cartesianCompat.fromPolar(pointInPolar);

    document
      .getElementById("inner-group")
      .setAttribute("x", `${pointInCartesian.x * 2 - 70}`);
    document
      .getElementById("inner-group")
      .setAttribute("y", `${pointInCartesian.y * 2 - 70}`);

    const newOrigin = poincareDisk(
      Math.min(MAX_DISTANCE, (pointInPolar.r / 35) * (MAX_DISTANCE + 1)),
      -pointInPolar.p
    );

    onNewOrigin(newOrigin);
  });
}

function setVh() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty("--vh", `${vh}px`);
}
