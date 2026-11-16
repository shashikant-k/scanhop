// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { decodeQrSvg } from '@/test/decodeQrSvg';
import { App } from './App';

/** Pretend the user opened the popup on a tab showing `url`. */
function openOnTab(url: string | undefined) {
  // `tabs.query` has a callback overload that confuses the mock's types.
  vi.spyOn(fakeBrowser.tabs, 'query').mockResolvedValue([
    { id: 1, url, title: 'Test page' },
  ] as never);
}

/** Pretend the tab's video is `seconds` into playback (null: no video found). */
function videoIsAt(seconds: number | null) {
  return vi
    .spyOn(fakeBrowser.scripting, 'executeScript')
    .mockResolvedValue([{ result: seconds }] as never);
}

/** What a phone would read from the QR code currently on screen. */
async function scannedText(): Promise<string | null> {
  const svg = await screen.findByRole('img', { name: /QR code for/ });
  return decodeQrSvg(svg.outerHTML);
}

beforeEach(() => {
  fakeBrowser.reset();
  videoIsAt(null);
});

afterEach(cleanup);

describe('popup', () => {
  it('shows a QR code that scans to the tab URL', async () => {
    openOnTab('https://example.com/article?id=42#top');
    render(<App />);

    expect(await scannedText()).toBe('https://example.com/article?id=42#top');
    expect(screen.getByRole('heading')).toHaveProperty('textContent', 'Scan to open on your phone');
    expect(screen.getByText('https://example.com/article?id=42#top')).toBeTruthy();
  });

  it('asks only for the active tab of the current window', async () => {
    openOnTab('https://example.com/');
    render(<App />);
    await scannedText();

    expect(fakeBrowser.tabs.query).toHaveBeenCalledWith({ active: true, currentWindow: true });
  });

  it('encodes the canonical YouTube URL so the phone opens the app', async () => {
    openOnTab('https://youtu.be/dQw4w9WgXcQ?si=tracking');
    render(<App />);

    expect(await scannedText()).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(screen.getByRole('heading')).toHaveProperty(
      'textContent',
      'Scan to open in the YouTube app',
    );
  });

  it('names YouTube Music for music links', async () => {
    openOnTab('https://music.youtube.com/watch?v=dQw4w9WgXcQ');
    render(<App />);

    expect(await scannedText()).toBe('https://music.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(screen.getByRole('heading')).toHaveProperty(
      'textContent',
      'Scan to open in YouTube Music',
    );
  });

  it('still scans correctly when the URL is long and dense', async () => {
    const url = 'https://example.com/?q=' + 'x'.repeat(1200);
    openOnTab(url);
    render(<App />);

    expect(await scannedText()).toBe(url);
  });

  it('shows a message when the URL is too long for any QR code', async () => {
    openOnTab('https://example.com/?q=' + 'x'.repeat(3000));
    render(<App />);

    expect((await screen.findByRole('alert')).textContent).toMatch(/too long for a QR code/);
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('shows a message when the tab cannot be read', async () => {
    vi.spyOn(fakeBrowser.tabs, 'query').mockRejectedValue(new Error('no access'));
    render(<App />);

    expect((await screen.findByRole('alert')).textContent).toMatch(/could not read this tab/);
  });
});

describe('popup on a YouTube video that is playing', () => {
  const VIDEO = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

  it('starts the phone at the current playback time by default', async () => {
    openOnTab(VIDEO);
    const executeScript = videoIsAt(83.4);
    render(<App />);

    expect(await scannedText()).toBe(`${VIDEO}&t=83s`);
    expect(screen.getByRole('checkbox', { name: 'Start at 1:23' })).toHaveProperty('checked', true);
    expect(executeScript).toHaveBeenCalledWith(expect.objectContaining({ target: { tabId: 1 } }));
  });

  it('drops the start time when the option is unticked, and restores it when ticked', async () => {
    openOnTab(VIDEO);
    videoIsAt(83.4);
    render(<App />);
    const option = await screen.findByRole('checkbox', { name: 'Start at 1:23' });

    await userEvent.click(option);
    expect(await scannedText()).toBe(VIDEO);

    await userEvent.click(option);
    expect(await scannedText()).toBe(`${VIDEO}&t=83s`);
  });

  it('replaces a start time that was already in the URL', async () => {
    openOnTab(`${VIDEO}&t=10s`);
    videoIsAt(200);
    render(<App />);

    expect(await scannedText()).toBe(`${VIDEO}&t=200s`);
  });

  it.each([
    ['the video has not started', 0],
    ['no video element is found', null],
  ])('offers no option when %s', async (_case, seconds) => {
    openOnTab(VIDEO);
    videoIsAt(seconds);
    render(<App />);

    expect(await scannedText()).toBe(VIDEO);
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('still shows the QR code when the page cannot be scripted', async () => {
    openOnTab(VIDEO);
    vi.spyOn(fakeBrowser.scripting, 'executeScript').mockRejectedValue(new Error('blocked'));
    render(<App />);

    expect(await scannedText()).toBe(VIDEO);
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it.each([
    'https://example.com/video-page',
    'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    'https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf',
  ])('does not script the page for %s', async (url) => {
    openOnTab(url);
    const executeScript = videoIsAt(50);
    render(<App />);
    await scannedText();

    expect(executeScript).not.toHaveBeenCalled();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });
});

describe('popup on a page a phone cannot open', () => {
  it.each([
    [undefined, 'Nothing to share yet'],
    ['chrome://extensions/', 'This is a browser page'],
    ['about:blank', 'This is a browser page'],
    ['file:///Users/me/notes.html', 'This is a file on your computer'],
    ['data:text/html,hello', 'This page can’t be opened on a phone'],
  ])('explains why for %j', async (url, title) => {
    openOnTab(url);
    render(<App />);

    const alert = await screen.findByRole('alert');
    expect(screen.getByRole('heading')).toHaveProperty('textContent', title);
    expect(alert.textContent!.length).toBeGreaterThan(title.length);
    expect(screen.queryByRole('img')).toBeNull();
  });
});

describe('popup on an address the phone may not reach', () => {
  it('warns that localhost only works on this computer, and still shows the QR code', async () => {
    openOnTab('http://localhost:3000/dashboard');
    render(<App />);

    expect(await scannedText()).toBe('http://localhost:3000/dashboard');
    expect(screen.getByRole('status').textContent).toMatch(/only works on this computer/);
  });

  it('warns that a private address needs the same network', async () => {
    openOnTab('http://192.168.1.20:3000/');
    render(<App />);

    expect(await scannedText()).toBe('http://192.168.1.20:3000/');
    expect(screen.getByRole('status').textContent).toMatch(/same network/);
  });

  it('shows no warning for a public website', async () => {
    openOnTab('https://example.com/');
    render(<App />);
    await scannedText();

    expect(screen.queryByRole('status')).toBeNull();
  });
});

describe('popup actions', () => {
  it('copies the QR link, not the original tab URL', async () => {
    openOnTab('https://youtu.be/dQw4w9WgXcQ?si=tracking');
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Copy link' }));

    expect(writeText).toHaveBeenCalledWith('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(await screen.findByText('Link copied')).toBeTruthy();
  });

  it('says so when copying is blocked', async () => {
    openOnTab('https://example.com/');
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Copy link' }));

    expect(await screen.findByText('Could not copy the link')).toBeTruthy();
  });

  it('offers to save the QR code as an image', async () => {
    openOnTab('https://example.com/');
    render(<App />);

    expect(await screen.findByRole('button', { name: 'Save QR image' })).toBeTruthy();
  });

  it('offers no actions when there is no QR code', async () => {
    openOnTab('chrome://extensions/');
    render(<App />);
    await screen.findByRole('alert');

    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('popup opened from the right-click menu', () => {
  it('shows the requested link without reading the active tab', async () => {
    const query = vi.spyOn(fakeBrowser.tabs, 'query');
    render(<App search="?url=https%3A%2F%2Fexample.com%2Flinked%3Fa%3D1" />);

    expect(await scannedText()).toBe('https://example.com/linked?a=1');
    expect(query).not.toHaveBeenCalled();
  });

  it('reads the playback time from the tab the menu was opened on', async () => {
    const executeScript = videoIsAt(125);
    render(<App search="?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DdQw4w9WgXcQ&tabId=9" />);

    expect(await scannedText()).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=125s');
    expect(executeScript).toHaveBeenCalledWith(expect.objectContaining({ target: { tabId: 9 } }));
  });

  it('does not script any page for a YouTube link that has no tab', async () => {
    const executeScript = videoIsAt(125);
    render(<App search="?url=https%3A%2F%2Fyoutu.be%2FdQw4w9WgXcQ" />);

    expect(await scannedText()).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(executeScript).not.toHaveBeenCalled();
  });
});
