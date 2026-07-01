import React, { useCallback, useEffect, useRef } from 'react';
import { Modal, Text, TouchableOpacity, Vibration, View } from 'react-native';
import { router } from 'expo-router';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { Phone, PhoneOff } from 'lucide-react-native';
import { CallSession } from '@/types';
import { callService } from '@/services/callService';
import { useTheme } from '@/theme';
import { fontForWeight, borderRadius, spacing } from '@/theme/tokens';
import { showError } from '@/utils/toast';

type Props = {
  call: CallSession | null;
  onClose: () => void;
};

export function IncomingCallModal({ call, onClose }: Props) {
  const { colors } = useTheme();
  const localNotificationIdRef = useRef<string | null>(null);
  const ringtonePlayer = useAudioPlayer(require('../../assets/sounds/incoming-call.mp3'), {
    downloadFirst: true,
    keepAudioSessionActive: false,
  });

  const stopIncomingFeedback = useCallback(async () => {
    Vibration.cancel();
    try {
      ringtonePlayer.pause();
      await ringtonePlayer.seekTo(0);
    } catch {
      // Audio feedback is best-effort and should never block call actions.
    }

    if (!localNotificationIdRef.current) return;
    try {
      const Notifications = await import('expo-notifications');
      await Notifications.dismissNotificationAsync(localNotificationIdRef.current);
    } catch {
      // Foreground call feedback should never block call actions.
    } finally {
      localNotificationIdRef.current = null;
    }
  }, [ringtonePlayer]);

  useEffect(() => {
    if (!call) {
      stopIncomingFeedback();
      return undefined;
    }

    Vibration.vibrate([0, 800, 450, 800, 450, 800], true);
    let active = true;

    setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'doNotMix',
    })
      .then(() => {
        if (!active) return;
        ringtonePlayer.loop = true;
        ringtonePlayer.volume = 0.9;
        ringtonePlayer.seekTo(0).catch(() => undefined);
        ringtonePlayer.play();
      })
      .catch(() => undefined);

    import('expo-notifications')
      .then(async (Notifications) => {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Cuộc gọi đến',
            body: 'Có người đang gọi cho bạn trong ứng dụng Daigo Booking.',
            sound: 'default',
            data: {
              type: 'incoming_call',
              callSessionId: call.id,
              bookingId: call.bookingId,
            },
          },
          trigger: null,
        });
        if (active) {
          localNotificationIdRef.current = id;
        } else {
          await Notifications.dismissNotificationAsync(id).catch(() => undefined);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
      stopIncomingFeedback();
    };
  }, [call, ringtonePlayer, stopIncomingFeedback]);

  const accept = async () => {
    if (!call) return;
    try {
      await callService.updateCallStatus(call.id, 'accepted');
      await stopIncomingFeedback();
      onClose();
      router.push({ pathname: '/call' as any, params: { callId: call.id, mode: 'receiver' } });
    } catch (error: any) {
      showError('Không thể nghe máy', error.message);
    }
  };

  const reject = async () => {
    if (!call) return;
    try {
      await callService.updateCallStatus(call.id, 'rejected');
    } catch (error: any) {
      showError('Không thể từ chối', error.message);
    } finally {
      await stopIncomingFeedback();
      onClose();
    }
  };

  return (
    <Modal visible={!!call} transparent animationType="fade" onRequestClose={reject}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.52)', justifyContent: 'center', padding: spacing.lg }}>
        <View style={{ borderRadius: borderRadius.xl, backgroundColor: colors.surface, padding: spacing.xl, alignItems: 'center' }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.lg,
            }}
          >
            <Phone size={30} color="white" />
          </View>
          <Text style={{ color: colors.text, fontSize: 22, ...fontForWeight('900'), textAlign: 'center' }}>
            Cuộc gọi đến
          </Text>
          <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.xl }}>
            Có người đang gọi cho bạn trong ứng dụng Daigo Booking.
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <TouchableOpacity
              onPress={reject}
              style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.error, alignItems: 'center', justifyContent: 'center' }}
            >
              <PhoneOff size={26} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={accept}
              style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' }}
            >
              <Phone size={26} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
