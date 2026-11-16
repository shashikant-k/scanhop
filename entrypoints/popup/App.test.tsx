// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
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

/** What a phone would read from the QR code currently on screen. */
async function scannedText(): Promise<string | null> {
  const svg = await screen.findByRole('img', { name: /QR code for/ });
  return decodeQrSvg(svg.outerHTML);
}

beforeEach(() => {
  fakeBrowser.reset();
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

  it('shows a message instead of a QR code for a browser page', async () => {
    openOnTab('chrome://extensions/');
    render(<App />);

    expect((await screen.findByRole('alert')).textContent).toMatch(/can’t be opened on a phone/);
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('shows a message when the URL is too long for any QR code', async () => {
    openOnTab('https://example.com/?q=' + 'x'.repeat(3000));
    render(<App />);

    expect((await screen.findByRole('alert')).textContent).toMatch(/too long to fit in a QR code/);
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('shows a message when the tab cannot be read', async () => {
    vi.spyOn(fakeBrowser.tabs, 'query').mockRejectedValue(new Error('no access'));
    render(<App />);

    expect((await screen.findByRole('alert')).textContent).toMatch(/could not read this tab/);
  });
});
