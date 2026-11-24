import type { CapacitorConfig } from '@capacitor/cli';

const appHost = 'skupa-git-v0-secure-admin-endpoints-tiberiu-simon-s-projects.vercel.app';

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
    // Alias stabil pentru ramura de Closed Testing, nu URL-ul unei singure
    // implementari Vercel care poate deveni vechi dupa urmatoarele deploy-uri.
    url: `https://${appHost}`,
    cleartext: false,
    allowNavigation: [appHost],
  },
};

export default config;
