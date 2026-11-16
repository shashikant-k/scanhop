import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'ScanHop',
    description: 'Scan a QR code to open the current tab on your phone.',
    browser_specific_settings: {
      gecko: {
        id: 'scanhop@example.com',
      },
    },
  },
});
