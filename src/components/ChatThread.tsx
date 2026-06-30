import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Linking, Modal, Platform, Text, TextInput as RNTextInput, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { router } from 'expo-router';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Download, Image as ImageIcon, PhoneCall, Play, Reply, RotateCcw, Send, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/BaseComponents';
import { SubmitOverlay } from '@/components/SubmitOverlay';
import { useSubmitLeaveGuard } from '@/hooks/useSubmitLeaveGuard';
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
import { buildCloudinaryVideoPosterUrl, buildOptimizedCloudinaryVideoUrl, shouldUseHlsVideo } from '@/services/videoOptimizationService';
import { ZoomableImage } from '@/components/ZoomableImage';

type ChatThreadProps = {
  conversation: ChatConversation;
  user: User;
  roleLabel: string;
  onMessageSent: (message: Message) => void;
  onMessageDeleted?: (messageId: string) => void;
};

const MAX_CHAT_IMAGE_BYTES = 5 * 1024 * 1024;
const CHAT_SEND_COOLDOWN_MS = 1500;

const formatMessageTime = (timestamp: string) =>
  new Date(timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

const formatCallDuration = (seconds?: number) => {
  if (!seconds) return '';
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

function ChatVideoPreview({ uri, onPress }: { uri: string; onPress: () => void }) {
  const posterUri = buildCloudinaryVideoPosterUrl(uri, { width: 520 });

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
      <View
        style={{
          width: 220,
          height: 220,
          borderRadius: borderRadius.lg,
          overflow: 'hidden',
          backgroundColor: '#0f172a',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {!!posterUri && <Image source={{ uri: posterUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: 54,
            height: 54,
            borderRadius: 27,
            backgroundColor: 'rgba(0,0,0,0.55)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Play size={24} color="white" fill="white" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function FullscreenChatVideo({ uri }: { uri: string }) {
  const posterUri = useMemo(() => buildCloudinaryVideoPosterUrl(uri, { width: 1080 }), [uri]);
  const sourceUri = useMemo(() => buildOptimizedCloudinaryVideoUrl(uri, { width: 1080, hls: shouldUseHlsVideo() }), [uri]);

  if (Constants.appOwnership === 'expo') {
    return (
      <View style={{ width: '100%', height: '78%', alignItems: 'center', justifyContent: 'center' }}>
        {!!posterUri && <Image source={{ uri: posterUri }} style={{ width: '100%', height: '100%', position: 'absolute' }} resizeMode="contain" />}
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}>
          <Play size={28} color="white" fill="white" />
        </View>
      </View>
    );
  }

  return <MountedFullscreenChatVideo sourceUri={sourceUri} />;
}

function MountedFullscreenChatVideo({ sourceUri }: { sourceUri: string }) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { VideoView, useVideoPlayer } = require('expo-video');
  const player = useVideoPlayer(sourceUri, (videoPlayer: any) => {
    videoPlayer.loop = false;
    videoPlayer.muted = false;
  });

  return (
    <VideoView
      player={player}
      style={{ width: '100%', height: '78%' }}
      contentFit="contain"
      nativeControls
      fullscreenOptions={{ enable: true, orientation: 'default' }}
    />
  );
}

export function ChatThread({ conversation, user, roleLabel, onMessageSent, onMessageDeleted }: ChatThreadProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [previewMedia, setPreviewMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const [participantTyping, setParticipantTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const callOptionsRef = useRef<BottomSheetModal>(null);
  const listRef = useRef<FlatList<Message>>(null);
  const lastSendAtRef = useRef(0);

  useSubmitLeaveGuard(
    uploadingImage,
    'Ảnh đang được upload và gửi vào cuộc trò chuyện. Thoát lúc này có thể khiến tin nhắn ảnh chưa gửi xong.',
  );

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
    if (Date.now() - lastSendAtRef.current < CHAT_SEND_COOLDOWN_MS) {
      showWarning('Bạn gửi hơi nhanh', 'Vui lòng chờ một chút trước khi gửi tin nhắn tiếp theo.');
      return;
    }
    try {
      setSending(true);
      lastSendAtRef.current = Date.now();
      broadcastTyping(false);
      const currentReply = replyTo;
      const message = await apiClient.sendMessage(conversation.id, text.trim(), user.id, undefined, currentReply?.id);
      onMessageSent({
        ...message,
        replyToMessageId: message.replyToMessageId ?? currentReply?.id,
        replyToText:
          message.replyToText ??
          (currentReply?.isDeleted
            ? 'Tin nhắn đã được thu hồi'
            : currentReply?.text || (currentReply?.mediaType === 'video' ? 'Video' : currentReply?.mediaType === 'image' ? 'Ảnh' : undefined)),
        replyToSenderName:
          message.replyToSenderName ??
          (currentReply ? (currentReply.sender === 'user' ? user.fullName : conversation.participantName) : undefined),
      });
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
    if (Date.now() - lastSendAtRef.current < CHAT_SEND_COOLDOWN_MS) {
      showWarning('Bạn gửi hơi nhanh', 'Vui lòng chờ một chút trước khi gửi ảnh tiếp theo.');
      return;
    }
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
      lastSendAtRef.current = Date.now();
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
      const currentReply = replyTo;
      const message = await apiClient.sendMessage(conversation.id, 'Đã gửi một ảnh', user.id, {
        url: uploaded.secure_url,
        type: 'image',
      }, currentReply?.id);
      onMessageSent({
        ...message,
        replyToMessageId: message.replyToMessageId ?? currentReply?.id,
        replyToText:
          message.replyToText ??
          (currentReply?.isDeleted
            ? 'Tin nhắn đã được thu hồi'
            : currentReply?.text || (currentReply?.mediaType === 'video' ? 'Video' : currentReply?.mediaType === 'image' ? 'Ảnh' : undefined)),
        replyToSenderName:
          message.replyToSenderName ??
          (currentReply ? (currentReply.sender === 'user' ? user.fullName : conversation.participantName) : undefined),
      });
      setReplyTo(null);
      showSuccess('Đã gửi ảnh', 'Ảnh đã được gửi trong cuộc trò chuyện.');
    } catch (error: any) {
      showError('Không thể gửi ảnh', error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleMessageLongPress = useCallback((message: Message) => {
    if (message.isDeleted) return;
    const actions = [
      {
        text: 'Trả lời',
        onPress: () => setReplyTo(message),
      },
    ];

    if (message.text && message.text !== 'Đã gửi một ảnh' && message.messageKind !== 'call') {
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
  }, [onMessageDeleted, user.id]);

  const scrollToMessage = useCallback((messageId?: string) => {
    if (!messageId) return;
    const index = messages.findIndex((message) => message.id === messageId);
    if (index < 0) {
      showWarning('Không tìm thấy tin nhắn gốc', 'Tin nhắn này có thể nằm ở cuộc trò chuyện cũ hoặc đã bị ẩn.');
      return;
    }
    listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
  }, [messages]);

  const startAgoraCall = useCallback(async () => {
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
  }, [conversation.bookingId, conversation.id, conversation.participantId, user.fullName, user.id]);

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

  const saveRemoteMedia = async (url: string, mediaType: 'image' | 'video') => {
    try {
      if (Constants.appOwnership === 'expo' && Platform.OS === 'android') {
        showError(
          'Cần development build',
          'Expo Go trên Android không còn cấp đủ quyền lưu media. Hãy cài APK/dev build mới để kiểm tra lưu ảnh/video thật.'
        );
        return;
      }

      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        showError(
          mediaType === 'image' ? 'Chưa có quyền lưu ảnh' : 'Chưa có quyền lưu video',
          'Vui lòng cho phép ứng dụng truy cập thư viện media.'
        );
        return;
      }

      const cleanUrl = url.split('?')[0];
      const ext = cleanUrl.split('.').pop()?.toLowerCase() || (mediaType === 'video' ? 'mp4' : 'jpg');
      const validImageExt = ['jpg', 'jpeg', 'png', 'webp'];
      const validVideoExt = ['mp4', 'mov', 'm4v'];
      const safeExt =
        mediaType === 'video'
          ? validVideoExt.includes(ext) ? ext : 'mp4'
          : validImageExt.includes(ext) ? ext : 'jpg';
      const filename = `daigo-chat-${Date.now()}.${safeExt}`;
      const downloaded = await FileSystem.downloadAsync(url, `${FileSystem.cacheDirectory}${filename}`);
      const asset = await MediaLibrary.createAssetAsync(downloaded.uri);
      const album = await MediaLibrary.getAlbumAsync('Daigo Booking');
      if (album) {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      } else {
        await MediaLibrary.createAlbumAsync('Daigo Booking', asset, false);
      }
      showSuccess(mediaType === 'image' ? 'Đã lưu ảnh' : 'Đã lưu video', 'Media đã được lưu vào thiết bị.');
    } catch (error: any) {
      showError(mediaType === 'image' ? 'Không thể tải ảnh' : 'Không thể tải video', error.message || 'Vui lòng thử lại sau.');
    }
  };

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const fromMe = item.sender === 'user';
    const showSeen = fromMe && item.id === lastOwnMessageId;
    const isMissedCall = item.text?.toLowerCase().includes('cuộc gọi nhỡ');
    const hasMedia = !!item.mediaUrl && (item.mediaType === 'image' || item.mediaType === 'video');
    const isCallLog = item.messageKind === 'call' || !!item.callSessionId;
    const isDeleted = !!item.isDeleted;
    const recalledText = fromMe ? 'Bạn đã thu hồi tin nhắn' : 'Người kia đã thu hồi tin nhắn';
    const replyLabel = item.replyToSenderName === user.fullName ? 'Bạn' : item.replyToSenderName ?? roleLabel;
    const callDuration = formatCallDuration(item.callDurationSeconds);

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
            padding: hasMedia && !isDeleted ? spacing.xs : spacing.md,
            backgroundColor: isDeleted
              ? colors.surfaceAlt
              : isMissedCall
                ? 'rgba(239,68,68,0.1)'
                : isCallLog
                  ? colors.surface
                  : fromMe
                    ? colors.primary
                    : colors.surface,
            borderWidth: fromMe && !isMissedCall && !isDeleted && !isCallLog ? 0 : 1,
            borderColor: isMissedCall ? colors.error : isDeleted ? colors.border : colors.border,
            ...shadows.xs,
          }}
        >
          {!!item.replyToText && (
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => scrollToMessage(item.replyToMessageId)}
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
                Trả lời {replyLabel}
              </Text>
              <Text numberOfLines={1} style={{ color: fromMe ? 'white' : colors.text, fontSize: fontSize.sm, marginTop: spacing.xs }}>
                {item.replyToText}
              </Text>
            </TouchableOpacity>
          )}
          {isDeleted && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <RotateCcw size={16} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary, fontStyle: 'italic', fontWeight: '800' }}>
                {recalledText}
              </Text>
            </View>
          )}
          {!isDeleted && isCallLog && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <PhoneCall size={17} color={isMissedCall ? colors.error : colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: isMissedCall ? colors.error : colors.text, fontWeight: '900' }}>
                  {item.text}
                </Text>
                {!!callDuration && (
                  <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 }}>
                    Thời lượng {callDuration}
                  </Text>
                )}
              </View>
            </View>
          )}
          {!isDeleted && item.mediaType === 'image' && item.mediaUrl && (
            <TouchableOpacity activeOpacity={0.9} onPress={() => setPreviewMedia({ url: item.mediaUrl!, type: 'image' })}>
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
          {!isDeleted && item.mediaType === 'video' && item.mediaUrl && (
            <ChatVideoPreview uri={item.mediaUrl} onPress={() => setPreviewMedia({ url: item.mediaUrl!, type: 'video' })} />
          )}
          {!isDeleted && !isCallLog && !!item.text && item.text !== 'Đã gửi một ảnh' && (
            <Text style={{ color: isMissedCall ? colors.error : fromMe ? 'white' : colors.text, lineHeight: 21, fontWeight: isMissedCall ? '900' : '400' }}>
              {item.text}
            </Text>
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
        {isMissedCall && (
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={startAgoraCall}
            style={{
              marginTop: spacing.sm,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderRadius: borderRadius.full,
              backgroundColor: colors.error,
            }}
          >
            <PhoneCall size={15} color="white" />
            <Text style={{ color: 'white', fontWeight: '900', fontSize: fontSize.sm }}>Gọi lại</Text>
          </TouchableOpacity>
        )}
        {showSeen && (
          <Text style={{ color: colors.textTertiary, fontSize: fontSize.xs, marginTop: spacing.xs, marginRight: spacing.xs }}>
            {item.read ? 'Đã xem' : 'Đã gửi'}
          </Text>
        )}
      </View>
    );
  }, [
    colors.border,
    colors.error,
    colors.primary,
    colors.surface,
    colors.surfaceAlt,
    colors.text,
    colors.textSecondary,
    colors.textTertiary,
    conversation.participantName,
    handleMessageLongPress,
    lastOwnMessageId,
    roleLabel,
    scrollToMessage,
    startAgoraCall,
    user.fullName,
  ]);

  const keyExtractor = useCallback((item: Message) => item.id, []);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 8}
    >
      <SubmitOverlay
        visible={uploadingImage}
        message="Đang gửi ảnh..."
        description="Daigo đang upload ảnh và tạo tin nhắn trong cuộc trò chuyện."
      />
      <ChatHeader
        conversation={conversation}
        roleLabel={roleLabel}
        onCallPress={startAgoraCall}
        onMenuPress={() => callOptionsRef.current?.present()}
      />

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={keyExtractor}
        renderItem={renderMessage}
        initialNumToRender={16}
        maxToRenderPerBatch={10}
        windowSize={9}
        removeClippedSubviews={Platform.OS === 'android'}
        inverted
        onScrollToIndexFailed={(info) => {
          setTimeout(() => listRef.current?.scrollToIndex({ index: info.index, animated: true }), 120);
        }}
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
          paddingBottom: Math.max(insets.bottom + spacing.xs, spacing.md),
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
          <RNTextInput
            value={text}
            onChangeText={handleTextChange}
            placeholder="Nhập tin nhắn..."
            editable={!sending && !uploadingImage}
            placeholderTextColor={colors.textTertiary}
            multiline
            returnKeyType="send"
            onSubmitEditing={() => {
              if (Platform.OS !== 'ios') sendText();
            }}
            style={{
              flex: 1,
              minHeight: 42,
              maxHeight: 110,
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.sm,
              color: colors.text,
              fontSize: fontSize.base,
              textAlignVertical: 'center',
            }}
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

      <Modal visible={!!previewMedia} transparent animationType="fade" onRequestClose={() => setPreviewMedia(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.94)', justifyContent: 'center' }}>
          <TouchableOpacity
            onPress={() => setPreviewMedia(null)}
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
          {previewMedia?.type === 'image' && (
            <ZoomableImage uri={previewMedia.url} style={{ width: '100%', height: '78%' }} />
          )}
          {previewMedia?.type === 'video' && (
            <FullscreenChatVideo uri={previewMedia.url} />
          )}
          {previewMedia && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => saveRemoteMedia(previewMedia.url, previewMedia.type)}
              style={{
                position: 'absolute',
                left: spacing.lg,
                right: spacing.lg,
                bottom: Math.max(insets.bottom + spacing.lg, spacing['2xl']),
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.sm,
                paddingVertical: spacing.md,
                borderRadius: borderRadius.full,
                backgroundColor: 'rgba(255,255,255,0.18)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.24)',
              }}
            >
              <Download size={20} color="white" />
              <Text style={{ color: 'white', fontWeight: '900' }}>
                {previewMedia.type === 'image' ? 'Tải ảnh về máy' : 'Tải video về máy'}
              </Text>
            </TouchableOpacity>
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
