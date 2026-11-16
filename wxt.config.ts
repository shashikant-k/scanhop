import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: ({ mode, browser }) => ({
    name: 'ScanHop',
    description: 'Scan a QR code to open the current tab on your phone.',
    // activeTab: reveals the current tab's URL only when the user clicks the toolbar button.
    // scripting: reads the playback position of a YouTube video in that tab.
    // contextMenus: adds "Show QR code for this page / link" to the right-click menu.
    permissions: ['activeTab', 'scripting', 'contextMenus'],
    // End-to-end tests cannot click the real toolbar button, which is what
    // grants `activeTab`. The test-only build (`--mode e2e`) is therefore
    // allowed to read every page. Release builds never get this.
    ...(mode === 'e2e' ? { host_permissions: ['<all_urls>'] } : {}),
    // Firefox-only settings; Chrome warns about keys it does not know.
    ...(browser === 'firefox'
      ? {
          browser_specific_settings: {
            gecko: {
              id: 'scanhop@example.com',
              // Firefox requires every new extension to declare what data it
              // collects. ScanHop collects none: the QR code is made locally.
              data_collection_permissions: { required: ['none'] },
            },
          },
        }
      : {}),
  }),
});
