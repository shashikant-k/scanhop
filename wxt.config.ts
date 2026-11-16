import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'ScanHop',
    description: 'Scan a QR code to open the current tab on your phone.',
    // Reveals the current tab's URL only when the user clicks the toolbar button.
    permissions: ['activeTab'],
    browser_specific_settings: {
      gecko: {
        id: 'scanhop@example.com',
      },
    },
  },
});
