/** Read QR codes out of PNG images, the way a phone camera would. */
import { PNG } from 'pngjs';
import type { Page } from '@playwright/test';
import { readQr } from '../test/readQr';

/** Text carried by the QR code in a PNG image, or null if none is readable. */
export function decodePng(png: Buffer): string | null {
  const { data, width, height } = PNG.sync.read(png);
  // Reduce red, green, blue, alpha to one brightness value per pixel.
  const luminance = new Uint8ClampedArray(width * height);
  for (let i = 0; i < luminance.length; i++) {
    luminance[i] = (data[i * 4]! + data[i * 4 + 1]! + data[i * 4 + 2]!) / 3;
  }
  return readQr(luminance, width, height);
}

/** Text carried by the QR code currently shown in the popup. */
export async function scanPopup(popup: Page): Promise<string | null> {
  return decodePng(await popup.getByRole('img', { name: /QR code for/ }).screenshot());
}
