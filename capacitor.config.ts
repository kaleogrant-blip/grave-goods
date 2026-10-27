import type { CapacitorConfig } from '@capacitor/cli';

// backgroundColor is the game's --stone (the body background). If the game's palette changes, update this too.
const config: CapacitorConfig = {
  appId: 'com.gravegoods.app', // PLACEHOLDER: must equal the bundle ID you register in App Store Connect (docs/TRACK-B.md step 1)
  appName: 'Grave Goods',
  webDir: 'www',
  backgroundColor: '#17161b',
  ios: {
    contentInset: 'never',
    backgroundColor: '#17161b',
    limitsNavigationsToAppBoundDomains: false
  },
  plugins: {
    StatusBar: { overlaysWebView: true, style: 'DARK' }
  }
};

export default config;
