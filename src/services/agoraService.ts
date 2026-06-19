import { PermissionsAndroid, Platform } from 'react-native';
import {
  ChannelProfileType,
  ClientRoleType,
  createAgoraRtcEngine,
  IRtcEngine,
} from 'react-native-agora';

let engine: IRtcEngine | null = null;

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
  const rtcEngine = getAgoraEngine(params.appId);
  rtcEngine.registerEventHandler({
    onJoinChannelSuccess: () => params.onJoined?.(),
    onUserJoined: () => params.onUserJoined?.(),
    onUserOffline: () => params.onUserOffline?.(),
    onError: (_err, msg) => params.onError?.(msg || 'Agora join channel thất bại.'),
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
