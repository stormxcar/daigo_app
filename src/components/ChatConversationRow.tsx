import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Check, Image as ImageIcon, MessageCircle, Trash2 } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, spacing } from '@/theme/tokens';
import { ChatConversation } from '@/types';

type Props = {
  conversation: ChatConversation;
  multipleThreadsLabel: string;
  selected?: boolean;
  selectionMode?: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onDelete: () => void;
};

export function ChatConversationRow({
  conversation,
  multipleThreadsLabel,
  selected = false,
  selectionMode = false,
  onPress,
  onLongPress,
  onDelete,
}: Props) {
  const { colors } = useTheme();
  const isImageMessage = conversation.lastMessage === 'Đã gửi một ảnh';

  return (
    <Swipeable
      enabled={!selectionMode}
      overshootRight={false}
      renderRightActions={() => (
        <TouchableOpacity
          activeOpacity={0.84}
          onPress={onDelete}
          style={{
            width: 86,
            backgroundColor: colors.error,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Trash2 size={20} color="white" />
          <Text style={{ color: 'white', fontWeight: '900', fontSize: fontSize.xs, marginTop: spacing.xs }}>Xóa</Text>
        </TouchableOpacity>
      )}
    >
      <TouchableOpacity activeOpacity={0.84} onPress={onPress} onLongPress={onLongPress}>
        <View
          style={{
            backgroundColor: selected ? colors.primary + '10' : colors.surface,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: selected ? colors.primary + '55' : colors.border,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
          }}
        >
          <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
            {selectionMode && (
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected ? colors.primary : colors.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {selected && <Check size={14} color="white" />}
              </View>
            )}
            <Image
              source={{ uri: conversation.participantAvatar }}
              style={{
                width: 58,
                height: 58,
                borderRadius: 29,
                backgroundColor: colors.surfaceAlt,
              }}
            />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 16,
                    fontWeight: '900',
                    flex: 1,
                  }}
                  numberOfLines={1}
                >
                  {conversation.participantName}
                </Text>
                <MessageCircle size={14} color={colors.primary} />
              </View>
              <Text
                numberOfLines={1}
                style={{
                  color: conversation.unreadCount > 0 ? colors.text : colors.textSecondary,
                  fontSize: fontSize.sm,
                  fontWeight: conversation.unreadCount > 0 ? '800' : '500',
                  marginTop: spacing.xs,
                }}
              >
                {isImageMessage ? 'Ảnh trong cuộc trò chuyện' : conversation.lastMessage}
              </Text>
              {isImageMessage && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs }}>
                  <ImageIcon size={13} color={colors.primary} />
                  <Text style={{ color: colors.textTertiary, fontSize: fontSize.xs }}>Nhấn để xem ảnh</Text>
                </View>
              )}
              {(conversation.threadIds?.length ?? 0) > 1 && (
                <Text style={{ color: colors.textTertiary, fontSize: fontSize.xs, marginTop: spacing.xs }}>
                  {conversation.threadIds?.length} {multipleThreadsLabel}
                </Text>
              )}
            </View>
            <View style={{ alignItems: 'flex-end', gap: spacing.sm }}>
              <Text style={{ color: colors.textTertiary, fontSize: fontSize.xs }}>{conversation.lastMessageTime}</Text>
              {conversation.unreadCount > 0 && (
                <View
                  style={{
                    minWidth: 22,
                    height: 22,
                    borderRadius: borderRadius.full,
                    backgroundColor: colors.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: 'white', fontSize: fontSize.xs, fontWeight: '700' }}>
                    {conversation.unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}
