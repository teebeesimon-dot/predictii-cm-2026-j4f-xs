import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ro.just4fun.predictii',
  appName: 'SKUPA',
  webDir: 'public',
  plugins: {
    FirebaseAuthentication: {
      providers: ['google.com'],
    },
  },
  server: {
    url: 'https://skupa-62490t25a-tiberiu-simon-s-projects.vercel.app',
    cleartext: false
  }
};

export default config;
