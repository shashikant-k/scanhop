import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'ScanHop',
    description: 'Scan a QR code to open the current tab on your phone.',
    // activeTab: reveals the current tab's URL only when the user clicks the toolbar button.
    // scripting: reads the playback position of a YouTube video in that tab.
    permissions: ['activeTab', 'scripting'],
    browser_specific_settings: {
      gecko: {
        id: 'scanhop@example.com',
      },
    },
  },
});
