/**
 * Right-click menu: "Show QR code for this page / this link".
 *
 * A browser cannot open the toolbar popup for an arbitrary link, so a menu
 * click opens the same popup page in a small window and tells it which
 * address to show through the page's query string (see `readShareRequest`).
 */
import { browser, type Browser } from 'wxt/browser';

export const MENU_PAGE = 'scanhop-page';
export const MENU_LINK = 'scanhop-link';

/** Size of the small window that shows the QR code. */
const WINDOW = { width: 360, height: 520 } as const;

/** What the popup page was asked to show, when opened from the menu. */
export interface ShareRequest {
  url: string;
  /** Tab the address came from, so the popup can read its video position. */
  tabId?: number;
}

/** Add the two menu entries. Call once, when the extension is installed or updated. */
export function registerContextMenus(): void {
  browser.contextMenus.create({
    id: MENU_PAGE,
    title: 'Show QR code for this page',
    contexts: ['page'],
  });
  browser.contextMenus.create({
    id: MENU_LINK,
    title: 'Show QR code for this link',
    contexts: ['link'],
  });
}

/** Address of the popup page, asked to show `request` instead of the active tab. */
export function popupUrlFor(request: ShareRequest): string {
  const params = new URLSearchParams({ url: request.url });
  if (request.tabId != null) params.set('tabId', String(request.tabId));
  return `${browser.runtime.getURL('/popup.html')}?${params.toString()}`;
}

/** Read a request back out of the popup page's query string. */
export function readShareRequest(search: string): ShareRequest | null {
  const params = new URLSearchParams(search);
  const url = params.get('url');
  if (!url) return null;
  const tabId = params.get('tabId') ?? '';
  return /^\d+$/.test(tabId) ? { url, tabId: Number(tabId) } : { url };
}

/** Open the QR window for whichever menu entry was clicked. */
export async function handleMenuClick(
  info: Browser.contextMenus.OnClickData,
  tab?: Browser.tabs.Tab,
): Promise<void> {
  let request: ShareRequest | null = null;

  if (info.menuItemId === MENU_LINK && info.linkUrl) {
    request = { url: info.linkUrl };
  } else if (info.menuItemId === MENU_PAGE) {
    const url = info.pageUrl ?? tab?.url;
    if (url) request = { url, tabId: tab?.id };
  }

  if (!request) return;
  await browser.windows.create({ url: popupUrlFor(request), type: 'popup', ...WINDOW });
}
