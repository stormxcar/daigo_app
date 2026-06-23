module.exports = {
  name: 'Daigo Booking',
  slug: 'vf7-booking',
  version: '1.0.0',
  sdkVersion: '54.0.0',
  runtimeVersion: {
    policy: 'appVersion',
  },
  updates: {
    url: 'https://u.expo.dev/af736931-a2cb-443f-a684-3a0662d6e381',
    fallbackToCacheTimeout: 0,
  },
  orientation: 'portrait',
  jsEngine: 'hermes',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#1d4ed8',
  },
  assetBundlePatterns: [
    'assets/icon.png',
    'assets/adaptive-icon.png',
    'assets/splash.png',
    'assets/favicon.png',
  ],
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.daigo.booking',
    infoPlist: {
      NSMicrophoneUsageDescription: 'Ứng dụng cần microphone để gọi thoại giữa khách hàng và tài xế.',
    },
  },
  android: {
    permissions: ['RECORD_AUDIO'],
    googleServicesFile: './google-services.json',
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#1d4ed8',
    },
    package: 'com.daigo.booking',
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    [
      'expo-router',
      {
        origin: false,
      },
    ],
    'expo-secure-store',
    'expo-web-browser',
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Ứng dụng cần vị trí của bạn để hiển thị GPS và lộ trình chuyến đi trên bản đồ.',
      },
    ],
    [
      'expo-media-library',
      {
        photosPermission: 'Ứng dụng cần quyền truy cập thư viện ảnh để lưu ảnh bài viết về thiết bị.',
        savePhotosPermission: 'Ứng dụng cần quyền lưu ảnh bài viết vào thư viện ảnh của bạn.',
        isAccessMediaLocationEnabled: true,
        isAudioEnabled: false,
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/icon.png',
        color: '#1d4ed8',
        defaultChannel: 'default',
      },
    ],
    'expo-screen-orientation',
    'expo-font',
    'expo-video',
    '@react-native-community/datetimepicker',
    [
      'expo-build-properties',
      {
        android: {
          enableProguardInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
          useLegacyPackaging: false,
        },
      },
    ],
    '@maplibre/maplibre-react-native',
    '@react-native-firebase/app',
    '@react-native-firebase/auth',
  ],
  scheme: 'daigobooking',
  backgroundColor: '#1d4ed8',
  extra: {
    eas: {
      projectId: 'af736931-a2cb-443f-a684-3a0662d6e381',
    },
  },
};
