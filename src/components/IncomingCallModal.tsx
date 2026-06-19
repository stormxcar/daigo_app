import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Phone, PhoneOff } from 'lucide-react-native';
import { CallSession } from '@/types';
import { callService } from '@/services/callService';
import { useTheme } from '@/theme';
import { borderRadius, spacing } from '@/theme/tokens';
import { showError } from '@/utils/toast';

type Props = {
  call: CallSession | null;
  onClose: () => void;
};

export function IncomingCallModal({ call, onClose }: Props) {
  const { colors } = useTheme();

  const accept = async () => {
    if (!call) return;
    try {
      await callService.updateCallStatus(call.id, 'accepted');
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
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '900', textAlign: 'center' }}>
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
