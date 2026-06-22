import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { apiClient } from '@/services/api';
import { supabase } from '@/services/supabase';
import { ChatThread } from '@/components/ChatThread';
import { AuthRequired } from '@/components/AuthRequired';
import { Screen } from '@/components/ScreenComponents';
import { useTheme } from '@/theme';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';

export default function ChatDetailScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuthStore();
  const { conversations, setConversations, addMessage, removeMessage, markConversationAsRead } = useChatStore();
  const [loading, setLoading] = useState(true);
  const channelInstanceId = useRef(Math.random().toString(36).slice(2)).current;
  const conversation = useMemo(() => conversations.find((item) => item.id === id), [conversations, id]);

  const refresh = async () => {
    if (!user) return;
    const latest = await apiClient.getConversations(user.id);
    setConversations(latest);
    setLoading(false);
  };

  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, [user?.id]);

  useEffect(() => {
    if (!id || !user) return;
    markConversationAsRead(id);
    apiClient.markConversationThreadMessagesAsRead(id, user.id).then(refresh).catch(() => undefined);
  }, [id, user?.id]);

  useEffect(() => {
    if (!id) return;
    let active = true;

    const channel = supabase
      .channel(`chat-detail-${id}-${channelInstanceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        if (active) refresh().catch(() => undefined);
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [id, user?.id, channelInstanceId]);

  if (user && !user.phoneVerified) {
    return (
      <AuthRequired
        title="Xác minh số điện thoại"
        description="Bạn cần xác minh SĐT bằng OTP trước khi chat hoặc gọi tài xế."
        actionLabel="Xác minh SĐT"
        onActionPress={() =>
          router.push({
            pathname: '/(auth)/phone-otp' as any,
            params: { redirectTo: id ? `/(customer)/chat-detail?id=${id}` : '/(customer)/chat' },
          })
        }
      />
    );
  }

  if (!user || loading || !conversation) {
    return (
      <Screen padding>
        <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
          {loading ? 'Đang tải cuộc trò chuyện...' : 'Không tìm thấy cuộc trò chuyện.'}
        </Text>
      </Screen>
    );
  }

  return (
    <ChatThread
      conversation={conversation}
      user={user}
      roleLabel="Tài xế"
      onMessageSent={(message) => addMessage(conversation.id, message)}
      onMessageDeleted={(messageId) => {
        removeMessage(conversation.id, messageId);
        refresh().catch(() => undefined);
      }}
    />
  );
}
