/** Read QR codes out of PNG images, the way a phone camera would. */
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import type { Page } from '@playwright/test';

/** Text carried by the QR code in a PNG image, or null if none is readable. */
export function decodePng(png: Buffer): string | null {
  const { data, width, height } = PNG.sync.read(png);
  return jsQR(new Uint8ClampedArray(data), width, height)?.data ?? null;
}

/** Text carried by the QR code currently shown in the popup. */
export async function scanPopup(popup: Page): Promise<string | null> {
  return decodePng(await popup.getByRole('img', { name: /QR code for/ }).screenshot());
}
