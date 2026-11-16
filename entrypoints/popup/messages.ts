/** All wording the popup shows for pages that can't, or might not, open on a phone. */
import type { TargetWarning, UnsupportedReason } from '@/src/core/target';

export interface Explanation {
  title: string;
  detail: string;
}

export const UNSUPPORTED: Record<UnsupportedReason, Explanation> = {
  empty: {
    title: 'Nothing to share yet',
    detail: 'This tab has no address. Open a website, then click ScanHop again.',
  },
  invalid: {
    title: 'Nothing to share',
    detail: 'This tab’s address is not a web address.',
  },
  'browser-page': {
    title: 'This is a browser page',
    detail:
      'Pages built into the browser, such as settings, extensions and the new tab page, exist only on this computer.',
  },
  'local-file': {
    title: 'This is a file on your computer',
    detail: 'Your phone can’t reach files stored on this computer.',
  },
  'unsupported-scheme': {
    title: 'This page can’t be opened on a phone',
    detail: 'Only addresses that start with http or https can be shared.',
  },
};

export const WARNINGS: Record<TargetWarning, string> = {
  'this-computer-only':
    'This address only works on this computer, so your phone won’t be able to open it. Use the computer’s network address instead of localhost.',
  'private-network':
    'This is a private network address. It will open only if your phone is on the same network.',
};
