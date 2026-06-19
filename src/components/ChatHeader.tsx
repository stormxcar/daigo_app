import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { MoreVertical, Phone, ShieldCheck } from 'lucide-react-native';
import { ChatConversation } from '@/types';
import { useTheme } from '@/theme';
import { spacing } from '@/theme/tokens';

type Props = {
  conversation: ChatConversation;
  roleLabel: string;
  onCallPress: () => void;
  onMenuPress: () => void;
};

export function ChatHeader({ conversation, roleLabel, onCallPress, onMenuPress }: Props) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.md,
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
        <Image
          source={{ uri: conversation.participantAvatar }}
          style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: colors.surfaceAlt }}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }} numberOfLines={1}>
            {conversation.participantName}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs }}>
            <ShieldCheck size={13} color={colors.success} />
            <Text style={{ color: colors.textSecondary, fontSize: 13 }} numberOfLines={1}>
              {roleLabel}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={onCallPress}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primary,
          }}
        >
          <Phone size={18} color="white" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onMenuPress}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceAlt,
          }}
        >
          <MoreVertical size={18} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
