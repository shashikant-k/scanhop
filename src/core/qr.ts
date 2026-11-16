/**
 * QR code settings for a given URL.
 *
 * A QR code spends part of its area on error correction. More correction
 * survives glare and smudges but needs more (and therefore smaller) squares
 * for the same text. On a clean screen, small squares are the bigger risk, so
 * short URLs get medium correction and long URLs drop to low correction to
 * keep the squares as large as possible.
 */

/** `M` recovers about 15% damage, `L` about 7%. */
export type ErrorCorrectionLevel = 'M' | 'L';

/** Largest payload, in bytes, of the biggest QR code (version 40, byte mode). */
export const MAX_QR_BYTES: Record<ErrorCorrectionLevel, number> = { M: 2331, L: 2953 };

/** Up to this size a URL comfortably fits a small code at medium correction. */
export const MEDIUM_CORRECTION_LIMIT_BYTES = 150;

/** Above this size the code has so many squares that it is hard to scan. */
export const DENSE_LIMIT_BYTES = 1000;

export type QrPlan =
  | {
      ok: true;
      level: ErrorCorrectionLevel;
      /** Size of the URL once encoded as UTF-8. */
      bytes: number;
      /** True when the code will be dense enough to need a larger rendering. */
      dense: boolean;
    }
  | { ok: false; reason: 'too-long'; bytes: number; maxBytes: number };

const encoder = new TextEncoder();

/** Number of bytes the text occupies inside a QR code. */
export function byteLength(text: string): number {
  return encoder.encode(text).length;
}

/** Choose error correction for a URL, or report that it cannot fit in a QR code. */
export function planQr(url: string): QrPlan {
  const bytes = byteLength(url);

  if (bytes > MAX_QR_BYTES.L) {
    return { ok: false, reason: 'too-long', bytes, maxBytes: MAX_QR_BYTES.L };
  }

  return {
    ok: true,
    level: bytes <= MEDIUM_CORRECTION_LIMIT_BYTES ? 'M' : 'L',
    bytes,
    dense: bytes > DENSE_LIMIT_BYTES,
  };
}
