import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Mic, PhoneOff, Volume2 } from 'lucide-react-native';
import { Button, Card } from '@/components/BaseComponents';
import { CallStatusBadge } from '@/components/CallStatusBadge';
import { Screen } from '@/components/ScreenComponents';
import { getAgoraToken } from '@/services/agoraTokenService';
import { joinAgoraVoiceChannel, leaveAgoraVoiceChannel, requestMicrophonePermission } from '@/services/agoraService';
import { callService } from '@/services/callService';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import { borderRadius, spacing } from '@/theme/tokens';
import { CallSession } from '@/types';
import { showError, showSuccess } from '@/utils/toast';

const numericUid = (id: string) => {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return hash || 1;
};

export default function CallScreen() {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const { callId } = useLocalSearchParams<{ callId?: string; mode?: string }>();
  const [call, setCall] = useState<CallSession | null>(null);
  const [statusText, setStatusText] = useState('Đang chuẩn bị cuộc gọi...');
  const [joining, setJoining] = useState(true);
  const [joined, setJoined] = useState(false);
  const closingRef = useRef(false);

  const channelName = call?.agoraChannel ?? call?.id;
  const activeCallId = call?.id;
  const appIdFromEnv = process.env.EXPO_PUBLIC_AGORA_APP_ID;
  const uid = useMemo(() => numericUid(user?.id ?? ''), [user?.id]);

  useEffect(() => {
    if (!callId) return;
    callService
      .getCallSession(callId)
      .then(setCall)
      .catch((error) => {
        showError('Không thể tải cuộc gọi', error.message);
        setJoining(false);
      });
  }, [callId]);

  useEffect(() => {
    if (!callId) return undefined;
    return callService.subscribeCallSession(callId, (nextCall) => {
      setCall(nextCall);
      if (['rejected', 'missed', 'ended', 'failed'].includes(nextCall.status)) {
        setStatusText(
          nextCall.status === 'rejected'
            ? 'Người nhận đã từ chối'
            : nextCall.status === 'ended'
              ? 'Cuộc gọi đã kết thúc'
              : 'Cuộc gọi không thành công'
        );
        leaveAgoraVoiceChannel();
        if (!closingRef.current) {
          closingRef.current = true;
          setTimeout(() => router.back(), 700);
        }
      }
    });
  }, [callId]);

  useEffect(() => {
    if (!activeCallId || !user?.id || !channelName) return;
    let mounted = true;

    const join = async () => {
      try {
        setJoining(true);
        const granted = await requestMicrophonePermission();
        if (!granted) throw new Error('Bạn chưa cấp quyền microphone.');

        const { token, appId } = await getAgoraToken(channelName, uid).catch(() => ({
          token: undefined,
          appId: appIdFromEnv,
        }));
        if (!appId) {
          throw new Error('Thiếu EXPO_PUBLIC_AGORA_APP_ID hoặc Edge Function generate-agora-token chưa trả appId.');
        }

        setStatusText('Đang kết nối Agora...');
        joinAgoraVoiceChannel({
          appId,
          token,
          channel: channelName,
          uid,
          onJoined: () => {
            if (!mounted) return;
            setJoined(true);
            setStatusText('Đã kết nối, đang chờ người còn lại...');
          },
          onUserJoined: () => {
            if (!mounted) return;
            setStatusText('Đang nói chuyện');
            showSuccess('Đã kết nối cuộc gọi');
          },
          onUserOffline: () => {
            if (!mounted) return;
            setStatusText('Người còn lại đã rời cuộc gọi');
          },
          onError: (message) => {
            if (!mounted) return;
            setStatusText('Cuộc gọi lỗi');
            showError('Agora lỗi', message);
          },
        });
      } catch (error: any) {
        showError('Không thể vào cuộc gọi', error.message);
        await callService.updateCallStatus(activeCallId, 'failed').catch(() => undefined);
      } finally {
        if (mounted) setJoining(false);
      }
    };

    join();

    return () => {
      mounted = false;
      leaveAgoraVoiceChannel();
    };
  }, [activeCallId, appIdFromEnv, channelName, user?.id, uid]);

  const endCall = async () => {
    if (!call) {
      router.back();
      return;
    }
    leaveAgoraVoiceChannel();
    closingRef.current = true;
    const hasConnected = joined || call.status === 'accepted' || !!call.acceptedAt;
    await callService
      .updateCallStatus(call.id, hasConnected ? 'ended' : 'missed', call.acceptedAt ?? call.startedAt)
      .catch(() => undefined);
    router.back();
  };

  return (
    <Screen padding>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Card style={{ width: '100%', alignItems: 'center' }}>
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.lg,
            }}
          >
            {joining ? <ActivityIndicator color="white" /> : <Mic size={38} color="white" />}
          </View>
          <Text style={{ color: colors.text, fontSize: 24, fontWeight: '900', marginBottom: spacing.sm }}>
            Gọi trong ứng dụng
          </Text>
          {call && <View style={{ marginBottom: spacing.md }}><CallStatusBadge status={call.status} /></View>}
          <Text style={{ color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: spacing.xl }}>
            {statusText}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xl }}>
            <Volume2 size={18} color={joined ? colors.success : colors.textTertiary} />
            <Text style={{ color: joined ? colors.success : colors.textSecondary, fontWeight: '800' }}>
              {joined ? 'Kênh thoại đã sẵn sàng' : 'Đang kết nối'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={endCall}
            style={{
              width: 70,
              height: 70,
              borderRadius: borderRadius.full,
              backgroundColor: colors.error,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.md,
            }}
          >
            <PhoneOff size={30} color="white" />
          </TouchableOpacity>
          <Button label="Đóng" onPress={endCall} variant="outline" />
        </Card>
      </View>
    </Screen>
  );
}
