import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ro.just4fun.predictii',
  appName: 'SKUPA',
  webDir: 'public',
  server: {
    url: 'https://predictii-cm-2026-j4f.vercel.app',
    cleartext: false
  }
};

export default config;