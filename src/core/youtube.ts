/**
 * YouTube URL parsing and canonicalisation.
 *
 * A phone opens the YouTube app when it sees a plain https YouTube link
 * (iOS Universal Links / Android App Links). So instead of app-only schemes
 * such as `vnd.youtube://`, every recognised YouTube URL is rewritten to one
 * canonical https form, which also falls back to the mobile site when the app
 * is not installed.
 */

/** `www` is the main YouTube app; `music` is YouTube Music. */
export type YouTubeSite = 'www' | 'music';

export type YouTubeLink =
  | {
      kind: 'video';
      site: YouTubeSite;
      id: string;
      /** Playlist the video is being watched in, if any. */
      list?: string;
      /** 1-based position in that playlist. */
      index?: number;
      /** Start offset in whole seconds, if the URL carried one. */
      start?: number;
    }
  | { kind: 'short'; id: string }
  | { kind: 'playlist'; site: YouTubeSite; list: string };

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const LIST_ID = /^[A-Za-z0-9_-]{2,}$/;

/** Path prefixes of the form `/<prefix>/<videoId>` that all mean "this video". */
const VIDEO_PATH_PREFIXES = new Set(['embed', 'v', 'live', 'e']);

function siteOf(hostname: string): YouTubeSite | 'short-link' | null {
  switch (hostname.toLowerCase()) {
    case 'youtube.com':
    case 'www.youtube.com':
    case 'm.youtube.com':
    case 'www.youtube-nocookie.com':
    case 'youtube-nocookie.com':
      return 'www';
    case 'music.youtube.com':
      return 'music';
    case 'youtu.be':
      return 'short-link';
    default:
      return null;
  }
}

/**
 * Parse a YouTube time value into whole seconds.
 * Accepts `90`, `90s`, `1m30s` and `1h2m3s`. Returns null for anything else.
 */
export function parseTimestamp(value: string | null | undefined): number | null {
  if (!value) return null;
  if (/^\d+$/.test(value)) return Number(value);
  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(value);
  if (!match || match[0] === '') return null;
  const [, h = '0', m = '0', s = '0'] = match;
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
}

function validList(value: string | null): string | undefined {
  return value && LIST_ID.test(value) ? value : undefined;
}

function validIndex(value: string | null): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const n = Number(value);
  return n > 0 ? n : undefined;
}

function videoLink(site: YouTubeSite, id: string, params: URLSearchParams): YouTubeLink | null {
  if (!VIDEO_ID.test(id)) return null;
  const link: YouTubeLink = { kind: 'video', site, id };
  const list = validList(params.get('list'));
  if (list) {
    link.list = list;
    const index = validIndex(params.get('index'));
    if (index) link.index = index;
  }
  const start = parseTimestamp(params.get('t') ?? params.get('start'));
  if (start) link.start = start;
  return link;
}

/**
 * Recognise a YouTube video, Short or playlist URL.
 * Returns null for non-YouTube URLs and for YouTube pages that have no
 * app-specific target (home, search, channels): those are shared unchanged.
 */
export function parseYouTube(input: string | URL): YouTubeLink | null {
  let url: URL;
  try {
    url = typeof input === 'string' ? new URL(input) : input;
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

  const site = siteOf(url.hostname);
  if (!site) return null;

  const params = url.searchParams;
  const segments = url.pathname.split('/').filter(Boolean);
  const [first, second] = segments;

  if (site === 'short-link') {
    return first ? videoLink('www', first, params) : null;
  }

  if (first === 'watch') {
    return videoLink(site, params.get('v') ?? '', params);
  }

  if (first === 'shorts' && second) {
    return VIDEO_ID.test(second) ? { kind: 'short', id: second } : null;
  }

  if (first === 'playlist') {
    const list = validList(params.get('list'));
    return list ? { kind: 'playlist', site, list } : null;
  }

  if (first && second && VIDEO_PATH_PREFIXES.has(first)) {
    // `/embed/videoseries?list=…` is an embedded playlist, not a video id.
    if (first === 'embed' && second === 'videoseries') {
      const list = validList(params.get('list'));
      return list ? { kind: 'playlist', site, list } : null;
    }
    return videoLink(site, second, params);
  }

  return null;
}

export interface BuildOptions {
  /**
   * Start the video at this many seconds. Overrides any start time found in
   * the original URL. Ignored for Shorts and playlists.
   */
  startSeconds?: number;
}

/** Build the canonical https URL a phone should open for this link. */
export function buildYouTubeUrl(link: YouTubeLink, options: BuildOptions = {}): string {
  if (link.kind === 'short') {
    return `https://www.youtube.com/shorts/${link.id}`;
  }

  const origin = `https://${link.site}.youtube.com`;

  if (link.kind === 'playlist') {
    return `${origin}/playlist?list=${link.list}`;
  }

  const params = new URLSearchParams({ v: link.id });
  if (link.list) {
    params.set('list', link.list);
    if (link.index) params.set('index', String(link.index));
  }
  const start = Math.floor(options.startSeconds ?? link.start ?? 0);
  if (Number.isFinite(start) && start > 0) params.set('t', `${start}s`);
  return `${origin}/watch?${params.toString()}`;
}
