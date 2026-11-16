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

/**
 * How many bytes each QR "version" (size) holds in byte mode, from the QR
 * standard. Index 0 is version 1 (21x21 squares), index 39 is version 40
 * (177x177 squares).
 */
const BYTE_CAPACITY: Record<ErrorCorrectionLevel, readonly number[]> = {
  L: [
    17, 32, 53, 78, 106, 134, 154, 192, 230, 271, 321, 367, 425, 458, 520, 586, 644, 718, 792, 858,
    929, 1003, 1091, 1171, 1273, 1367, 1465, 1528, 1628, 1732, 1840, 1952, 2068, 2188, 2303, 2431,
    2563, 2699, 2809, 2953,
  ],
  M: [
    14, 26, 42, 62, 84, 106, 122, 152, 180, 213, 251, 287, 331, 362, 412, 450, 504, 560, 624, 666,
    711, 779, 857, 911, 997, 1059, 1125, 1190, 1264, 1370, 1452, 1538, 1628, 1722, 1809, 1911, 1989,
    2099, 2213, 2331,
  ],
};

/** Largest payload, in bytes, of the biggest QR code (version 40). */
export const MAX_QR_BYTES: Record<ErrorCorrectionLevel, number> = {
  M: BYTE_CAPACITY.M.at(-1)!,
  L: BYTE_CAPACITY.L.at(-1)!,
};

/** Up to this size a URL comfortably fits a small code at medium correction. */
export const MEDIUM_CORRECTION_LIMIT_BYTES = 150;

export type QrPlan =
  | {
      ok: true;
      level: ErrorCorrectionLevel;
      /** Size of the URL once encoded as UTF-8. */
      bytes: number;
      /** Squares along one side of the code, not counting the blank border. */
      modules: number;
    }
  | { ok: false; reason: 'too-long'; bytes: number; maxBytes: number };

const encoder = new TextEncoder();

/** Number of bytes the text occupies inside a QR code. */
export function byteLength(text: string): number {
  return encoder.encode(text).length;
}

/** Smallest QR version (1 to 40) that holds this many bytes, or null if none does. */
export function qrVersion(bytes: number, level: ErrorCorrectionLevel): number | null {
  const index = BYTE_CAPACITY[level].findIndex((capacity) => bytes <= capacity);
  return index === -1 ? null : index + 1;
}

/** Choose error correction for a URL, or report that it cannot fit in a QR code. */
export function planQr(url: string): QrPlan {
  const bytes = byteLength(url);
  const level: ErrorCorrectionLevel = bytes <= MEDIUM_CORRECTION_LIMIT_BYTES ? 'M' : 'L';
  const version = qrVersion(bytes, level);

  if (version === null) {
    return { ok: false, reason: 'too-long', bytes, maxBytes: MAX_QR_BYTES.L };
  }

  return { ok: true, level, bytes, modules: 17 + 4 * version };
}

/** Blank border around the code, in squares. Scanners need at least 4. */
export const QUIET_ZONE = 4;

/** Normal on-screen width of the code, in pixels. */
const PREFERRED_SIZE = 240;
/** A crowded code may grow up to this width to keep its squares readable. */
const MAX_SIZE = 450;
/** Squares smaller than this are hard for a phone to read off a screen. */
const COMFORTABLE_SQUARE = 3;
const SMALLEST_SQUARE = 2;

/**
 * On-screen width of the code, in pixels.
 *
 * Every square is drawn a whole number of pixels wide. A fractional width
 * would make neighbouring squares differ in size, which blurs the code and
 * can stop it scanning.
 */
export function qrPixelSize(modules: number): number {
  const cells = modules + 2 * QUIET_ZONE;
  const fitsComfortably = cells * COMFORTABLE_SQUARE <= MAX_SIZE;
  const square = Math.max(
    Math.floor(PREFERRED_SIZE / cells),
    fitsComfortably ? COMFORTABLE_SQUARE : SMALLEST_SQUARE,
  );
  return cells * square;
}
