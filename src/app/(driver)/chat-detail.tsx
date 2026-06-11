import React, { useEffect, useMemo, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, spacing } from '@/theme/tokens';
import { Button, Card, TextInput } from '@/components/BaseComponents';
import { Screen } from '@/components/ScreenComponents';
import { apiClient } from '@/services/api';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';

export default function DriverChatDetail() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuthStore();
  const { conversations, setConversations, addMessage } = useChatStore();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const conversation = useMemo(() => conversations.find((item) => item.id === id), [conversations, id]);

  useEffect(() => {
    if (!user) return;
    apiClient.getConversations(user.id).then(setConversations).catch(() => undefined);
  }, [user?.id]);

  useEffect(() => {
    if (!id || !user) return;
    apiClient
      .markConversationMessagesAsRead(id, user.id)
      .then(() => {
        setConversations(
          conversations.map((item) =>
            item.id === id
              ? {
                  ...item,
                  unreadCount: 0,
                  messages: item.messages.map((message) => ({ ...message, read: true })),
                }
              : item
          )
        );
      })
      .catch(() => undefined);
  }, [id, user?.id]);

  useEffect(() => {
    if (!id) return;

    const channelName = `driver-chat-detail-${id}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` }, async () => {
        if (user) {
          const latest = await apiClient.getConversations(user.id);
          setConversations(latest);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, user?.id]);

  const handleSend = async () => {
    if (!id || !user || !text.trim()) return;
    try {
      setSending(true);
      const message = await apiClient.sendMessage(id, text.trim(), user.id);
      addMessage(id, message);
      setText('');
    } finally {
      setSending(false);
    }
  };

  if (!conversation) {
    return (
      <Screen padding>
        <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>Không tìm thấy cuộc trò chuyện.</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll padding style={{ paddingBottom: 110 + insets.bottom }}>
      <Card style={{ marginBottom: spacing.lg }}>
        <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
          <Image source={{ uri: conversation.participantAvatar }} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceAlt }} />
          <View>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>
              {conversation.participantName}
            </Text>
            <Text style={{ color: colors.success, fontSize: fontSize.sm }}>Khách hàng</Text>
          </View>
        </View>
      </Card>

      {conversation.messages.map((message) => {
        const fromMe = message.sender === 'user';
        return (
          <View key={message.id} style={{ alignItems: fromMe ? 'flex-end' : 'flex-start', marginBottom: spacing.md }}>
            <View
              style={{
                maxWidth: '82%',
                padding: spacing.md,
                borderRadius: borderRadius.lg,
                backgroundColor: fromMe ? colors.primary : colors.surface,
              }}
            >
              <Text style={{ color: fromMe ? 'white' : colors.text, lineHeight: 20 }}>{message.text}</Text>
              <Text style={{ color: fromMe ? 'rgba(255,255,255,0.75)' : colors.textTertiary, fontSize: fontSize.xs, marginTop: spacing.xs }}>
                {new Date(message.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
        );
      })}

      <View
        style={{
          position: 'absolute',
          left: spacing.lg,
          right: spacing.lg,
          bottom: Math.max(insets.bottom, spacing.md),
          padding: spacing.sm,
          borderRadius: borderRadius.lg,
          backgroundColor: colors.surface,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        }}
      >
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Nhập tin nhắn..."
          disabled={sending}
          style={{ flex: 1 }}
        />
        <Button label="Gửi" onPress={handleSend} disabled={!text.trim() || sending} loading={sending} icon={<Send size={18} color="white" />} />
      </View>
    </Screen>
  );
}
