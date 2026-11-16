/**
 * Draws the ScanHop toolbar icon at every size the browsers ask for.
 *
 * The icon is a tiny QR-style glyph on a rounded blue tile. It is drawn from
 * code so it stays pixel-sharp at 16px and can be regenerated at any time:
 *
 *   npm run icons
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';

const SIZES = [16, 32, 48, 96, 128];
const OUT_DIR = new URL('../public/icon/', import.meta.url);

/** The design lives on a 16x16 grid; each cell is either tile or white. */
const GRID = 16;
const CORNER_RADIUS = 3.5;
const TILE = [26, 86, 219]; // #1a56db
const WHITE = [255, 255, 255];

/** A 5x5 QR "finder" square: white ring with a white centre dot. */
function finder(left, top) {
  const cells = [];
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      const onRing = x === 0 || y === 0 || x === 4 || y === 4;
      const isCentre = x === 2 && y === 2;
      if (onRing || isCentre) cells.push([left + x, top + y]);
    }
  }
  return cells;
}

const WHITE_CELLS = new Set(
  [
    ...finder(2, 2),
    ...finder(9, 2),
    ...finder(2, 9),
    // Loose "data" squares in the fourth corner.
    [9, 9],
    [10, 9],
    [13, 9],
    [11, 10],
    [12, 10],
    [9, 11],
    [12, 11],
    [13, 11],
    [10, 12],
    [9, 13],
    [11, 13],
    [13, 13],
  ].map(([x, y]) => `${x},${y}`),
);

/** Is this point (in grid units) inside the rounded tile? */
function insideTile(x, y) {
  const r = CORNER_RADIUS;
  const cx = Math.min(Math.max(x, r), GRID - r);
  const cy = Math.min(Math.max(y, r), GRID - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r ** 2;
}

function draw(size) {
  const png = new PNG({ width: size, height: size });
  const samples = 4; // 4x4 samples per pixel smooth the rounded corners

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let covered = 0;
      const sum = [0, 0, 0];
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const x = ((px + (sx + 0.5) / samples) / size) * GRID;
          const y = ((py + (sy + 0.5) / samples) / size) * GRID;
          if (!insideTile(x, y)) continue;
          covered++;
          const colour = WHITE_CELLS.has(`${Math.floor(x)},${Math.floor(y)}`) ? WHITE : TILE;
          for (let c = 0; c < 3; c++) sum[c] += colour[c];
        }
      }
      const i = (py * size + px) * 4;
      for (let c = 0; c < 3; c++) png.data[i + c] = covered ? Math.round(sum[c] / covered) : 0;
      png.data[i + 3] = Math.round((covered / samples ** 2) * 255);
    }
  }
  return PNG.sync.write(png);
}

mkdirSync(OUT_DIR, { recursive: true });
for (const size of SIZES) {
  writeFileSync(new URL(`${size}.png`, OUT_DIR), draw(size));
  console.log(`public/icon/${size}.png`);
}
