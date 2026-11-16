import { describe, expect, it } from 'vitest';
import { pngFileName } from './exportPng';

describe('pngFileName', () => {
  it.each([
    ['https://example.com/a/b?c=d', 'scanhop-example.com.png'],
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'scanhop-youtube.com.png'],
    ['http://localhost:3000/', 'scanhop-localhost.png'],
    ['http://[::1]:3000/', 'scanhop-___1_.png'],
    ['not a url', 'scanhop-qr.png'],
  ])('names the image for %s as %s', (url, fileName) => {
    expect(pngFileName(url)).toBe(fileName);
  });
});
