import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.savitar.rbc',
  appName: 'RBC EASY',
  webDir: 'dist',
  android: {
    path: 'android',
    allowMixedContent: false,
  },
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#07070c',
      showSpinner: false,
    },
  },
};

export default config;
