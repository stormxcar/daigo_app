import React from 'react';
import { FlatList, Image, Text, TouchableOpacity, View } from 'react-native';
import { ResizeMode, Video } from 'expo-av';
import { useTheme } from '@/theme';
import { spacing, borderRadius, fontSize } from '@/theme/tokens';
import { Card } from '@/components/BaseComponents';
import { BlogPost } from '@/types';
import { IllustrationBlock } from '@/components/IllustrationBlocks';
import { Newspaper, Play } from 'lucide-react-native';

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
              <Card style={{ width: 228, padding: spacing.md, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }}>
                {hasRemoteMedia && firstMediaType === 'video' ? (
                  <View style={{ width: '100%', height: 100, borderRadius: borderRadius.sm, marginBottom: spacing.xs, overflow: 'hidden', backgroundColor: colors.surface }}>
                    <Video
                      source={{ uri: firstMediaUrl }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode={ResizeMode.COVER}
                      shouldPlay={false}
                      isMuted
                    />
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
              </Card>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};
