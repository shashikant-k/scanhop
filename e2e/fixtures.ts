/**
 * Playwright setup shared by all end-to-end tests: a real Chromium with the
 * built extension loaded, and stand-in pages so tests never touch the internet.
 */
import {
  test as base,
  chromium,
  type BrowserContext,
  type Page,
  type Worker,
} from '@playwright/test';
import path from 'node:path';
import type { browser } from 'wxt/browser';

/** The extension API, as seen by code that runs inside the background worker. */
declare const chrome: typeof browser;

/** The test-only build made by `wxt build --mode e2e` (see wxt.config.ts). */
const EXTENSION_DIR = path.resolve(import.meta.dirname, '../.output/chrome-mv3-e2e');

/** Stand-in for a YouTube watch page: a player whose video is 83.4 seconds in. */
const FAKE_YOUTUBE_PAGE = `<!doctype html>
<title>Fake video</title>
<div id="movie_player"><video></video></div>
<script>
  // With no media loaded, the browser keeps this as the position to start from
  // and reports it back, which is all the extension reads.
  document.querySelector('video').currentTime = 83.4;
</script>`;

interface Fixtures {
  context: BrowserContext;
  /** The extension's background service worker. */
  background: Worker;
  /** Open the extension's popup page as a tab, optionally with a query string. */
  openPopup: (search?: string) => Promise<Page>;
  /** Open a web page in a tab and return the browser's id for that tab. */
  openTab: (url: string) => Promise<number>;
}

export const test = base.extend<Fixtures>({
  context: async ({ colorScheme }, use) => {
    // Extensions need a persistent profile, and Playwright's bundled Chromium:
    // branded Chrome no longer accepts --load-extension.
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      colorScheme,
      args: [`--disable-extensions-except=${EXTENSION_DIR}`, `--load-extension=${EXTENSION_DIR}`],
    });
    await context.route('https://www.youtube.com/**', (route) =>
      route.fulfill({ contentType: 'text/html', body: FAKE_YOUTUBE_PAGE }),
    );
    await context.route('https://example.com/**', (route) =>
      route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Example</title>' }),
    );
    await use(context);
    await context.close();
  },

  background: async ({ context }, use) => {
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
    await use(worker);
  },

  openPopup: async ({ context, background }, use) => {
    const extensionId = new URL(background.url()).host;
    await use(async (search = '') => {
      const page = await context.newPage();
      await page.goto(`chrome-extension://${extensionId}/popup.html${search}`);
      return page;
    });
  },

  openTab: async ({ context, background }, use) => {
    await use(async (url) => {
      const page = await context.newPage();
      await page.goto(url);
      const tabId = await background.evaluate(
        async (tabUrl) => (await chrome.tabs.query({ url: tabUrl }))[0]?.id,
        url,
      );
      if (tabId == null) throw new Error(`No tab found for ${url}`);
      return tabId;
    });
  },
});

export { expect } from '@playwright/test';
