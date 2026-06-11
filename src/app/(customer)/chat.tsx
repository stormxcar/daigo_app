import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, spacing } from '@/theme/tokens';
import { AuthRequired } from '@/components/AuthRequired';
import { Card } from '@/components/BaseComponents';
import { Screen } from '@/components/ScreenComponents';
import { useAuthStore } from '@/stores/authStore';
import { MOCK_CONVERSATIONS } from '@/services/mockData';

export default function ChatScreen() {
  const { colors } = useTheme();
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <AuthRequired description="Bạn cần đăng nhập để trò chuyện với tài xế." />;
  }

  return (
    <Screen scroll padding>
      {MOCK_CONVERSATIONS.map((conversation) => (
        <TouchableOpacity
          key={conversation.id}
          activeOpacity={0.84}
          onPress={() =>
            router.push({
              pathname: '/(customer)/chat-detail' as any,
              params: { id: conversation.id },
            })
          }
        >
          <Card style={{ marginBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
              <Image
                source={{ uri: conversation.participantAvatar }}
                style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: colors.surfaceAlt }}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>
                  {conversation.participantName}
                </Text>
                <Text numberOfLines={1} style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginTop: spacing.xs }}>
                  {conversation.lastMessage}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: spacing.sm }}>
                <Text style={{ color: colors.textTertiary, fontSize: fontSize.xs }}>
                  {conversation.lastMessageTime}
                </Text>
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
          </Card>
        </TouchableOpacity>
      ))}
    </Screen>
  );
}
