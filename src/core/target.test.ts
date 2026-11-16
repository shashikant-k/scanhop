import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { networkWarning, resolveTarget } from './target';

describe('ordinary web pages', () => {
  it.each([
    'https://example.com/',
    'https://example.com/a/b?x=1&utm_source=mail#section',
    'http://example.com:8080/path',
    'https://xn--bcher-kva.example/',
    'https://example.com/search?q=hello%20world',
  ])('passes %s through unchanged', (url) => {
    expect(resolveTarget(url)).toEqual({ kind: 'web', url, warnings: [] });
  });

  it('trims surrounding whitespace', () => {
    expect(resolveTarget('  https://example.com/  ')).toEqual({
      kind: 'web',
      url: 'https://example.com/',
      warnings: [],
    });
  });

  it('ignores the playback time for non-YouTube pages', () => {
    expect(resolveTarget('https://vimeo.com/12345', { startSeconds: 30 })).toEqual({
      kind: 'web',
      url: 'https://vimeo.com/12345',
      warnings: [],
    });
  });
});

describe('YouTube pages', () => {
  it('canonicalises a video and reports it as youtube', () => {
    const target = resolveTarget('https://youtu.be/dQw4w9WgXcQ?si=abc');
    expect(target).toMatchObject({
      kind: 'youtube',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      link: { kind: 'video', id: 'dQw4w9WgXcQ' },
    });
  });

  it('adds the current playback time', () => {
    const target = resolveTarget('https://www.youtube.com/watch?v=dQw4w9WgXcQ', {
      startSeconds: 83.7,
    });
    expect(target).toMatchObject({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=83s' });
  });

  it('shares non-video YouTube pages as ordinary web pages', () => {
    const url = 'https://www.youtube.com/results?search_query=cats';
    expect(resolveTarget(url)).toEqual({ kind: 'web', url, warnings: [] });
  });
});

describe('pages a phone cannot open', () => {
  it.each([
    ['', 'empty'],
    ['   ', 'empty'],
    [null, 'empty'],
    [undefined, 'empty'],
    ['not a url', 'invalid'],
    ['example.com', 'invalid'],
    ['chrome://extensions/', 'browser-page'],
    ['chrome://newtab/', 'browser-page'],
    ['edge://settings', 'browser-page'],
    ['about:blank', 'browser-page'],
    ['about:config', 'browser-page'],
    ['chrome-extension://abcdefghijklmnop/popup.html', 'browser-page'],
    ['moz-extension://1234-5678/popup.html', 'browser-page'],
    ['view-source:https://example.com', 'browser-page'],
    ['devtools://devtools/bundled/inspector.html', 'browser-page'],
    ['file:///Users/me/notes.html', 'local-file'],
    ['data:text/html,<h1>hi</h1>', 'unsupported-scheme'],
    ['blob:https://example.com/1234', 'unsupported-scheme'],
    ['javascript:alert(1)', 'unsupported-scheme'],
    ['ftp://example.com/file', 'unsupported-scheme'],
  ])('%j is unsupported: %s', (url, reason) => {
    expect(resolveTarget(url)).toEqual({ kind: 'unsupported', reason });
  });
});

describe('addresses the phone may not reach', () => {
  it.each([
    ['http://localhost:3000/', 'this-computer-only'],
    ['http://app.localhost:5173/', 'this-computer-only'],
    ['http://127.0.0.1:8080/', 'this-computer-only'],
    ['http://127.1.2.3/', 'this-computer-only'],
    ['http://0.0.0.0:4000/', 'this-computer-only'],
    ['http://[::1]:3000/', 'this-computer-only'],
    ['http://192.168.1.20:3000/', 'private-network'],
    ['http://10.0.0.5/', 'private-network'],
    ['http://172.16.0.1/', 'private-network'],
    ['http://172.31.255.254/', 'private-network'],
    ['http://169.254.10.10/', 'private-network'],
    ['http://printer.local/', 'private-network'],
    ['http://[fd12:3456::1]/', 'private-network'],
    ['http://[fe80::1]/', 'private-network'],
  ])('%s still gets a QR, with warning %s', (url, warning) => {
    expect(resolveTarget(url)).toEqual({ kind: 'web', url, warnings: [warning] });
  });

  it.each([
    'example.com',
    'localhost.example.com',
    'mylocalhost',
    '8.8.8.8',
    '172.15.0.1',
    '172.32.0.1',
    '192.169.1.1',
    '11.0.0.1',
    '999.1.1.1',
    '[2001:db8::1]',
  ])('%s is treated as publicly reachable', (hostname) => {
    expect(networkWarning(hostname)).toBeNull();
  });
});

describe('properties', () => {
  it('never throws, whatever the input', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        expect(() => resolveTarget(input)).not.toThrow();
      }),
    );
  });

  it('every http(s) URL produces a QR target that is itself a valid http(s) URL', () => {
    fc.assert(
      fc.property(
        fc.webUrl({ withQueryParameters: true, withFragments: true }),
        fc.option(fc.nat({ max: 86_400 }), { nil: undefined }),
        (input, startSeconds) => {
          const target = resolveTarget(input, { startSeconds });
          expect(target.kind).not.toBe('unsupported');
          if (target.kind === 'unsupported') return;
          expect(['http:', 'https:']).toContain(new URL(target.url).protocol);
        },
      ),
    );
  });

  it('non-YouTube URLs come out exactly as they went in', () => {
    fc.assert(
      fc.property(fc.webUrl({ withQueryParameters: true, withFragments: true }), (input) => {
        const target = resolveTarget(input);
        fc.pre(target.kind === 'web');
        expect(target).toMatchObject({ url: input });
      }),
    );
  });
});
