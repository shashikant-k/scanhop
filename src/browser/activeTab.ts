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
