import React from 'react';
import { Image, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Heart, MessageCircle, Share2 } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, spacing } from '@/theme/tokens';
import { Card } from '@/components/BaseComponents';
import { Screen } from '@/components/ScreenComponents';
import { MOCK_BLOG_POSTS } from '@/services/mockData';

export default function BlogDetailScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const post = MOCK_BLOG_POSTS.find((item) => item.id === id) ?? MOCK_BLOG_POSTS[0];

  return (
    <Screen scroll padding>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md }}>
          <Image source={{ uri: post.driverAvatar }} style={{ width: 52, height: 52, borderRadius: 26 }} />
          <View>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{post.driverName}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
              {new Date(post.createdAt).toLocaleString('vi-VN')}
            </Text>
          </View>
        </View>
        <Text style={{ color: colors.text, fontSize: 16, lineHeight: 24, marginBottom: spacing.lg }}>
          {post.caption}
        </Text>
        {post.mediaUrls[0] && (
          <Image
            source={{ uri: post.mediaUrls[0] }}
            style={{ width: '100%', height: 260, borderRadius: borderRadius.lg, marginBottom: spacing.lg }}
          />
        )}
        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          <Text style={{ color: colors.text }}><Heart size={16} color={colors.error} /> {post.likes} thích</Text>
          <Text style={{ color: colors.text }}><MessageCircle size={16} color={colors.info} /> {post.comments} bình luận</Text>
          <Text style={{ color: colors.text }}><Share2 size={16} color={colors.primary} /> {post.shares} chia sẻ</Text>
        </View>
      </Card>
    </Screen>
  );
}
