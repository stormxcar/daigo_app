import React, { useEffect, useState } from 'react';
import { Alert, Image, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Heart, MessageCircle, Share2 } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, spacing } from '@/theme/tokens';
import { Button, Card, CardSkeleton } from '@/components/BaseComponents';
import { Screen } from '@/components/ScreenComponents';
import { apiClient } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { BlogPost } from '@/types';

export default function BlogScreen() {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(8);

  const loadPosts = async () => {
    setLoading(true);
    apiClient.getBlogPosts()
      .then(setPosts)
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const updatePost = (updated: BlogPost) => {
    setPosts((current) => current.map((post) => (post.id === updated.id ? updated : post)));
  };

  const toggleLike = async (post: BlogPost) => {
    if (!user) return;
    try {
      updatePost(await apiClient.toggleBlogLike(post.id, user.id));
    } catch (error: any) {
      Alert.alert('Không thể thả tim', error.message);
    }
  };

  const sharePost = async (post: BlogPost) => {
    if (!user) return;
    try {
      updatePost(await apiClient.shareBlogPost(post.id, user.id));
      Alert.alert('Đã chia sẻ', 'Lượt chia sẻ đã được lưu.');
    } catch (error: any) {
      Alert.alert('Không thể chia sẻ', error.message);
    }
  };

  return (
    <Screen scroll padding refreshing={loading} onRefresh={loadPosts}>
      {loading ? (
        <>
          <CardSkeleton image style={{ marginBottom: spacing.lg }} />
          <CardSkeleton image style={{ marginBottom: spacing.lg }} />
        </>
      ) : posts.slice(0, visibleCount).map((post) => (
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
              <TouchableOpacity onPress={() => toggleLike(post)} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <Heart size={14} color={post.liked ? colors.error : colors.textSecondary} fill={post.liked ? colors.error : 'transparent'} />
                <Text style={{ color: colors.textSecondary }}>{post.likes}</Text>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <MessageCircle size={14} color={colors.info} />
                <Text style={{ color: colors.textSecondary }}>{post.comments}</Text>
              </View>
              <TouchableOpacity onPress={() => sharePost(post)} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <Share2 size={14} color={colors.primary} />
                <Text style={{ color: colors.textSecondary }}>{post.shares}</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </TouchableOpacity>
      ))}
      {!loading && posts.length === 0 && (
        <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl }}>
          Chưa có bài viết trong database.
        </Text>
      )}
      {!loading && posts.length > visibleCount && (
        <Button
          label="Tải thêm bài viết"
          onPress={() => setVisibleCount((current) => current + 8)}
          variant="outline"
        />
      )}
    </Screen>
  );
}
