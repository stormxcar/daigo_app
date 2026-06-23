import { PermissionsAndroid, Platform } from 'react-native';

type AgoraModule = {
  ChannelProfileType: any;
  ClientRoleType: any;
  createAgoraRtcEngine: () => any;
};

let engine: any | null = null;
let agoraModuleCache: AgoraModule | null | undefined;

const getAgoraModule = (): AgoraModule => {
  if (agoraModuleCache !== undefined) {
    if (!agoraModuleCache) {
      throw new Error('Agora chỉ hoạt động trên development build/APK đã rebuild, Expo Go không hỗ trợ react-native-agora.');
    }
    return agoraModuleCache;
  }

  try {
    // Keep this dynamic so Expo Go / old APKs can render routes without crashing.
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const agora = require('react-native-agora');
    agoraModuleCache = {
      ChannelProfileType: agora.ChannelProfileType,
      ClientRoleType: agora.ClientRoleType,
      createAgoraRtcEngine: agora.createAgoraRtcEngine,
    };
    return agoraModuleCache;
  } catch {
    agoraModuleCache = null;
    throw new Error('Agora chỉ hoạt động trên development build/APK đã rebuild, Expo Go không hỗ trợ react-native-agora.');
  }
};

export async function requestMicrophonePermission() {
  if (Platform.OS !== 'android') return true;
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
    title: 'Quyền microphone',
    message: 'Daigo Booking cần microphone để gọi thoại trong ứng dụng.',
    buttonPositive: 'Cho phép',
    buttonNegative: 'Hủy',
  });
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export function getAgoraEngine(appId: string) {
  if (engine) return engine;
  const { ChannelProfileType, createAgoraRtcEngine } = getAgoraModule();
  const nextEngine = createAgoraRtcEngine();
  nextEngine.initialize({
    appId,
    channelProfile: ChannelProfileType.ChannelProfileCommunication,
  });
  nextEngine.enableAudio();
  engine = nextEngine;
  return nextEngine;
}

export function joinAgoraVoiceChannel(params: {
  appId: string;
  token?: string;
  channel: string;
  uid: number;
  onJoined?: () => void;
  onUserJoined?: () => void;
  onUserOffline?: () => void;
  onError?: (message: string) => void;
}) {
  const { ClientRoleType } = getAgoraModule();
  const rtcEngine = getAgoraEngine(params.appId);
  rtcEngine.registerEventHandler({
    onJoinChannelSuccess: () => params.onJoined?.(),
    onUserJoined: () => params.onUserJoined?.(),
    onUserOffline: () => params.onUserOffline?.(),
    onError: (_err: unknown, msg?: string) => params.onError?.(msg || 'Agora join channel thất bại.'),
  });
  rtcEngine.joinChannel(params.token ?? '', params.channel, params.uid, {
    clientRoleType: ClientRoleType.ClientRoleBroadcaster,
    publishMicrophoneTrack: true,
    autoSubscribeAudio: true,
  });
  return rtcEngine;
}

export function leaveAgoraVoiceChannel() {
  if (!engine) return;
  engine.leaveChannel();
}
