import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  DENSE_LIMIT_BYTES,
  MAX_QR_BYTES,
  MEDIUM_CORRECTION_LIMIT_BYTES,
  byteLength,
  planQr,
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

describe('planQr', () => {
  it('uses medium correction for a typical short URL', () => {
    expect(planQr('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=83s')).toEqual({
      ok: true,
      level: 'M',
      bytes: 49,
      dense: false,
    });
  });

  it('switches from medium to low correction just past the limit', () => {
    expect(planQr(urlOfLength(MEDIUM_CORRECTION_LIMIT_BYTES))).toMatchObject({ level: 'M' });
    expect(planQr(urlOfLength(MEDIUM_CORRECTION_LIMIT_BYTES + 1))).toMatchObject({ level: 'L' });
  });

  it('flags a code as dense just past the dense limit', () => {
    expect(planQr(urlOfLength(DENSE_LIMIT_BYTES))).toMatchObject({ ok: true, dense: false });
    expect(planQr(urlOfLength(DENSE_LIMIT_BYTES + 1))).toMatchObject({ ok: true, dense: true });
  });

  it('accepts a URL that exactly fills the largest QR code', () => {
    expect(planQr(urlOfLength(MAX_QR_BYTES.L))).toEqual({
      ok: true,
      level: 'L',
      bytes: MAX_QR_BYTES.L,
      dense: true,
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
