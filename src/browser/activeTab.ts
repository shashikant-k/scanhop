/**
 * The only place that talks to the browser's tab API.
 * Everything else works on plain strings so it can be tested without a browser.
 */
import { browser } from 'wxt/browser';

export interface ActiveTab {
  id?: number;
  url?: string;
  title?: string;
}

/**
 * The tab the user was looking at when they opened the popup.
 *
 * The `activeTab` permission reveals this tab's URL only after the user
 * clicks the toolbar button, so no "read your browsing history" permission
 * is needed.
 */
export async function getActiveTab(): Promise<ActiveTab | null> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab ? { id: tab.id, url: tab.url, title: tab.title } : null;
}

/**
 * Current playback position, in seconds, of the main video in a tab.
 * Returns null when the page has no video or the page cannot be scripted.
 *
 * Needs the `scripting` permission; `activeTab` grants access to this one tab.
 */
export async function readVideoTime(tabId: number): Promise<number | null> {
  try {
    const [injection] = await browser.scripting.executeScript({
      target: { tabId },
      // Runs inside the page, so it must not use anything from this file.
      func: () => {
        const video =
          document.querySelector<HTMLVideoElement>('#movie_player video') ??
          document.querySelector<HTMLVideoElement>('video');
        return video ? video.currentTime : null;
      },
    });
    const seconds = injection?.result;
    return typeof seconds === 'number' && Number.isFinite(seconds) ? seconds : null;
  } catch {
    return null;
  }
}
