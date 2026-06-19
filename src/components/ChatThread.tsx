import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Linking, Modal, Platform, Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Image as ImageIcon, Reply, Send, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, TextInput } from '@/components/BaseComponents';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, shadows, spacing } from '@/theme/tokens';
import { apiClient } from '@/services/api';
import { callService } from '@/services/callService';
import { uploadMediaToCloudinary } from '@/services/cloudinary';
import { supabase } from '@/services/supabase';
import { ChatConversation, Message, User } from '@/types';
import { showError, showSuccess, showWarning } from '@/utils/toast';
import { ChatHeader } from '@/components/ChatHeader';
import { CallOptionsBottomSheet } from '@/components/CallOptionsBottomSheet';

type ChatThreadProps = {
  conversation: ChatConversation;
  user: User;
  roleLabel: string;
  onMessageSent: (message: Message) => void;
  onMessageDeleted?: (messageId: string) => void;
};

const MAX_CHAT_IMAGE_BYTES = 5 * 1024 * 1024;

const formatMessageTime = (timestamp: string) =>
  new Date(timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

export function ChatThread({ conversation, user, roleLabel, onMessageSent, onMessageDeleted }: ChatThreadProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [participantTyping, setParticipantTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const callOptionsRef = useRef<BottomSheetModal>(null);

  const messages = useMemo(() => [...conversation.messages].reverse(), [conversation.messages]);
  const lastOwnMessageId = useMemo(
    () => [...conversation.messages].reverse().find((message) => message.sender === 'user')?.id,
    [conversation.messages],
  );

  useEffect(() => {
    const channel = supabase
      .channel(`typing-${conversation.id}`)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload?.userId === user.id) return;
        setParticipantTyping(!!payload?.typing);
      })
      .subscribe();

    typingChannelRef.current = channel;
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [conversation.id, user.id]);

  const broadcastTyping = (typing: boolean) => {
    typingChannelRef.current?.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: user.id, typing },
    });
  };

  const handleTextChange = (value: string) => {
    setText(value);
    if (!value.trim()) {
      broadcastTyping(false);
      return;
    }
    broadcastTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => broadcastTyping(false), 1400);
  };

  const sendText = async () => {
    if (!text.trim() || sending) return;
    try {
      setSending(true);
      broadcastTyping(false);
      const message = await apiClient.sendMessage(conversation.id, text.trim(), user.id, undefined, replyTo?.id);
      onMessageSent(message);
      setText('');
      setReplyTo(null);
    } catch (error: any) {
      showError('Không thể gửi tin nhắn', error.message);
    } finally {
      setSending(false);
    }
  };

  const sendImage = async () => {
    if (uploadingImage || sending) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showWarning('Cần quyền thư viện ảnh', 'Vui lòng cho phép ứng dụng chọn ảnh để gửi trong chat.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: false,
      quality: 0.82,
    });
    if (result.canceled || !result.assets[0]) return;

    try {
      setUploadingImage(true);
      const asset = result.assets[0];
      const fileSize =
        asset.fileSize ??
        ((await FileSystem.getInfoAsync(asset.uri)) as FileSystem.FileInfo & { size?: number }).size ??
        0;

      if (fileSize > MAX_CHAT_IMAGE_BYTES) {
        showWarning('Ảnh quá lớn', 'Vui lòng chọn ảnh dưới 5MB để gửi nhanh và ổn định hơn.');
        return;
      }

      const uploaded = await uploadMediaToCloudinary({
        uri: asset.uri,
        name: asset.fileName ?? `chat-${conversation.id}-${Date.now()}.jpg`,
        type: asset.mimeType ?? 'image/jpeg',
      }, 'image');
      const message = await apiClient.sendMessage(conversation.id, 'Đã gửi một ảnh', user.id, {
        url: uploaded.secure_url,
        type: 'image',
      }, replyTo?.id);
      onMessageSent(message);
      setReplyTo(null);
      showSuccess('Đã gửi ảnh', 'Ảnh đã được gửi trong cuộc trò chuyện.');
    } catch (error: any) {
      showError('Không thể gửi ảnh', error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleMessageLongPress = (message: Message) => {
    const actions = [
      {
        text: 'Trả lời',
        onPress: () => setReplyTo(message),
      },
    ];

    if (message.text && message.text !== 'Đã gửi một ảnh') {
      actions.push({
        text: 'Sao chép',
        onPress: async () => {
          await Clipboard.setStringAsync(message.text);
          showSuccess('Đã sao chép', 'Nội dung tin nhắn đã được lưu vào clipboard.');
        },
      });
    }

    if (message.sender === 'user') {
      actions.push({
        text: 'Xóa',
        onPress: async () => {
          try {
            await apiClient.deleteMessage(message.id, user.id);
            onMessageDeleted?.(message.id);
            showSuccess('Đã xóa tin nhắn');
          } catch (error: any) {
            showError('Không thể xóa tin nhắn', error.message);
          }
        },
      });
    }

    actions.push({ text: 'Hủy', onPress: () => undefined });
    Alert.alert('Tùy chọn tin nhắn', undefined, actions);
  };

  const startAgoraCall = async () => {
    if (!conversation.participantId) {
      showError('Không thể gọi', 'Không tìm thấy người nhận cuộc gọi.');
      return;
    }
    try {
      callOptionsRef.current?.dismiss();
      const call = await callService.createAgoraCall({
        callerId: user.id,
        receiverId: conversation.participantId,
        callerName: user.fullName,
        chatId: conversation.id,
        bookingId: conversation.bookingId,
      });
      router.push({ pathname: '/call' as any, params: { callId: call.id, mode: 'caller' } });
    } catch (error: any) {
      showError('Không thể bắt đầu cuộc gọi', error.message);
    }
  };

  const callPhoneNumber = async () => {
    callOptionsRef.current?.dismiss();
    if (!conversation.participantPhone) {
      showWarning('Chưa có số điện thoại', 'Người dùng này chưa cập nhật số điện thoại.');
      return;
    }

    Alert.alert(
      'Gọi số điện thoại',
      'Cuộc gọi này sẽ mở ứng dụng điện thoại và có thể phát sinh cước nhà mạng.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Gọi',
          onPress: async () => {
            try {
              await callService.createPhoneCallLog({
                callerId: user.id,
                receiverId: conversation.participantId,
                chatId: conversation.id,
                bookingId: conversation.bookingId,
              });
              await Linking.openURL(`tel:${conversation.participantPhone}`);
            } catch (error: any) {
              showError('Không thể gọi điện thoại', error.message);
            }
          },
        },
      ]
    );
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const fromMe = item.sender === 'user';
    const showSeen = fromMe && item.id === lastOwnMessageId;

    return (
      <View style={{ alignItems: fromMe ? 'flex-end' : 'flex-start', paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
        <TouchableOpacity
          activeOpacity={0.86}
          onLongPress={() => handleMessageLongPress(item)}
          style={{
            maxWidth: '84%',
            borderRadius: borderRadius.xl,
            borderTopRightRadius: fromMe ? borderRadius.sm : borderRadius.xl,
            borderTopLeftRadius: fromMe ? borderRadius.xl : borderRadius.sm,
            padding: item.mediaUrl ? spacing.xs : spacing.md,
            backgroundColor: fromMe ? colors.primary : colors.surface,
            borderWidth: fromMe ? 0 : 1,
            borderColor: colors.border,
            ...shadows.xs,
          }}
        >
          {!!item.replyToText && (
            <View
              style={{
                padding: spacing.sm,
                borderRadius: borderRadius.md,
                backgroundColor: fromMe ? 'rgba(255,255,255,0.16)' : colors.surfaceAlt,
                marginBottom: spacing.sm,
                borderLeftWidth: 3,
                borderLeftColor: fromMe ? 'white' : colors.primary,
              }}
            >
              <Text style={{ color: fromMe ? 'rgba(255,255,255,0.8)' : colors.textSecondary, fontSize: fontSize.xs, fontWeight: '800' }}>
                Trả lời {item.replyToSenderName ?? 'tin nhắn'}
              </Text>
              <Text numberOfLines={1} style={{ color: fromMe ? 'white' : colors.text, fontSize: fontSize.sm, marginTop: spacing.xs }}>
                {item.replyToText}
              </Text>
            </View>
          )}
          {item.mediaType === 'image' && item.mediaUrl && (
            <TouchableOpacity activeOpacity={0.9} onPress={() => setPreviewImageUrl(item.mediaUrl ?? null)}>
              <Image
                source={{ uri: item.mediaUrl }}
                style={{
                  width: 220,
                  height: 220,
                  borderRadius: borderRadius.lg,
                  backgroundColor: colors.surfaceAlt,
                  marginBottom: item.text && item.text !== 'Đã gửi một ảnh' ? spacing.sm : 0,
                }}
                resizeMode="cover"
              />
            </TouchableOpacity>
          )}
          {!!item.text && item.text !== 'Đã gửi một ảnh' && (
            <Text style={{ color: fromMe ? 'white' : colors.text, lineHeight: 21 }}>{item.text}</Text>
          )}
          <Text
            style={{
              color: fromMe ? 'rgba(255,255,255,0.78)' : colors.textTertiary,
              fontSize: fontSize.xs,
              marginTop: item.text && item.text !== 'Đã gửi một ảnh' ? spacing.xs : spacing.sm,
              textAlign: fromMe ? 'right' : 'left',
            }}
          >
            {formatMessageTime(item.timestamp)}
          </Text>
        </TouchableOpacity>
        {showSeen && (
          <Text style={{ color: colors.textTertiary, fontSize: fontSize.xs, marginTop: spacing.xs, marginRight: spacing.xs }}>
            {item.read ? 'Đã xem' : 'Đã gửi'}
          </Text>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 18}
    >
      <ChatHeader
        conversation={conversation}
        roleLabel={roleLabel}
        onCallPress={startAgoraCall}
        onMenuPress={() => callOptionsRef.current?.present()}
      />

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        inverted
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: spacing.lg, paddingBottom: spacing.md }}
        ListFooterComponent={
          <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md, alignItems: 'center' }}>
            <Text style={{ color: colors.textTertiary, fontSize: fontSize.xs, textAlign: 'center' }}>
              Cuộc trò chuyện này gắn với booking. Không chia sẻ thông tin nhạy cảm ngoài ứng dụng.
            </Text>
          </View>
        }
      />

      {participantTyping && (
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xs }}>
          <Text style={{ color: colors.textTertiary, fontSize: fontSize.sm, fontStyle: 'italic' }}>
            {conversation.participantName} đang nhập...
          </Text>
        </View>
      )}

      <View
        style={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm,
          paddingBottom: Math.max(insets.bottom, spacing.md),
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.background,
        }}
      >
        {!!replyTo && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              padding: spacing.sm,
              borderRadius: borderRadius.md,
              backgroundColor: colors.surfaceAlt,
              marginBottom: spacing.sm,
            }}
          >
            <Reply size={16} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '800', fontSize: fontSize.sm }}>Đang trả lời</Text>
              <Text numberOfLines={1} style={{ color: colors.textSecondary, fontSize: fontSize.xs, marginTop: spacing.xs }}>
                {replyTo.text || 'Ảnh'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setReplyTo(null)}>
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            padding: spacing.sm,
            borderRadius: borderRadius.xl,
            backgroundColor: colors.surface,
            ...shadows.sm,
          }}
        >
          <TouchableOpacity
            onPress={sendImage}
            disabled={uploadingImage || sending}
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.surfaceAlt,
            }}
          >
            {uploadingImage ? <ActivityIndicator size="small" color={colors.primary} /> : <ImageIcon size={20} color={colors.primary} />}
          </TouchableOpacity>
          <TextInput
            value={text}
            onChangeText={handleTextChange}
            placeholder="Nhập tin nhắn..."
            disabled={sending || uploadingImage}
            style={{ flex: 1 }}
          />
          <Button
            label=""
            onPress={sendText}
            disabled={!text.trim() || sending || uploadingImage}
            loading={sending}
            icon={<Send size={18} color="white" />}
            style={{ width: 46, height: 46, paddingHorizontal: 0, paddingVertical: 0, borderRadius: 23 }}
          />
        </View>
      </View>

      <Modal visible={!!previewImageUrl} transparent animationType="fade" onRequestClose={() => setPreviewImageUrl(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.94)', justifyContent: 'center' }}>
          <TouchableOpacity
            onPress={() => setPreviewImageUrl(null)}
            style={{
              position: 'absolute',
              top: Math.max(insets.top, spacing.lg),
              right: spacing.lg,
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: 'rgba(255,255,255,0.16)',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2,
            }}
          >
            <X size={24} color="white" />
          </TouchableOpacity>
          {previewImageUrl && (
            <Image source={{ uri: previewImageUrl }} style={{ width: '100%', height: '78%' }} resizeMode="contain" />
          )}
        </View>
      </Modal>
      <CallOptionsBottomSheet
        ref={callOptionsRef}
        hasPhone={!!conversation.participantPhone}
        onAgoraCall={startAgoraCall}
        onPhoneCall={callPhoneNumber}
        onCancel={() => callOptionsRef.current?.dismiss()}
      />
    </KeyboardAvoidingView>
  );
}
