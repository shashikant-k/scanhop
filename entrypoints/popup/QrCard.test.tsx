import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { QUIET_ZONE, planQr } from '@/src/core/qr';
import { decodeQrSvg } from '@/test/decodeQrSvg';
import { QrCard } from './QrCard';

/** An https URL that is exactly `bytes` long. */
function urlOfLength(bytes: number): string {
  const base = 'https://example.com/';
  return base + 'a'.repeat(bytes - base.length);
}

function render(url: string) {
  const plan = planQr(url);
  if (!plan.ok) throw new Error('URL does not fit in a QR code');
  const svg = renderToStaticMarkup(<QrCard url={url} level={plan.level} modules={plan.modules} />);
  return {
    plan,
    svg,
    /** Squares per side the QR library actually drew, including the border. */
    cells: Number(/viewBox="0 0 (\d+)/.exec(svg)![1]),
    width: Number(/width="(\d+)"/.exec(svg)![1]),
  };
}

describe('QrCard', () => {
  // Sizes either side of several version boundaries, at both correction levels.
  const lengths = [20, 26, 27, 62, 63, 150, 151, 154, 155, 367, 368, 1003, 1004, 2809, 2810, 2953];

  it.each(lengths)(
    'draws a %i-byte URL with whole-pixel squares, matching the planned size',
    (bytes) => {
      const url = urlOfLength(bytes);
      const { plan, cells, width, svg } = render(url);

      // The plan predicts the size the QR library chooses…
      expect(cells).toBe(plan.modules + 2 * QUIET_ZONE);
      // …so every square is a whole number of pixels wide.
      expect(Number.isInteger(width / cells)).toBe(true);
      expect(decodeQrSvg(svg)).toBe(url);
    },
  );
});
