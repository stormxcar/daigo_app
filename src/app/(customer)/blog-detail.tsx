import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Heart, MessageCircle, Send, Share2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { fontForWeight, fontSize, spacing } from '@/theme/tokens';
import { Button, CardSkeleton, TextInput } from '@/components/BaseComponents';
import { Screen } from '@/components/ScreenComponents';
import { apiClient } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { BlogComment, BlogPost } from '@/types';
import { showError, showSuccess, showWarning } from '@/utils/toast';
import { shareBlogPostNative } from '@/utils/share';
import { BlogMediaGrid } from '@/components/BlogMediaGrid';

const COMMENT_COOLDOWN_MS = 10_000;

export default function BlogDetailScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user, isAuthenticated } = useAuthStore();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<BlogComment | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const lastCommentAtRef = useRef(0);

  const loadPost = useCallback(async () => {
    if (!id) return;
    try {
      setInitialLoading(true);
      const [postData, commentData] = await Promise.all([
        apiClient.getBlogPostById(id),
        apiClient.getBlogComments(id),
      ]);
      setPost(postData);
      setComments(commentData);
    } catch {
      setPost(null);
    } finally {
      setInitialLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  const requireAuth = (action: string) => {
    if (isAuthenticated && user) return true;
    showWarning('Bạn cần đăng nhập', `Vui lòng đăng nhập để ${action}.`);
    router.push('/(auth)/login');
    return false;
  };

  const toggleLike = async () => {
    if (!post || loading) return;
    if (!requireAuth('thích bài viết')) return;
    try {
      setLoading(true);
      const updated = await apiClient.toggleBlogLike(post.id, user!.id);
      setPost(updated);
    } catch (error: any) {
      showError('Không thể thả tim', error.message);
    } finally {
      setLoading(false);
    }
  };

  const submitComment = async () => {
    if (!post || !commentText.trim() || loading) return;
    if (!requireAuth('bình luận bài viết')) return;
    const remainingMs = COMMENT_COOLDOWN_MS - (Date.now() - lastCommentAtRef.current);
    if (remainingMs > 0) {
      showWarning(
        'Gửi quá nhanh',
        `Vui lòng chờ thêm ${Math.ceil(remainingMs / 1000)} giây trước khi bình luận tiếp.`,
      );
      return;
    }
    try {
      lastCommentAtRef.current = Date.now();
      setLoading(true);
      const comment = await apiClient.createBlogComment(post.id, user!.id, commentText.trim(), replyTo?.id);
      setComments((current) => [...current, comment]);
      setCommentText('');
      setReplyTo(null);
      setPost(await apiClient.getBlogPostById(post.id));
    } catch (error: any) {
      lastCommentAtRef.current = 0;
      showError('Không thể bình luận', error.message);
    } finally {
      setLoading(false);
    }
  };

  const sharePost = async () => {
    if (!post || loading) return;
    try {
      setLoading(true);
      await shareBlogPostNative(post);
      showSuccess('Đã mở chia sẻ', 'Chọn ứng dụng bạn muốn gửi bài viết đến.');
    } catch (error: any) {
      showError('Không thể chia sẻ', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <Screen padding>
        <CardSkeleton image style={{ marginBottom: spacing.lg }} />
        <CardSkeleton />
      </Screen>
    );
  }

  if (!post) {
    return (
      <Screen padding>
        <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>Không tìm thấy bài viết.</Text>
      </Screen>
    );
  }

  const parentComments = comments.filter((comment) => !comment.parentCommentId);
  const getReplies = (commentId: string) =>
    comments.filter((comment) => comment.parentCommentId === commentId);

  return (
    <Screen scroll>
      <View
        style={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: spacing.md,
          backgroundColor: colors.background,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md }}>
          <Image source={{ uri: post.driverAvatar }} style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.surfaceAlt }} />
          <View>
            <Text style={{ color: colors.text, fontSize: 18, ...fontForWeight('700')}}>{post.driverName}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
              {new Date(post.createdAt).toLocaleString('vi-VN')}
            </Text>
          </View>
        </View>
        <Text style={{ color: colors.text, fontSize: 16, lineHeight: 24, marginBottom: spacing.lg }}>
          {post.caption}
        </Text>
        {post.mediaUrls.length > 0 && (
          <View style={{ marginBottom: spacing.lg }}>
            <BlogMediaGrid urls={post.mediaUrls} types={post.mediaTypes} height={320} />
          </View>
        )}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <TouchableOpacity onPress={toggleLike} disabled={loading} style={{ flex: 1, alignItems: 'center', padding: spacing.sm }}>
            <Heart size={20} color={post.liked ? colors.error : colors.textSecondary} fill={post.liked ? colors.error : 'transparent'} />
            <Text style={{ color: colors.text, marginTop: spacing.xs }}>{post.likes} thích</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center', padding: spacing.sm }}>
            <MessageCircle size={20} color={colors.info} />
            <Text style={{ color: colors.text, marginTop: spacing.xs }}>{post.comments} bình luận</Text>
          </View>
          <TouchableOpacity onPress={sharePost} disabled={loading} style={{ flex: 1, alignItems: 'center', padding: spacing.sm }}>
            <Share2 size={20} color={colors.primary} />
            <Text style={{ color: colors.text, marginTop: spacing.xs }}>Chia sẻ</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View
        style={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: Math.max(insets.bottom + spacing.xl, spacing['2xl']),
          backgroundColor: colors.background,
        }}
      >
        <Text style={{ color: colors.text, fontSize: 18, ...fontForWeight('800'), marginBottom: spacing.md }}>Bình luận</Text>
        {parentComments.length === 0 && (
          <View
            style={{
              paddingVertical: spacing.xl,
              borderTopWidth: 1,
              borderBottomWidth: 1,
              borderColor: colors.border,
              marginBottom: spacing.md,
            }}
          >
            <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
              Chưa có bình luận nào.
            </Text>
          </View>
        )}
        {parentComments.map((comment) => (
          <View
            key={comment.id}
            style={{
              paddingVertical: spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <Image source={{ uri: comment.authorAvatar }} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surfaceAlt }} />
              <View style={{ flex: 1 }}>
                <View style={{ paddingVertical: spacing.xs }}>
                  <Text style={{ color: colors.text, ...fontForWeight('800')}}>{comment.authorName}</Text>
                  <Text style={{ color: colors.text, marginTop: spacing.xs, lineHeight: 20 }}>{comment.text}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    if (!requireAuth('trả lời bình luận')) return;
                    setReplyTo(comment);
                  }}
                  style={{ alignSelf: 'flex-start', paddingVertical: spacing.xs }}
                >
                  <Text style={{ color: colors.primary, fontSize: fontSize.sm, ...fontForWeight('800')}}>Trả lời</Text>
                </TouchableOpacity>

                {getReplies(comment.id).map((reply) => (
                  <View
                    key={reply.id}
                    style={{
                      flexDirection: 'row',
                      gap: spacing.sm,
                      marginTop: spacing.sm,
                      paddingTop: spacing.sm,
                      borderTopWidth: 1,
                      borderTopColor: colors.border,
                    }}
                  >
                    <Image source={{ uri: reply.authorAvatar }} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surfaceAlt }} />
                    <View style={{ flex: 1, paddingVertical: spacing.xs }}>
                      <Text style={{ color: colors.text, ...fontForWeight('800'), fontSize: fontSize.sm }}>{reply.authorName}</Text>
                      <Text style={{ color: colors.text, marginTop: spacing.xs, lineHeight: 19 }}>{reply.text}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ))}
        {replyTo && (
          <View
            style={{
              paddingVertical: spacing.sm,
              borderTopWidth: 1,
              borderBottomWidth: 1,
              borderColor: colors.border,
              marginBottom: spacing.sm,
            }}
          >
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
              Đang trả lời {replyTo.authorName}
            </Text>
            <TouchableOpacity onPress={() => setReplyTo(null)} style={{ marginTop: spacing.xs }}>
              <Text style={{ color: colors.primary, ...fontForWeight('800')}}>Hủy trả lời</Text>
            </TouchableOpacity>
          </View>
        )}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: spacing.sm,
            marginTop: spacing.lg,
            paddingTop: spacing.md,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <TextInput
            value={commentText}
            onChangeText={setCommentText}
            placeholder="Viết bình luận..."
            disabled={loading}
            style={{ flex: 1 }}
          />
          <Button
            label="Gửi"
            onPress={submitComment}
            disabled={!commentText.trim() || loading}
            loading={loading}
            icon={<Send size={18} color="white" />}
            style={{ minHeight: 50 }}
          />
        </View>
      </View>
    </Screen>
  );
}
