import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import type { Browser } from 'wxt/browser';
import {
  MENU_LINK,
  MENU_PAGE,
  handleMenuClick,
  popupUrlFor,
  readShareRequest,
  registerContextMenus,
} from './contextMenu';

const POPUP = 'chrome-extension://test-extension-id/popup.html';

function click(info: Partial<Browser.contextMenus.OnClickData>, tab?: Partial<Browser.tabs.Tab>) {
  return handleMenuClick(info as Browser.contextMenus.OnClickData, tab as Browser.tabs.Tab);
}

beforeEach(() => {
  fakeBrowser.reset();
});

describe('registerContextMenus', () => {
  it('adds one entry for pages and one for links', () => {
    const create = vi.spyOn(fakeBrowser.contextMenus, 'create').mockReturnValue('');
    registerContextMenus();

    expect(create).toHaveBeenCalledTimes(2);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ id: MENU_PAGE, contexts: ['page'] }),
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ id: MENU_LINK, contexts: ['link'] }),
    );
  });
});

describe('popup address round trip', () => {
  it.each([
    [{ url: 'https://example.com/a?b=c&d=e#f' }],
    [{ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=83s', tabId: 42 }],
    [{ url: 'https://example.com/?q=hello world&x=%20', tabId: 0 }],
  ])('carries %j through the query string unchanged', (request) => {
    const address = popupUrlFor(request);

    expect(address.startsWith(`${POPUP}?`)).toBe(true);
    expect(readShareRequest(new URL(address).search)).toEqual(request);
  });
});

describe('readShareRequest', () => {
  it.each(['', '?', '?tabId=3', '?url='])('finds no request in %j', (search) => {
    expect(readShareRequest(search)).toBeNull();
  });

  it.each(['abc', '-1', '1.5', ''])('ignores a bad tab id %j', (tabId) => {
    expect(readShareRequest(`?url=https%3A%2F%2Fexample.com%2F&tabId=${tabId}`)).toEqual({
      url: 'https://example.com/',
    });
  });
});

describe('handleMenuClick', () => {
  it('opens a small window for the clicked link', async () => {
    const create = vi.spyOn(fakeBrowser.windows, 'create');
    await click(
      { menuItemId: MENU_LINK, linkUrl: 'https://example.com/linked', pageUrl: 'https://a.test/' },
      { id: 7 },
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'popup',
        url: popupUrlFor({ url: 'https://example.com/linked' }),
      }),
    );
  });

  it('opens a window for the page and remembers its tab', async () => {
    const create = vi.spyOn(fakeBrowser.windows, 'create');
    await click({ menuItemId: MENU_PAGE, pageUrl: 'https://example.com/page' }, { id: 7 });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ url: popupUrlFor({ url: 'https://example.com/page', tabId: 7 }) }),
    );
  });

  it('falls back to the tab address when the click has no page address', async () => {
    const create = vi.spyOn(fakeBrowser.windows, 'create');
    await click({ menuItemId: MENU_PAGE }, { id: 7, url: 'https://example.com/from-tab' });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        url: popupUrlFor({ url: 'https://example.com/from-tab', tabId: 7 }),
      }),
    );
  });

  it.each([
    ['an unknown menu entry', { menuItemId: 'something-else', pageUrl: 'https://example.com/' }],
    ['a link entry without a link', { menuItemId: MENU_LINK }],
    ['a page entry without any address', { menuItemId: MENU_PAGE }],
  ])('does nothing for %s', async (_case, info) => {
    const create = vi.spyOn(fakeBrowser.windows, 'create');
    await click(info);

    expect(create).not.toHaveBeenCalled();
  });
});
