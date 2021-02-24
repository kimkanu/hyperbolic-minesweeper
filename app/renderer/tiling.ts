import { flow } from "fp-ts/lib/function";
import { Cycle } from "~utils/cycle";
import { renderConsecutiveArcs, renderPoint } from "./arc";
import Coordinate, {
  poincareDisk,
  poincareDiskCompat,
  PoincareDiskCoordinate,
  poincareDiskEq,
  polar,
} from "./coordinate-systems";
import {
  geodesicReflection,
  mobiusTranslation,
  polarRadiusToPoincareRadius,
} from "./poincare-disk";

export function getTileOuterRadius(p: number, q: number) {
  const t1 = Math.tan(Math.PI / 2 - Math.PI / q);
  const t2 = Math.tan(Math.PI / p);
  return Math.sqrt((t1 - t2) / (t1 + t2));
}

export function getTileInnerRadius(p: number, q: number) {
  const d = getTileOuterRadius(p, q);
  const gamma = Math.PI / 2 - Math.PI / q;
  const h = Math.tan(gamma) * ((d + 1 / d) / 2 - d);
  return polarRadiusToPoincareRadius(
    Math.hypot(d + h / Math.tan(gamma), h) - h / Math.cos(gamma)
  );
}

export function poincareDistanceBetweenAdjacentTiles(p: number, q: number) {
  return 2 * getTileInnerRadius(p, q);
}

export interface HyperbolicRegularTile {
  p: number;
  q: number;
  level: number; // starts from 0 (center)
  center: PoincareDiskCoordinate;
  vertices: Cycle<PoincareDiskCoordinate>; // .length === p
}
export interface HyperbolicRegularTileCrossing {
  ends: [number, number]; // smaller first
  crossingEdge: [PoincareDiskCoordinate, PoincareDiskCoordinate]; // smaller first
}
export class HyperbolicRegularTileGraph {
  tiles: HyperbolicRegularTile[] = [];

  crossings: HyperbolicRegularTileCrossing[] = [];

  constructor(public p: number, public q: number) {
    this._addCenterTile();
  }

  getTile(index: number): HyperbolicRegularTile | null {
    return this.tiles[index] ?? null;
  }

  addTile(tile: HyperbolicRegularTile): boolean {
    if (this.tiles.some((t) => poincareDiskEq.equal(t.center, tile.center))) {
      return false;
    }

    this.tiles.push(tile);
    return true;
  }

  private _addCenterTile() {
    const centerTile: HyperbolicRegularTile = {
      p: this.p,
      q: this.q,
      level: 0,
      center: poincareDisk(0, 0),
      vertices: new Cycle(
        Array(this.p)
          .fill(0)
          .map((x, i) =>
            poincareDiskCompat.fromPolar(
              polar(
                getTileOuterRadius(this.p, this.q),
                ((2 * Math.PI) / this.p) * i
              )
            )
          )
      ),
    };
    this.addTile(centerTile);
  }

  addReflection(levelUp: boolean): boolean {
    const originalIndex = this.tiles.length - 1;
    const originalTile = this.tiles[originalIndex];
    const lineStart = originalTile.vertices.get(0);
    const lineEnd = originalTile.vertices.get(1);

    // do reflection
    const reflection = geodesicReflection(
      poincareDiskCompat.toPolar(lineStart),
      poincareDiskCompat.toPolar(lineEnd)
    );
    const vertices = new Cycle([
      lineStart,
      lineEnd,
      ...originalTile.vertices.inner
        .slice(2)
        .map(
          flow(
            poincareDiskCompat.toPolar,
            reflection,
            poincareDiskCompat.fromPolar
          )
        ),
    ]);

    // default crossing
    const crossing: HyperbolicRegularTileCrossing = {
      ends: [originalIndex, this.tiles.length],
      crossingEdge: [vertices.get(0), vertices.get(1)],
    };
    this.crossings.push(crossing);
    vertices.reverse(1);

    const newTile: HyperbolicRegularTile = {
      p: this.p,
      q: this.q,
      level: originalTile.level + (levelUp ? 1 : 0),
      center: flow(
        poincareDiskCompat.toPolar,
        reflection,
        poincareDiskCompat.fromPolar
      )(originalTile.center),
      vertices,
    };

    let flag = false;

    // while the edge 0-1 is already occupied by a tile
    while (true) {
      const tile: HyperbolicRegularTile | null =
        this.tiles
          .filter((tile) =>
            [newTile.level - 1, newTile.level].includes(tile.level)
          )
          .find(
            (tile) =>
              tile.vertices.inner.some((v) =>
                poincareDiskEq.equal(v, vertices.get(0))
              ) &&
              tile.vertices.inner.some((v) =>
                poincareDiskEq.equal(v, vertices.get(1))
              )
          ) ?? null;
      if (tile === null) {
        break;
      }

      if (tile.level === newTile.level) {
        flag = true;
      }

      const crossing: HyperbolicRegularTileCrossing = {
        ends: [originalIndex, this.tiles.length],
        crossingEdge: [vertices.get(0), vertices.get(1)],
      };
      this.crossings.push(crossing);
      vertices.rotate(-1);
    }

    this.tiles.push(newTile);

    return flag;
  }

  get level() {
    return this.tiles.slice(-1)[0].level;
  }

  addLevel() {
    let start = true;
    let finish = false;
    while (!finish) {
      finish = this.addReflection(start);
      if (start) {
        start = false;
      }
    }
  }

  createPaths(dom: SVGGElement) {
    this.tiles.forEach((tile, i) => {
      if (i < dom.children.length) return;

      const xmlns = "http://www.w3.org/2000/svg";
      const el = document.createElementNS(xmlns, "path");
      el.setAttribute("fill", "transparent");
      el.setAttribute("stroke", "grey");
      el.setAttribute("stroke-width", "1pt");
      el.setAttribute("vector-effect", "non-scaling-stroke");

      dom.appendChild(el);

      el.addEventListener("click", () => {
        console.log(i);
      });
    });
  }

  render(dom: SVGGElement, origin: Coordinate.PoincareDisk) {
    this.createPaths(dom);

    const transformationPolar = flow(
      poincareDiskCompat.toPolar,
      mobiusTranslation(poincareDiskCompat.toPolar(origin), polar(0, 0))
    );
    const transformation = flow(
      transformationPolar,
      poincareDiskCompat.fromPolar
    );

    this.tiles.forEach((tile, i) => {
      const el = dom.children.item(i);
      el.setAttribute(
        "d",
        `M ${renderPoint(
          transformation(tile.vertices.get(0)),
          poincareDiskCompat,
          " "
        )}
        ${renderConsecutiveArcs(
          ...tile.vertices.inner.map(transformationPolar),
          transformationPolar(tile.vertices.get(0))
        )}`
      );
    });
  }
}
