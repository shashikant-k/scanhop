/**
 * Test helper: read the text back out of a QR code rendered as SVG.
 *
 * It paints the SVG's squares onto a pixel grid and hands that to jsQR, a QR
 * decoder. This lets tests assert on what a phone would actually scan rather
 * than on what we asked the QR library to draw.
 */
import jsQR from 'jsqr';

/** Pixels per QR square. A few pixels each is plenty for the decoder. */
const SCALE = 4;

export function decodeQrSvg(svgMarkup: string): string | null {
  const viewBox = /viewBox="0 0 (\d+) (\d+)"/.exec(svgMarkup);
  // qrcode.react draws a white background path first, then one dark path.
  const darkPath = /<path fill="#000000" d="([^"]+)"/.exec(svgMarkup);
  if (!viewBox || !darkPath) return null;

  const modules = Number(viewBox[1]);
  const side = modules * SCALE;
  const pixels = new Uint8ClampedArray(side * side * 4).fill(255);

  // Each run of dark squares is `M<x> <y>h<length>v1H<x>z`: one row, `length` wide.
  for (const run of darkPath[1]!.matchAll(/M(\d+)[ ,]+(\d+)\s*h(\d+)v1H\d+z/g)) {
    const x = Number(run[1]);
    const y = Number(run[2]);
    const length = Number(run[3]);
    for (let py = y * SCALE; py < (y + 1) * SCALE; py++) {
      for (let px = x * SCALE; px < (x + length) * SCALE; px++) {
        const i = (py * side + px) * 4;
        pixels[i] = pixels[i + 1] = pixels[i + 2] = 0;
      }
    }
  }

  return jsQR(pixels, side, side)?.data ?? null;
}
