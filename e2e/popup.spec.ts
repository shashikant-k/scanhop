import { readFile } from 'node:fs/promises';
import { decodePng, scanPopup } from './decode';
import { expect, test } from './fixtures';

const PAGE = 'https://example.com/article?id=42#top';
const VIDEO = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

/** Query string that asks the popup to show `url`, as the right-click menu does. */
function request(url: string, tabId?: number): string {
  const params = new URLSearchParams({ url });
  if (tabId != null) params.set('tabId', String(tabId));
  return `?${params.toString()}`;
}

test('the QR code on screen scans to the requested page', async ({ openPopup }) => {
  const popup = await openPopup(request(PAGE));

  await expect(popup.getByRole('heading')).toHaveText('Scan to open on your phone');
  expect(await scanPopup(popup)).toBe(PAGE);
});

test('a YouTube link is rewritten so the phone opens the app', async ({ openPopup }) => {
  const popup = await openPopup(request('https://youtu.be/dQw4w9WgXcQ?si=tracking'));

  await expect(popup.getByRole('heading')).toHaveText('Scan to open in the YouTube app');
  expect(await scanPopup(popup)).toBe(VIDEO);
});

test('a playing YouTube video starts at the current time, unless unticked', async ({
  openPopup,
  openTab,
}) => {
  const tabId = await openTab(VIDEO);
  const popup = await openPopup(request(VIDEO, tabId));

  const option = popup.getByRole('checkbox', { name: 'Start at 1:23' });
  await expect(option).toBeChecked();
  expect(await scanPopup(popup)).toBe(`${VIDEO}&t=83s`);

  await option.uncheck();
  expect(await scanPopup(popup)).toBe(VIDEO);
});

test('the popup reads the real active tab and explains a browser page', async ({ openPopup }) => {
  // Opened as a tab, the popup itself is the active tab: an extension page.
  const popup = await openPopup();

  await expect(popup.getByRole('heading')).toHaveText('This is a browser page');
  await expect(popup.getByRole('img')).toHaveCount(0);
});

test('a localhost address shows a warning under the QR code', async ({ openPopup }) => {
  const popup = await openPopup(request('http://localhost:3000/'));

  await expect(popup.getByRole('status')).toContainText('only works on this computer');
  expect(await scanPopup(popup)).toBe('http://localhost:3000/');
});

test('a long address still scans', async ({ openPopup }) => {
  const url = `https://example.com/?q=${'x'.repeat(1200)}`;
  const popup = await openPopup(request(url));

  expect(await scanPopup(popup)).toBe(url);
});

test.describe('in dark mode', () => {
  test.use({ colorScheme: 'dark' });

  test('the QR code stays black on white and scans', async ({ openPopup }) => {
    const popup = await openPopup(request(PAGE));

    expect(await scanPopup(popup)).toBe(PAGE);
    await expect(popup.locator('body')).toHaveCSS('background-color', 'rgb(32, 33, 36)');
  });
});

test('"Save QR image" downloads a PNG that scans to the same link', async ({ openPopup }) => {
  const popup = await openPopup(request(PAGE));

  const downloading = popup.waitForEvent('download');
  await popup.getByRole('button', { name: 'Save QR image' }).click();
  const download = await downloading;

  expect(download.suggestedFilename()).toBe('scanhop-example.com.png');
  expect(decodePng(await readFile(await download.path()))).toBe(PAGE);
  await expect(popup.getByText('Image saved')).toBeVisible();
});

test('"Copy link" puts the QR link on the clipboard', async ({ openPopup, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const popup = await openPopup(request('https://youtu.be/dQw4w9WgXcQ?si=tracking'));

  await popup.getByRole('button', { name: 'Copy link' }).click();

  await expect(popup.getByText('Link copied')).toBeVisible();
  expect(await popup.evaluate(() => navigator.clipboard.readText())).toBe(VIDEO);
});
