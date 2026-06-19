import React, { useEffect, useMemo, useState } from 'react';
import { Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { apiClient } from '@/services/api';
import { supabase } from '@/services/supabase';
import { ChatThread } from '@/components/ChatThread';
import { Screen } from '@/components/ScreenComponents';
import { useTheme } from '@/theme';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';

export default function DriverChatDetail() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuthStore();
  const { conversations, setConversations, addMessage, removeMessage, markConversationAsRead } = useChatStore();
  const [loading, setLoading] = useState(true);
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

    const channel = supabase
      .channel(`driver-chat-detail-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        refresh().catch(() => undefined);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, user?.id]);

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
      roleLabel="Khách hàng"
      onMessageSent={(message) => addMessage(conversation.id, message)}
      onMessageDeleted={(messageId) => {
        removeMessage(conversation.id, messageId);
        refresh().catch(() => undefined);
      }}
    />
  );
}
