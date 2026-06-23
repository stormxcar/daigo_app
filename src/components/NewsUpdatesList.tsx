import React from 'react';
import { FlatList, Image, Text, TouchableOpacity, View } from 'react-native';
import Constants from 'expo-constants';
import { useTheme } from '@/theme';
import { spacing, borderRadius, fontSize } from '@/theme/tokens';
import { BlogPost } from '@/types';
import { IllustrationBlock } from '@/components/IllustrationBlocks';
import { Newspaper, Play } from 'lucide-react-native';
import { buildCloudinaryVideoPosterUrl } from '@/services/videoOptimizationService';

function NewsVideoPreview({ uri }: { uri: string }) {
  const posterUri = buildCloudinaryVideoPosterUrl(uri, { width: 480 });
  if (Constants.appOwnership === 'expo') {
    return posterUri ? (
      <Image source={{ uri: posterUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
    ) : null;
  }

  return <NativeNewsVideoPreview uri={uri} />;
}

function NativeNewsVideoPreview({ uri }: { uri: string }) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { VideoView, useVideoPlayer } = require('expo-video');
  const player = useVideoPlayer(uri, (videoPlayer: any) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
  });

  return (
    <VideoView
      player={player}
      style={{ width: '100%', height: '100%' }}
      contentFit="cover"
      nativeControls={false}
      fullscreenOptions={{ enable: false }}
    />
  );
}

export const NewsUpdatesList: React.FC<{
  posts: BlogPost[];
  onPostPress?: (post: BlogPost) => void;
}> = ({ posts, onPostPress }) => {
  const { colors } = useTheme();
  if (posts.length === 0) return null;

  return (
    <View style={{ marginBottom: spacing.xl }}>
      <Text style={{ fontSize: fontSize.base, fontWeight: '800', color: colors.text, marginBottom: spacing.md, paddingHorizontal: spacing.md }}>
        Tin tức & khuyến mãi
      </Text>
      <FlatList
        data={posts}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: spacing.md }}
        renderItem={({ item }) => {
          const firstMediaUrl = item.mediaUrls[0];
          const firstMediaType = item.mediaTypes?.[0] ?? 'image';
          const hasRemoteMedia = firstMediaUrl?.startsWith('http');

          return (
            <TouchableOpacity activeOpacity={0.84} onPress={() => onPostPress?.(item)}>
              <View
                style={{
                  width: 228,
                  padding: spacing.md,
                  backgroundColor: colors.surface,
                  borderTopWidth: 1,
                  borderBottomWidth: 1,
                  borderColor: colors.border,
                }}
              >
                {hasRemoteMedia && firstMediaType === 'video' ? (
                  <View style={{ width: '100%', height: 100, borderRadius: borderRadius.sm, marginBottom: spacing.xs, overflow: 'hidden', backgroundColor: colors.surface }}>
                    <NewsVideoPreview uri={firstMediaUrl} />
                    <View
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: 0,
                        bottom: 0,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(15,23,42,0.22)',
                      }}
                    >
                      <View
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 17,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: 'rgba(0,0,0,0.48)',
                        }}
                      >
                        <Play size={16} color="white" fill="white" />
                      </View>
                    </View>
                  </View>
                ) : hasRemoteMedia ? (
                  <Image
                    source={{ uri: firstMediaUrl }}
                    style={{ width: '100%', height: 100, borderRadius: borderRadius.sm, marginBottom: spacing.xs }}
                  />
                ) : (
                  <View style={{ marginBottom: spacing.xs }}>
                    <IllustrationBlock height={100} tone="warning" icon={<Newspaper size={20} color="white" />} />
                  </View>
                )}
                <Text numberOfLines={2} style={{ fontSize: fontSize.sm, fontWeight: '600', color: colors.text }}>
                  {item.caption || 'Cập nhật từ tài xế'}
                </Text>
                <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs }}>
                  {item.driverName} - {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};
