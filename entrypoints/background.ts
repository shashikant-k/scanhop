import { browser } from 'wxt/browser';
import { handleMenuClick, registerContextMenus } from '@/src/browser/contextMenu';

export default defineBackground(() => {
  // Menu entries persist across browser restarts, so create them only on install/update.
  browser.runtime.onInstalled.addListener(registerContextMenus);
  browser.contextMenus.onClicked.addListener(handleMenuClick);
});
