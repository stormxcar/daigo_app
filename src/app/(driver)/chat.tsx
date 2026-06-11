import React, { useEffect, useState } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { MessageCircle } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, spacing } from '@/theme/tokens';
import { Button, Card } from '@/components/BaseComponents';
import { EmptyState, Screen } from '@/components/ScreenComponents';
import { apiClient } from '@/services/api';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';

export default function DriverChat() {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const { conversations, setConversations, setError } = useChatStore();
  const [refreshing, setRefreshing] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);

  const refreshConversations = async () => {
    if (!user) return;
    try {
      setRefreshing(true);
      setConversations(await apiClient.getConversations(user.id));
    } catch (error: any) {
      setError(error.message);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    refreshConversations();

    const channelName = `driver-chat-list-${user.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        apiClient.getConversations(user.id).then(setConversations).catch((error) => setError(error.message));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        apiClient.getConversations(user.id).then(setConversations).catch((error) => setError(error.message));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return (
    <Screen scroll padding refreshing={refreshing} onRefresh={refreshConversations}>
      {conversations.slice(0, visibleCount).map((conversation) => (
        <TouchableOpacity
          key={conversation.id}
          activeOpacity={0.84}
          onPress={() =>
            router.push({
              pathname: '/(driver)/chat-detail' as any,
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

      {conversations.length === 0 && (
        <EmptyState
          icon={<MessageCircle size={48} color={colors.primary} />}
          title="Chưa có tin nhắn"
          description="Tin nhắn từ khách hàng sẽ hiển thị khi chuyến đi có cuộc trò chuyện."
        />
      )}
      {conversations.length > visibleCount && (
        <Button
          label="Tải thêm tin nhắn"
          onPress={() => setVisibleCount((current) => current + 12)}
          variant="outline"
        />
      )}
    </Screen>
  );
}
