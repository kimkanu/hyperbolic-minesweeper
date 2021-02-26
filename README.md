# Hyperbolic Minesweeper (WIP)

## TODO

- https://stackoverflow.com/questions/18364175/best-practices-for-reducing-garbage-collector-activity-in-javascript
- Replace poorly-implemented complex number arithmetic
  + Maybe with num-complex in rust with help of wasm
- Change default control method to scrolling
  + It should be able to select pointer tracking method. It will be implemented soon in a similar way to codes commented out in `index.ts`
  + It could be better if the scrolling becomes smooth.
- Find a efficient and robust way to generate tiling
  + Pass the calculations to web workers with wasm
- Replace `(origin, lockedOrigin)` with `(preOrigin: Coord.PoinDisk, originTransform: (point: Coord.PoinDisk) => Coord.PoinDisk)`
- Implement logic of minesweeper
- Add documentation (hopefully with some figures to describe how the renderer of the Poincare disk model is implemented)
