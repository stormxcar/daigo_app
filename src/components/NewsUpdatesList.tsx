import React from 'react';
import { FlatList, Image, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/theme';
import { spacing, borderRadius, fontSize } from '@/theme/tokens';
import { Card } from '@/components/BaseComponents';
import { BlogPost } from '@/types';
import { IllustrationBlock } from '@/components/IllustrationBlocks';
import { Newspaper } from 'lucide-react-native';

export const NewsUpdatesList: React.FC<{
  posts: BlogPost[];
  onPostPress?: (post: BlogPost) => void;
}> = ({ posts, onPostPress }) => {
  const { colors } = useTheme();
  if (posts.length === 0) return null;

  return (
    <View style={{ marginBottom: spacing.xl }}>
      <Text style={{ fontSize: fontSize.base, fontWeight: '800', color: colors.text, marginBottom: spacing.md }}>
        Tin tức & khuyến mãi
      </Text>
      <FlatList
        data={posts}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: spacing.md }}
        renderItem={({ item }) => (
          <TouchableOpacity activeOpacity={0.84} onPress={() => onPostPress?.(item)}>
            <Card style={{ width: 228, padding: spacing.md, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }}>
              {item.mediaUrls[0]?.startsWith('http') ? (
                <Image
                  source={{ uri: item.mediaUrls[0] }}
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
        )}
      />
    </View>
  );
};
