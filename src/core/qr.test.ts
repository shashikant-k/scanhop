import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  MAX_QR_BYTES,
  MEDIUM_CORRECTION_LIMIT_BYTES,
  QUIET_ZONE,
  byteLength,
  planQr,
  qrPixelSize,
  qrVersion,
} from './qr';

/** An https URL that is exactly `bytes` long. */
function urlOfLength(bytes: number): string {
  const base = 'https://example.com/';
  return base + 'a'.repeat(bytes - base.length);
}

describe('byteLength', () => {
  it('counts ASCII as one byte per character', () => {
    expect(byteLength('https://example.com/')).toBe(20);
  });

  it('counts non-ASCII characters by their UTF-8 size', () => {
    expect(byteLength('é')).toBe(2);
    expect(byteLength('日本')).toBe(6);
    expect(byteLength('🎬')).toBe(4);
  });
});

describe('qrVersion', () => {
  it.each([
    [1, 'M', 1],
    [14, 'M', 1],
    [15, 'M', 2],
    [49, 'M', 4],
    [17, 'L', 1],
    [18, 'L', 2],
    [2953, 'L', 40],
    [2331, 'M', 40],
  ] as const)('%i bytes at level %s need version %i', (bytes, level, version) => {
    expect(qrVersion(bytes, level)).toBe(version);
  });

  it('returns null when nothing is big enough', () => {
    expect(qrVersion(2954, 'L')).toBeNull();
    expect(qrVersion(2332, 'M')).toBeNull();
  });
});

describe('planQr', () => {
  it('uses medium correction for a typical short URL', () => {
    expect(planQr('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=83s')).toEqual({
      ok: true,
      level: 'M',
      bytes: 49,
      modules: 33, // version 4
    });
  });

  it('switches from medium to low correction just past the limit', () => {
    expect(planQr(urlOfLength(MEDIUM_CORRECTION_LIMIT_BYTES))).toMatchObject({ level: 'M' });
    expect(planQr(urlOfLength(MEDIUM_CORRECTION_LIMIT_BYTES + 1))).toMatchObject({ level: 'L' });
  });

  it('accepts a URL that exactly fills the largest QR code', () => {
    expect(planQr(urlOfLength(MAX_QR_BYTES.L))).toEqual({
      ok: true,
      level: 'L',
      bytes: MAX_QR_BYTES.L,
      modules: 177,
    });
  });

  it('rejects a URL one byte too long', () => {
    expect(planQr(urlOfLength(MAX_QR_BYTES.L + 1))).toEqual({
      ok: false,
      reason: 'too-long',
      bytes: MAX_QR_BYTES.L + 1,
      maxBytes: MAX_QR_BYTES.L,
    });
  });

  it('measures bytes, not characters', () => {
    const url = 'https://example.com/' + '日'.repeat(50);
    expect(url.length).toBe(70);
    expect(planQr(url)).toMatchObject({ bytes: 170, level: 'L' });
  });

  it('never plans more data than the chosen level can hold', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 4000 }), (text) => {
        const plan = planQr(text);
        if (plan.ok) {
          expect(plan.bytes).toBeLessThanOrEqual(MAX_QR_BYTES[plan.level]);
        } else {
          expect(plan.bytes).toBeGreaterThan(plan.maxBytes);
        }
      }),
    );
  });
});

describe('qrPixelSize', () => {
  it.each([
    [21, 232], // version 1: 29 cells x 8px
    [33, 205], // version 4: 41 cells x 5px
    [117, 375], // version 25: 125 cells x 3px
    [141, 447], // version 31: 149 cells x 3px, the largest that fits at 3px
    [145, 306], // version 32: 153 cells x 2px
    [177, 370], // version 40: 185 cells x 2px
  ])('draws a code with %i squares per side %ipx wide', (modules, pixels) => {
    expect(qrPixelSize(modules)).toBe(pixels);
  });

  it('always gives every square the same whole number of pixels', () => {
    for (let version = 1; version <= 40; version++) {
      const modules = 17 + 4 * version;
      const square = qrPixelSize(modules) / (modules + 2 * QUIET_ZONE);

      expect(Number.isInteger(square)).toBe(true);
      expect(square).toBeGreaterThanOrEqual(2);
    }
  });
});
