import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { apiClient } from '@/services/api';
import { supabase } from '@/services/supabase';
import { ChatThread } from '@/components/ChatThread';
import { Screen } from '@/components/ScreenComponents';
import { useTheme } from '@/theme';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { ChatConversation } from '@/types';

export default function DriverChatDetail() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuthStore();
  const { addMessage, markConversationAsRead } = useChatStore();
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const channelInstanceId = useRef(Math.random().toString(36).slice(2)).current;
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    if (!user || !id) return;
    const latest = await apiClient.getConversationDetail(id, user.id);
    setConversation(latest);
    setLoading(false);
  }, [id, user]);

  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    if (!id || !user) return;
    markConversationAsRead(id);
    apiClient.markConversationThreadMessagesAsRead(id, user.id).then(refresh).catch(() => undefined);
  }, [id, markConversationAsRead, refresh, user]);

  useEffect(() => {
    if (!id) return;
    let active = true;
    const scheduleRefresh = () => {
      if (!active || !user) return;
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => {
        apiClient
          .markConversationThreadMessagesAsRead(id, user.id)
          .then(refresh)
          .catch(() => refresh().catch(() => undefined));
      }, 180);
    };

    const channel = supabase
      .channel(`driver-chat-detail-${id}-${channelInstanceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` },
        scheduleRefresh
      )
      .subscribe();

    return () => {
      active = false;
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [id, refresh, channelInstanceId, user]);

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
      onMessageSent={(message) => {
        addMessage(conversation.id, message);
        setConversation((current) =>
          current?.id === conversation.id
            ? { ...current, messages: [...current.messages, message], lastMessage: message.text, lastMessageTime: message.timestamp }
            : current
        );
      }}
      onMessageDeleted={(messageId) => {
        void messageId;
        refresh().catch(() => undefined);
      }}
    />
  );
}
