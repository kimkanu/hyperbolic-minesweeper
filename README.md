# Hyperbolic Minesweeper (WIP)

## TODO

- Find a efficient and robust way to generate tiling
  + Pass the calculations to web workers with wasm
- Replace `(origin, lockedOrigin)` with `(preOrigin: Coord.PoinDisk, originTransform: (point: Coord.PoinDisk) => Coord.PoinDisk)`
- Replace a Mobius transformation with a class instance: this approach is better than the previous one on efficient calculations for composition and inversion
- Implement logic of minesweeper
- Add documentation (hopefully with some figures to describe how the renderer of the Poincare disk model is implemented)
