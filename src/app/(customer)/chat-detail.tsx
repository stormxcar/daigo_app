import React from 'react';
import { Image, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Send } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, spacing } from '@/theme/tokens';
import { Button, Card, TextInput } from '@/components/BaseComponents';
import { Screen } from '@/components/ScreenComponents';
import { MOCK_CONVERSATIONS } from '@/services/mockData';

export default function ChatDetailScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const conversation = MOCK_CONVERSATIONS.find((item) => item.id === id) ?? MOCK_CONVERSATIONS[0];

  return (
    <Screen scroll padding>
      <Card style={{ marginBottom: spacing.lg }}>
        <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
          <Image source={{ uri: conversation.participantAvatar }} style={{ width: 48, height: 48, borderRadius: 24 }} />
          <View>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>
              {conversation.participantName}
            </Text>
            <Text style={{ color: colors.success, fontSize: fontSize.sm }}>Đang hoạt động</Text>
          </View>
        </View>
      </Card>

      {conversation.messages.map((message) => {
        const fromUser = message.sender === 'user';
        return (
          <View
            key={message.id}
            style={{
              alignItems: fromUser ? 'flex-end' : 'flex-start',
              marginBottom: spacing.md,
            }}
          >
            <View
              style={{
                maxWidth: '82%',
                padding: spacing.md,
                borderRadius: borderRadius.lg,
                backgroundColor: fromUser ? colors.primary : colors.surface,
              }}
            >
              <Text style={{ color: fromUser ? 'white' : colors.text, lineHeight: 20 }}>
                {message.text}
              </Text>
              <Text
                style={{
                  color: fromUser ? 'rgba(255,255,255,0.75)' : colors.textTertiary,
                  fontSize: fontSize.xs,
                  marginTop: spacing.xs,
                }}
              >
                {new Date(message.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
        );
      })}

      <Card>
        <TextInput
          value=""
          onChangeText={() => {}}
          placeholder="Nhập tin nhắn..."
          style={{ marginBottom: spacing.md }}
        />
        <Button label="Gửi tin nhắn" onPress={() => {}} icon={<Send size={18} color="white" />} />
      </Card>
    </Screen>
  );
}
