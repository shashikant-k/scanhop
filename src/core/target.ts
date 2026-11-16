/**
 * Decide what a QR code for a given tab URL should contain.
 *
 * This is the single decision point of the extension: the popup hands it the
 * tab's URL and renders whatever comes back.
 */
import { buildYouTubeUrl, parseYouTube, type YouTubeLink } from './youtube';

/** Why a page cannot be opened on a phone at all. */
export type UnsupportedReason =
  /** No URL (for example a blank new tab). */
  | 'empty'
  /** Not a parseable URL. */
  | 'invalid'
  /** Browser-internal page such as chrome://settings or about:config. */
  | 'browser-page'
  /** A file on this computer's disk. */
  | 'local-file'
  /** Any other scheme a phone browser cannot open (data:, blob:, …). */
  | 'unsupported-scheme';

/** The page can be shared, but may not load on the phone. */
export type TargetWarning =
  /** localhost / 127.0.0.1: only this computer can reach it. */
  | 'this-computer-only'
  /** Private network address: the phone must be on the same network. */
  | 'private-network';

export type ShareTarget =
  | { kind: 'web'; url: string; warnings: TargetWarning[] }
  | { kind: 'youtube'; url: string; link: YouTubeLink; warnings: TargetWarning[] }
  | { kind: 'unsupported'; reason: UnsupportedReason };

export interface ResolveOptions {
  /** Current playback position, used as the start time for YouTube videos. */
  startSeconds?: number;
}

const BROWSER_SCHEMES = new Set([
  'about:',
  'chrome:',
  'chrome-extension:',
  'chrome-search:',
  'chrome-untrusted:',
  'devtools:',
  'edge:',
  'extension:',
  'moz-extension:',
  'resource:',
  'view-source:',
]);

function ipv4Octets(hostname: string): number[] | null {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(hostname);
  if (!match) return null;
  const octets = match.slice(1).map(Number);
  return octets.every((o) => o <= 255) ? octets : null;
}

/** Classify a hostname by who can reach it. Exported for tests. */
export function networkWarning(hostname: string): TargetWarning | null {
  const host = hostname.toLowerCase().replace(/\.$/, '');

  if (host === 'localhost' || host.endsWith('.localhost')) return 'this-computer-only';
  if (host.endsWith('.local') || host.endsWith('.internal')) return 'private-network';

  if (host.startsWith('[') && host.endsWith(']')) {
    const v6 = host.slice(1, -1);
    if (v6 === '::1' || v6 === '::') return 'this-computer-only';
    // fc00::/7 (unique local) and fe80::/10 (link local)
    if (/^f[cd][0-9a-f]{2}:/.test(v6) || /^fe[89ab][0-9a-f]:/.test(v6)) return 'private-network';
    return null;
  }

  const octets = ipv4Octets(host);
  if (!octets) return null;
  const [a = 0, b = 0] = octets;
  if (a === 127 || a === 0) return 'this-computer-only';
  if (a === 10) return 'private-network';
  if (a === 192 && b === 168) return 'private-network';
  if (a === 172 && b >= 16 && b <= 31) return 'private-network';
  if (a === 169 && b === 254) return 'private-network';
  return null;
}

/**
 * Turn a tab URL into the thing the QR code should carry.
 *
 * - YouTube videos, Shorts and playlists are rewritten to their canonical
 *   https form so the phone opens them in the YouTube app.
 * - Every other http(s) URL is returned exactly as given.
 * - Pages a phone cannot open are reported as `unsupported` with a reason.
 */
export function resolveTarget(
  rawUrl: string | null | undefined,
  options: ResolveOptions = {},
): ShareTarget {
  const input = rawUrl?.trim();
  if (!input) return { kind: 'unsupported', reason: 'empty' };

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { kind: 'unsupported', reason: 'invalid' };
  }

  if (BROWSER_SCHEMES.has(url.protocol)) return { kind: 'unsupported', reason: 'browser-page' };
  if (url.protocol === 'file:') return { kind: 'unsupported', reason: 'local-file' };
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { kind: 'unsupported', reason: 'unsupported-scheme' };
  }

  const link = parseYouTube(url);
  if (link) {
    return {
      kind: 'youtube',
      url: buildYouTubeUrl(link, { startSeconds: options.startSeconds }),
      link,
      warnings: [],
    };
  }

  const warning = networkWarning(url.hostname);
  return { kind: 'web', url: input, warnings: warning ? [warning] : [] };
}
