import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { buildYouTubeUrl, formatTimestamp, parseTimestamp, parseYouTube } from './youtube';

const ID = 'dQw4w9WgXcQ';
const LIST = 'PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf';

/** Parse then rebuild: what the QR code will contain for a given tab URL. */
function canonical(url: string, startSeconds?: number): string | null {
  const link = parseYouTube(url);
  return link ? buildYouTubeUrl(link, { startSeconds }) : null;
}

describe('parseTimestamp', () => {
  it.each([
    ['90', 90],
    ['90s', 90],
    ['1m30s', 90],
    ['2m', 120],
    ['1h2m3s', 3723],
    ['1h', 3600],
    ['0', 0],
  ])('reads %s as %i seconds', (input, seconds) => {
    expect(parseTimestamp(input)).toBe(seconds);
  });

  it.each(['', 'abc', '1x', '-5', '1.5', 's', null, undefined])('rejects %j', (input) => {
    expect(parseTimestamp(input)).toBeNull();
  });
});

describe('formatTimestamp', () => {
  it.each([
    [0, '0:00'],
    [5, '0:05'],
    [83, '1:23'],
    [83.9, '1:23'],
    [600, '10:00'],
    [3599, '59:59'],
    [3600, '1:00:00'],
    [3723, '1:02:03'],
    [-4, '0:00'],
  ])('shows %d seconds as %s', (seconds, text) => {
    expect(formatTimestamp(seconds)).toBe(text);
  });
});

describe('video URLs become one canonical watch URL', () => {
  const expected = `https://www.youtube.com/watch?v=${ID}`;

  it.each([
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtube.com/watch?v=${ID}`,
    `http://www.youtube.com/watch?v=${ID}`,
    `https://m.youtube.com/watch?v=${ID}`,
    `https://WWW.YOUTUBE.COM/watch?v=${ID}`,
    `https://youtu.be/${ID}`,
    `https://www.youtube.com/embed/${ID}`,
    `https://www.youtube-nocookie.com/embed/${ID}`,
    `https://www.youtube.com/v/${ID}`,
    `https://www.youtube.com/live/${ID}`,
    `https://www.youtube.com/watch?v=${ID}#comments`,
  ])('%s', (url) => {
    expect(canonical(url)).toBe(expected);
  });
});

describe('tracking parameters', () => {
  it.each([
    `https://youtu.be/${ID}?si=AbCdEf123`,
    `https://www.youtube.com/watch?v=${ID}&feature=share`,
    `https://www.youtube.com/watch?v=${ID}&pp=ygUEdGVzdA%3D%3D`,
    `https://www.youtube.com/watch?v=${ID}&ab_channel=Someone`,
    `https://www.youtube.com/watch?feature=youtu.be&v=${ID}&si=x&utm_source=y`,
  ])('are stripped from %s', (url) => {
    expect(canonical(url)).toBe(`https://www.youtube.com/watch?v=${ID}`);
  });
});

describe('start time', () => {
  it('keeps a start time already in the URL', () => {
    expect(canonical(`https://youtu.be/${ID}?t=1m30s`)).toBe(
      `https://www.youtube.com/watch?v=${ID}&t=90s`,
    );
  });

  it('reads the embed-style start parameter', () => {
    expect(canonical(`https://www.youtube.com/embed/${ID}?start=42`)).toBe(
      `https://www.youtube.com/watch?v=${ID}&t=42s`,
    );
  });

  it('lets the current playback time override the URL', () => {
    expect(canonical(`https://www.youtube.com/watch?v=${ID}&t=10s`, 75.9)).toBe(
      `https://www.youtube.com/watch?v=${ID}&t=75s`,
    );
  });

  it.each([0, 0.4, -3, Number.NaN, Number.POSITIVE_INFINITY])(
    'omits the parameter when the time is %d',
    (seconds) => {
      expect(canonical(`https://www.youtube.com/watch?v=${ID}`, seconds)).toBe(
        `https://www.youtube.com/watch?v=${ID}`,
      );
    },
  );

  it('ignores an unreadable time in the URL', () => {
    expect(canonical(`https://www.youtube.com/watch?v=${ID}&t=soon`)).toBe(
      `https://www.youtube.com/watch?v=${ID}`,
    );
  });
});

