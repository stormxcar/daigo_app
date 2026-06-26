import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { apiClient } from '@/services/api';
import { showInfo, showWarning } from '@/utils/toast';

let notificationHandlerReady = false;
let registeredPushUserId: string | null = null;

async function getNotificationsModule() {
  const Notifications = await import('expo-notifications');

  if (!notificationHandlerReady) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    notificationHandlerReady = true;
  }

  return Notifications;
}

export async function registerPushNotifications(userId: string) {
  if (registeredPushUserId === userId) {
    return null;
  }

  if (Constants.appOwnership === 'expo') {
    return null;
  }

  const Device = await import('expo-device');
  const Notifications = await getNotificationsModule();

  if (!Device.isDevice) {
    showInfo('Push notification', 'Expo Push chỉ hoạt động đầy đủ trên thiết bị thật hoặc APK/dev build.');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Thông báo Daigo',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1d4ed8',
    });
    await Notifications.setNotificationChannelAsync('calls', {
      name: 'Cuộc gọi Daigo',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 700, 350, 700, 350, 700],
      lightColor: '#16a34a',
      sound: 'default',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  const current = await Notifications.getPermissionsAsync();
  let finalStatus = current.status;
  if (finalStatus !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }

  if (finalStatus !== 'granted') {
    showWarning('Chưa bật thông báo', 'Bạn có thể bật quyền thông báo trong cài đặt thiết bị để nhận booking/chat realtime.');
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
  if (!projectId) {
    showWarning('Thiếu EAS projectId', 'Không thể lấy Expo Push Token vì app chưa có projectId.');
    return null;
  }

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await apiClient.upsertPushToken(userId, token, Platform.OS);
  registeredPushUserId = userId;
  return token;
}

export async function setAppIconBadgeCount(count: number) {
  if (Constants.appOwnership === 'expo') {
    return;
  }

  try {
    const Notifications = await getNotificationsModule();
    await Notifications.setBadgeCountAsync(Math.max(0, count));
  } catch (error) {
    if (__DEV__) console.warn('[DAIGO_BADGE_COUNT_ERROR]', error);
  }
}
