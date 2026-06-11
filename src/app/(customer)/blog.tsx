import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Heart, MessageCircle, Share2 } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, spacing } from '@/theme/tokens';
import { Card } from '@/components/BaseComponents';
import { Screen } from '@/components/ScreenComponents';
import { MOCK_BLOG_POSTS } from '@/services/mockData';

export default function BlogScreen() {
  const { colors } = useTheme();

  return (
    <Screen scroll padding>
      {MOCK_BLOG_POSTS.map((post) => (
        <TouchableOpacity
          key={post.id}
          activeOpacity={0.86}
          onPress={() =>
            router.push({
              pathname: '/(customer)/blog-detail' as any,
              params: { id: post.id },
            })
          }
        >
          <Card style={{ marginBottom: spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md }}>
              <Image
                source={{ uri: post.driverAvatar }}
                style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceAlt }}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{post.driverName}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }}>
                  {new Date(post.createdAt).toLocaleDateString('vi-VN')}
                </Text>
              </View>
            </View>
            <Text style={{ color: colors.text, lineHeight: 22, marginBottom: spacing.md }}>
              {post.caption}
            </Text>
            {post.mediaUrls[0] && (
              <Image
                source={{ uri: post.mediaUrls[0] }}
                style={{
                  width: '100%',
                  height: 190,
                  borderRadius: borderRadius.lg,
                  backgroundColor: colors.surfaceAlt,
                  marginBottom: spacing.md,
                }}
              />
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.textSecondary }}><Heart size={14} color={colors.error} /> {post.likes}</Text>
              <Text style={{ color: colors.textSecondary }}><MessageCircle size={14} color={colors.info} /> {post.comments}</Text>
              <Text style={{ color: colors.textSecondary }}><Share2 size={14} color={colors.primary} /> {post.shares}</Text>
            </View>
          </Card>
        </TouchableOpacity>
      ))}
    </Screen>
  );
}
