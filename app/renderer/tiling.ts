import { flow, pipe } from "fp-ts/lib/function";
import { range } from "~utils/array";
import { Cycle } from "~utils/cycle";
import { renderConsecutiveArcs, renderPoint } from "./arc";
import Coordinate, {
  poincareDisk,
  poincareDiskCompat,
  poincareDiskEq,
  polar,
} from "./coordinate-systems";
import {
  getReflection,
  getTranslation,
  poincareDiskMetric,
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

type VertexIndex = number;
type TileIndex = number;

export interface HyperbolicRegularTile {
  index: TileIndex;
  p: number;
  q: number;
  level: number; // starts from 0 (center)
  center: Coordinate.PoincareDisk;
  vertexIndices: Cycle<VertexIndex>; // .length === p
}
export interface HyperbolicRegularTileCrossing {
  ends: [TileIndex, TileIndex]; // smaller first
  edge: [VertexIndex, VertexIndex]; // smaller first
}
export class HyperbolicRegularTiling {
  static DISTANCE_RENDER_THRESHOLD = 5.5;
  static DISTANCE_BLUR_THRESHOLD = 2.5;

  tiles: HyperbolicRegularTile[] = [];
  crossings: HyperbolicRegularTileCrossing[] = [];
  vertices: Coordinate.PoincareDisk[] = [];

  constructor(public p: number, public q: number, public g: SVGGElement) {
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
    const vertexIndices = range(this.p);
    this.vertices = vertexIndices.map((i) =>
      poincareDiskCompat.fromPolar(
        polar(getTileOuterRadius(this.p, this.q), ((2 * Math.PI) / this.p) * i)
      )
    );
    const centerTile: HyperbolicRegularTile = {
      index: 0,
      p: this.p,
      q: this.q,
      level: 0,
      center: poincareDisk(0, 0),
      vertexIndices: new Cycle(vertexIndices),
    };
    this.addTile(centerTile);
  }

  private _getVertexIndex = (vertex: Coordinate.PoincareDisk) => {
    const indexFromHistory = this.vertices.findIndex((v) =>
      poincareDiskEq.equal(v, vertex)
    );
    if (indexFromHistory !== -1) return indexFromHistory;

    // `vertex` is now a brand-new vertex
    this.vertices.push(vertex);
    return this.vertices.length - 1;
  };

  addReflection(levelUp: boolean): boolean {
    const originalIndex = this.tiles.length - 1;
    const originalTile = this.tiles[originalIndex];
    const lineStartIndex = originalTile.vertexIndices.get(0);
    const lineEndIndex = originalTile.vertexIndices.get(1);
    const lineStart = this.vertices[lineStartIndex];
    const lineEnd = this.vertices[lineEndIndex];

    // do reflection
    const reflection = getReflection(
      poincareDiskCompat.toPolar(lineStart),
      poincareDiskCompat.toPolar(lineEnd)
    );

    const additionalVertices = originalTile.vertexIndices.inner
      .slice(2)
      .map(
        flow(
          (index) => this.vertices[index],
          poincareDiskCompat.toPolar,
          reflection,
          poincareDiskCompat.fromPolar
        )
      );

    const vertexIndices = new Cycle([
      lineStartIndex,
      lineEndIndex,
      ...additionalVertices.map(this._getVertexIndex),
    ]);

    // default crossing
    const crossing: HyperbolicRegularTileCrossing = {
      ends: [originalIndex, this.tiles.length],
      edge: [lineStartIndex, lineEndIndex],
    };
    this.crossings.push(crossing);
    vertexIndices.reverse(1);

    const newTile: HyperbolicRegularTile = {
      index: this.tiles.length,
      p: this.p,
      q: this.q,
      level: originalTile.level + (levelUp ? 1 : 0),
      center: pipe(
        originalTile.center,
        poincareDiskCompat.toPolar,
        reflection,
        poincareDiskCompat.fromPolar
      ),
      vertexIndices,
    };

    let isEndOfLevel = false;

    // while the edge 0-1 is already occupied by a tile
    while (true) {
      const prevTile: HyperbolicRegularTile | null =
        this.tiles
          .filter((tile) =>
            [newTile.level - 1, newTile.level].includes(tile.level)
          )
          .find(
            (tile) =>
              tile.vertexIndices.inner.includes(vertexIndices.get(0)) &&
              tile.vertexIndices.inner.includes(vertexIndices.get(1))
          ) ?? null;
      if (prevTile === null) {
        break;
      }

      if (prevTile.level === newTile.level) {
        isEndOfLevel = true;
      } else {
        // fine-tune the vertices
        const edge = [vertexIndices.get(0), vertexIndices.get(1)];
        const reversedPrevVertexIndices = new Cycle(
          prevTile.vertexIndices.reversed()
        );
        reversedPrevVertexIndices.rotate(
          reversedPrevVertexIndices.inner.indexOf(edge[1]) -
            newTile.vertexIndices.inner.indexOf(edge[1])
        );
        const reflection = getReflection(
          poincareDiskCompat.toPolar(this.vertices[edge[0]]),
          poincareDiskCompat.toPolar(this.vertices[edge[1]])
        );
        range(newTile.vertexIndices.length).forEach((i) => {
          if (
            reversedPrevVertexIndices.get(i) !== newTile.vertexIndices.get(i)
          ) {
            const reflectedVertex = pipe(
              this.vertices[reversedPrevVertexIndices.get(i)],
              poincareDiskCompat.toPolar,
              reflection,
              poincareDiskCompat.fromPolar
            );
            this.vertices[newTile.vertexIndices.get(i)] = reflectedVertex;
          }
        });
      }

      const crossing: HyperbolicRegularTileCrossing = {
        ends: [prevTile.index, newTile.index],
        edge: [vertexIndices.get(0), vertexIndices.get(1)],
      };
      this.crossings.push(crossing);
      vertexIndices.rotate(-1);
    }

    this.tiles.push(newTile);

    return isEndOfLevel;
  }

  get level() {
    return this.tiles.slice(-1)[0].level;
  }

  set level(level: number) {
    if (this.level <= level) {
      for (let l = this.level; l < level; l++) {
        this._addLevel();
      }
    } else {
      this.tiles = this.tiles.filter((tile) => tile.level <= level);
    }
  }

  private _addLevel() {
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

  render(origin: Coordinate.PoincareDisk) {
    this.createPaths(this.g);

    const transformation = getTranslation(origin, poincareDisk(0, 0));

    this.tiles.forEach((tile, i) => {
      const el = this.g.children.item(i);
      const distance = poincareDiskMetric(tile.center, origin);
      if (distance > HyperbolicRegularTiling.DISTANCE_RENDER_THRESHOLD) {
        el.setAttribute("style", "opacity: 0");
        return;
      } else if (distance > HyperbolicRegularTiling.DISTANCE_BLUR_THRESHOLD) {
        const opacity =
          (HyperbolicRegularTiling.DISTANCE_RENDER_THRESHOLD - distance) /
          (HyperbolicRegularTiling.DISTANCE_RENDER_THRESHOLD -
            HyperbolicRegularTiling.DISTANCE_BLUR_THRESHOLD);
        el.setAttribute("style", `opacity: ${opacity}`);
      } else {
        el.setAttribute("style", "opacity: 1");
      }
      el.setAttribute(
        "d",
        `M ${renderPoint(
          transformation(this.vertices[tile.vertexIndices.get(0)]),
          poincareDiskCompat,
          " "
        )}
        ${renderConsecutiveArcs(
          ...[...tile.vertexIndices.inner, tile.vertexIndices.get(0)]
            .map((i) => this.vertices[i])
            .map(transformation)
            .map(poincareDiskCompat.toPolar)
        )}`
      );
    });
  }
}