describe('playlists', () => {
  it('keeps the playlist and position on a watch URL', () => {
    expect(canonical(`https://www.youtube.com/watch?v=${ID}&list=${LIST}&index=3&si=x`)).toBe(
      `https://www.youtube.com/watch?v=${ID}&list=${LIST}&index=3`,
    );
  });

  it('drops an index that has no playlist', () => {
    expect(canonical(`https://www.youtube.com/watch?v=${ID}&index=3`)).toBe(
      `https://www.youtube.com/watch?v=${ID}`,
    );
  });

  it('canonicalises a playlist page', () => {
    expect(canonical(`https://m.youtube.com/playlist?list=${LIST}&feature=share`)).toBe(
      `https://www.youtube.com/playlist?list=${LIST}`,
    );
  });

  it('treats an embedded playlist as a playlist', () => {
    expect(canonical(`https://www.youtube.com/embed/videoseries?list=${LIST}`)).toBe(
      `https://www.youtube.com/playlist?list=${LIST}`,
    );
  });
});

describe('Shorts', () => {
  it('keeps the Shorts form so the app opens the Shorts player', () => {
    expect(canonical(`https://m.youtube.com/shorts/${ID}?feature=share`)).toBe(
      `https://www.youtube.com/shorts/${ID}`,
    );
  });

  it('never adds a start time to a Short', () => {
    expect(canonical(`https://www.youtube.com/shorts/${ID}`, 12)).toBe(
      `https://www.youtube.com/shorts/${ID}`,
    );
  });
});

describe('YouTube Music', () => {
  it('stays on the music host so it opens YouTube Music', () => {
    expect(canonical(`https://music.youtube.com/watch?v=${ID}&list=${LIST}&si=x`)).toBe(
      `https://music.youtube.com/watch?v=${ID}&list=${LIST}`,
    );
  });

  it('keeps music playlists on the music host', () => {
    expect(canonical(`https://music.youtube.com/playlist?list=${LIST}`)).toBe(
      `https://music.youtube.com/playlist?list=${LIST}`,
    );
  });
});

describe('URLs that are not a video, Short or playlist', () => {
  it.each([
    'https://www.youtube.com/',
    'https://www.youtube.com/results?search_query=cats',
    'https://www.youtube.com/@SomeChannel',
    'https://www.youtube.com/channel/UC1234567890',
    'https://www.youtube.com/watch',
    'https://www.youtube.com/watch?v=short',
    'https://www.youtube.com/watch?v=has%20spaces!',
    'https://www.youtube.com/shorts/',
    'https://www.youtube.com/playlist',
    'https://youtu.be/',
    'https://example.com/watch?v=dQw4w9WgXcQ',
    'https://notyoutube.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ',
    'ftp://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'chrome://extensions',
    'not a url',
    '',
  ])('returns null for %j', (url) => {
    expect(parseYouTube(url)).toBeNull();
  });
});

describe('properties', () => {
  const videoId = fc.stringMatching(/^[A-Za-z0-9_-]{11}$/);
  const noise = fc.dictionary(
    fc.constantFrom('si', 'feature', 'pp', 'ab_channel', 'utm_source', 'app'),
    fc.stringMatching(/^[A-Za-z0-9]{0,12}$/),
  );

  it('any watch URL for a valid id canonicalises to exactly that id', () => {
    fc.assert(
      fc.property(videoId, noise, fc.constantFrom('www.', 'm.', ''), (id, extra, sub) => {
        const params = new URLSearchParams({ ...extra, v: id });
        const url = `https://${sub}youtube.com/watch?${params.toString()}`;
        expect(canonical(url)).toBe(`https://www.youtube.com/watch?v=${id}`);
      }),
    );
  });

  it('canonical URLs are stable: parsing one gives the same URL back', () => {
    fc.assert(
      fc.property(videoId, fc.nat({ max: 86_400 }), (id, start) => {
        const once = canonical(`https://youtu.be/${id}`, start);
        expect(once).not.toBeNull();
        expect(canonical(once!)).toBe(once);
      }),
    );
  });

  it('never throws, whatever the input', () => {
    fc.assert(
      fc.property(fc.oneof(fc.string(), fc.webUrl({ withQueryParameters: true })), (input) => {
        expect(() => parseYouTube(input)).not.toThrow();
      }),
    );
  });
});
