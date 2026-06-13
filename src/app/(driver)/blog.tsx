import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Image, Text, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Camera, Edit3, Heart, MessageCircle, MoreVertical, Play, Plus, Share2, Trash2, X } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, spacing } from '@/theme/tokens';
import { Button, Card, CardSkeleton, TextInput } from '@/components/BaseComponents';
import { EmptyState, Screen } from '@/components/ScreenComponents';
import { apiClient } from '@/services/api';
import { uploadMediaToCloudinary } from '@/services/cloudinary';
import { useAuthStore } from '@/stores/authStore';
import { BlogPost } from '@/types';

export default function DriverBlog() {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [caption, setCaption] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaTypes, setMediaTypes] = useState<('image' | 'video')[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menuPostId, setMenuPostId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(8);

  const loadPosts = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await apiClient.getBlogPosts(1, 30, { driverId: user.id });
      setPosts(data);
    } catch (error: any) {
      Alert.alert('Không thể tải bài viết', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [user?.id]);

  const resetForm = () => {
    setCaption('');
    setMediaUrls([]);
    setMediaTypes([]);
    setEditingId(null);
    setShowForm(false);
  };

  const pickMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Cần quyền truy cập thư viện', 'Vui lòng cho phép ứng dụng chọn ảnh hoặc video.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.85,
    });
    if (result.canceled || result.assets.length === 0) return;

    try {
      setSaving(true);
      const uploadedItems = await Promise.all(
        result.assets.map(async (asset, index) => {
          const isVideo = asset.type === 'video';
          const uploaded = await uploadMediaToCloudinary({
            uri: asset.uri,
            name: asset.fileName ?? `post-${Date.now()}-${index}.${isVideo ? 'mp4' : 'jpg'}`,
            type: asset.mimeType ?? (isVideo ? 'video/mp4' : 'image/jpeg'),
          }, isVideo ? 'video' : 'image');
          return { url: uploaded.secure_url, type: isVideo ? 'video' as const : 'image' as const };
        })
      );
      setMediaUrls((current) => [...current, ...uploadedItems.map((item) => item.url)]);
      setMediaTypes((current) => [...current, ...uploadedItems.map((item) => item.type)]);
    } catch (error: any) {
      Alert.alert('Không thể upload media', error.message);
    } finally {
      setSaving(false);
    }
  };

  const savePost = async () => {
    if (!user) return;
    if (!caption.trim() && mediaUrls.length === 0) {
      Alert.alert('Bài viết chưa hợp lệ', 'Vui lòng nhập nội dung hoặc upload media.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        driverId: user.id,
        caption: caption.trim(),
        mediaUrls,
        mediaTypes,
      };
      if (editingId) {
        await apiClient.updateBlogPost(editingId, payload);
      } else {
        await apiClient.createBlogPost(payload);
      }
      await loadPosts();
      resetForm();
      Alert.alert('Đã lưu bài viết', 'Bài viết đã được cập nhật trong database.');
    } catch (error: any) {
      Alert.alert('Không thể lưu bài viết', error.message);
    } finally {
      setSaving(false);
    }
  };

  const editPost = (post: BlogPost) => {
    setEditingId(post.id);
    setCaption(post.caption);
    setMediaUrls(post.mediaUrls);
    setMediaTypes(post.mediaTypes);
    setMenuPostId(null);
    setShowForm(true);
  };

  const deletePost = (post: BlogPost) => {
    Alert.alert('Xóa bài viết', 'Bạn muốn xóa bài viết này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            setSaving(true);
            await apiClient.deleteBlogPost(post.id);
            await loadPosts();
          } catch (error: any) {
            Alert.alert('Không thể xóa bài viết', error.message);
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  const removeMedia = (index: number) => {
    setMediaUrls((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setMediaTypes((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const openPost = (post: BlogPost) => {
    router.push({ pathname: '/(driver)/blog-detail' as any, params: { id: post.id } });
  };

  return (
    <Screen scroll padding refreshing={loading} onRefresh={loadPosts}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
        <View>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>Tin tức của tôi</Text>
          <Text style={{ color: colors.textSecondary, marginTop: spacing.xs }}>{posts.length} bài viết từ database</Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowForm((value) => !value)}
          disabled={saving}
          style={{ width: 44, height: 44, borderRadius: borderRadius.full, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}
        >
          {showForm ? <X size={22} color="white" /> : <Plus size={22} color="white" />}
        </TouchableOpacity>
      </View>

      {showForm && (
        <Card style={{ marginBottom: spacing.lg }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: spacing.md }}>
            {editingId ? 'Sửa bài viết' : 'Tạo bài viết'}
          </Text>
          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="Bạn muốn chia sẻ điều gì với khách hàng?"
            multiline
            numberOfLines={4}
            disabled={saving}
            style={{ marginBottom: spacing.md }}
          />
          <TouchableOpacity
            onPress={pickMedia}
            disabled={saving}
            style={{ minHeight: 150, borderRadius: borderRadius.lg, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md, overflow: 'hidden' }}
          >
            <View style={{ alignItems: 'center', gap: spacing.sm, padding: spacing.lg }}>
              <Camera size={28} color={colors.primary} />
              <Text style={{ color: colors.textSecondary, fontWeight: '700', textAlign: 'center' }}>
                {mediaUrls.length > 0 ? 'Thêm ảnh hoặc video khác' : 'Upload nhiều ảnh hoặc video'}
              </Text>
            </View>
          </TouchableOpacity>
          {mediaUrls.length > 0 && (
            <FlatList
              data={mediaUrls}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, index) => `${item}-${index}`}
              contentContainerStyle={{ gap: spacing.sm, marginBottom: spacing.md }}
              renderItem={({ item, index }) => (
                <View style={{ width: 112, height: 112, borderRadius: borderRadius.md, overflow: 'hidden', backgroundColor: colors.surfaceAlt }}>
                  {mediaTypes[index] === 'image' ? (
                    <Image source={{ uri: item }} style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xs }}>
                      <Play size={24} color={colors.primary} />
                      <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }}>Video</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={() => removeMedia(index)}
                    style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.error, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <X size={14} color="white" />
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
          <Button label={editingId ? 'Lưu bài viết' : 'Đăng bài'} onPress={savePost} loading={saving} disabled={saving} />
        </Card>
      )}

      {loading ? (
        <>
          <CardSkeleton image style={{ marginBottom: spacing.lg }} />
          <CardSkeleton image style={{ marginBottom: spacing.lg }} />
        </>
      ) : posts.slice(0, visibleCount).map((post) => (
        <Card key={post.id} style={{ marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md }}>
            <Image source={{ uri: post.driverAvatar }} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceAlt }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '800' }}>{post.driverName}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }}>
                {new Date(post.createdAt).toLocaleString('vi-VN')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setMenuPostId((current) => (current === post.id ? null : post.id))}
              style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt }}
            >
              <MoreVertical size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
          {menuPostId === post.id && (
            <View style={{ alignSelf: 'flex-end', marginTop: -spacing.sm, marginBottom: spacing.md, padding: spacing.sm, borderRadius: borderRadius.md, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, gap: spacing.xs }}>
              <TouchableOpacity onPress={() => editPost(post)} disabled={saving} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm }}>
                <Edit3 size={16} color={colors.text} />
                <Text style={{ color: colors.text, fontWeight: '700' }}>Sửa bài viết</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deletePost(post)} disabled={saving} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm }}>
                <Trash2 size={16} color={colors.error} />
                <Text style={{ color: colors.error, fontWeight: '700' }}>Xóa bài viết</Text>
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity activeOpacity={0.88} onPress={() => openPost(post)}>
            {!!post.caption && <Text style={{ color: colors.text, lineHeight: 22, marginBottom: spacing.md }}>{post.caption}</Text>}
            {post.mediaUrls.length > 0 && (
              <FlatList
                data={post.mediaUrls}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item, index) => `${post.id}-${item}-${index}`}
                contentContainerStyle={{ gap: spacing.sm, marginBottom: spacing.md }}
                renderItem={({ item, index }) => (
                  post.mediaTypes[index] === 'image' ? (
                    <Image source={{ uri: item }} style={{ width: 220, height: 170, borderRadius: borderRadius.lg, backgroundColor: colors.surfaceAlt }} />
                  ) : (
                    <View style={{ width: 220, height: 170, borderRadius: borderRadius.lg, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}>
                      <Play size={32} color={colors.primary} />
                      <Text style={{ color: colors.textSecondary }}>Video Cloudinary</Text>
                    </View>
                  )
                )}
              />
            )}
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md }}>
            <Text style={{ color: colors.textSecondary }}><Heart size={14} color={colors.error} /> {post.likes}</Text>
            <TouchableOpacity onPress={() => openPost(post)}>
              <Text style={{ color: colors.textSecondary }}><MessageCircle size={14} color={colors.info} /> {post.comments}</Text>
            </TouchableOpacity>
            <Text style={{ color: colors.textSecondary }}><Share2 size={14} color={colors.primary} /> {post.shares}</Text>
          </View>
        </Card>
      ))}

      {!loading && posts.length === 0 && (
        <EmptyState
          icon={<Camera size={48} color={colors.primary} />}
          title="Chưa có bài viết"
          description="Tạo bài viết đầu tiên để khách hàng xem tin tức từ tài xế"
        />
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
