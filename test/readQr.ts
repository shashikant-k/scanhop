/**
 * Test helper: read the text out of a picture of a QR code, the way a phone
 * camera would.
 *
 * Uses ZXing, the decoder behind many phone scanner apps. (jsQR was tried
 * first, but it cannot read version 23 codes, however sharp the picture.)
 */
import {
  BinaryBitmap,
  DecodeHintType,
  HybridBinarizer,
  QRCodeReader,
  RGBLuminanceSource,
} from '@zxing/library';

const HINTS = new Map([[DecodeHintType.TRY_HARDER, true]]);

/**
 * Decode a square-pixel greyscale image: one byte per pixel, 0 is black.
 * Returns null when no QR code can be read.
 */
export function readQr(luminance: Uint8ClampedArray, width: number, height: number): string | null {
  try {
    const bitmap = new BinaryBitmap(
      new HybridBinarizer(new RGBLuminanceSource(luminance, width, height)),
    );
    return new QRCodeReader().decode(bitmap, HINTS).getText();
  } catch {
    return null;
  }
}
