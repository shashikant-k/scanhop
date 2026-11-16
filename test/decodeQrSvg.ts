/**
 * Test helper: read the text back out of a QR code rendered as SVG.
 *
 * It paints the SVG's squares onto a pixel grid and scans that, so tests
 * assert on what a phone would actually read rather than on what we asked the
 * QR library to draw.
 */
import { readQr } from './readQr';

/** Pixels per QR square. A few pixels each is plenty for the decoder. */
const SCALE = 4;

export function decodeQrSvg(svgMarkup: string): string | null {
  const viewBox = /viewBox="0 0 (\d+) (\d+)"/.exec(svgMarkup);
  // qrcode.react draws a white background path first, then one dark path.
  const darkPath = /<path fill="#000000" d="([^"]+)"/.exec(svgMarkup);
  if (!viewBox || !darkPath) return null;

  const side = Number(viewBox[1]) * SCALE;
  const pixels = new Uint8ClampedArray(side * side).fill(255);

  // Each run of dark squares is `M<x> <y>h<length>v1H<x>z`: one row, `length` wide.
  for (const run of darkPath[1]!.matchAll(/M(\d+)[ ,]+(\d+)\s*h(\d+)v1H\d+z/g)) {
    const x = Number(run[1]);
    const y = Number(run[2]);
    const length = Number(run[3]);
    for (let py = y * SCALE; py < (y + 1) * SCALE; py++) {
      pixels.fill(0, py * side + x * SCALE, py * side + (x + length) * SCALE);
    }
  }

  return readQr(pixels, side, side);
}
