import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Image, Text, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Camera, Edit3, Heart, MessageCircle, MoreVertical, Plus, Share2, Trash2, X } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { fontForWeight, borderRadius, fontSize, spacing } from '@/theme/tokens';
import { Button, Card, Skeleton, TextInput } from '@/components/BaseComponents';
import { EmptyState, Screen } from '@/components/ScreenComponents';
import { SearchFilterBar } from '@/components/SearchFilterBar';
import { apiClient } from '@/services/api';
import { uploadMediaToCloudinary } from '@/services/cloudinary';
import { useAuthStore } from '@/stores/authStore';
import { BlogPost } from '@/types';
import { showError, showSuccess, showWarning } from '@/utils/toast';
import { BlogMediaGrid } from '@/components/BlogMediaGrid';
import { SubmitOverlay } from '@/components/SubmitOverlay';
import { useSubmitLeaveGuard } from '@/hooks/useSubmitLeaveGuard';

const BLOG_FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'image', label: '📷 Có ảnh' },
  { key: 'video', label: '🎬 Có video' },
];

const BLOG_SORTS = [
  { key: 'newest', label: 'Mới nhất' },
  { key: 'oldest', label: 'Cũ nhất' },
  { key: 'mostLiked', label: 'Nhiều tim nhất' },
  { key: 'mostComments', label: 'Nhiều bình luận' },
];

const BLOG_PAGE_SIZE = 8;
const BLOG_CAPTION_MAX_LENGTH = 1200;
const BLOG_MAX_MEDIA = 10;
const BLOG_MAX_VIDEOS = 2;
const BLOG_MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const BLOG_MAX_VIDEO_BYTES = 80 * 1024 * 1024;

type BlogFormErrors = {
  caption?: string;
  media?: string;
};

function DriverBlogSkeleton() {
  return (
    <Card style={{ marginBottom: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md }}>
        <Skeleton width={44} height={44} borderRadius={22} />
        <View style={{ flex: 1, gap: spacing.sm }}>
          <Skeleton width="50%" height={14} />
          <Skeleton width="28%" height={10} />
        </View>
        <Skeleton width={32} height={32} borderRadius={16} />
      </View>
      <Skeleton width="88%" height={12} style={{ marginBottom: spacing.sm }} />
      <Skeleton width="64%" height={12} style={{ marginBottom: spacing.md }} />
      <Skeleton height={220} borderRadius={16} style={{ marginBottom: spacing.md }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Skeleton width="18%" height={14} />
        <Skeleton width="22%" height={14} />
        <Skeleton width="20%" height={14} />
      </View>
    </Card>
  );
}

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
  const [uploadProgress, setUploadProgress] = useState<{ active: boolean; percent: number; label: string }>({
    active: false,
    percent: 0,
    label: '',
  });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeSort, setActiveSort] = useState('newest');
  const [formErrors, setFormErrors] = useState<BlogFormErrors>({});
  const isUploadingBlogMedia = uploadProgress.active || (saving && showForm);

  useSubmitLeaveGuard(
    isUploadingBlogMedia,
    'Bài viết hoặc media đang được upload. Thoát lúc này có thể khiến tệp đã upload nhưng bài viết chưa được lưu.',
  );

  const loadPosts = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await apiClient.getBlogPosts(1, BLOG_PAGE_SIZE, { driverId: user.id });
      setPosts(data);
      setPage(1);
      setHasMore(data.length === BLOG_PAGE_SIZE);
    } catch (error: any) {
      showError('Không thể tải bài viết', error.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadMorePosts = async () => {
    if (!user || loading || loadingMore || !hasMore) return;
    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const data = await apiClient.getBlogPosts(nextPage, BLOG_PAGE_SIZE, { driverId: user.id });
      setPosts((current) => {
        const existingIds = new Set(current.map((post) => post.id));
        return [...current, ...data.filter((post) => !existingIds.has(post.id))];
      });
      setPage(nextPage);
      setHasMore(data.length === BLOG_PAGE_SIZE);
    } catch (error: any) {
      showError('Không thể tải thêm bài viết', error.message);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const filteredPosts = useMemo(() => {
    let result = [...posts];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) => p.caption?.toLowerCase().includes(q));
    }
    if (activeFilter === 'image') result = result.filter((p) => p.mediaTypes?.includes('image'));
    if (activeFilter === 'video') result = result.filter((p) => p.mediaTypes?.includes('video'));
    if (activeSort === 'newest') result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (activeSort === 'oldest') result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    if (activeSort === 'mostLiked') result.sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));
    if (activeSort === 'mostComments') result.sort((a, b) => (b.comments ?? 0) - (a.comments ?? 0));
    return result;
  }, [posts, search, activeFilter, activeSort]);

  const resetForm = () => {
    setCaption('');
    setMediaUrls([]);
    setMediaTypes([]);
    setFormErrors({});
    setEditingId(null);
    setMenuPostId(null);
    setShowForm(false);
  };

  const openCreateForm = () => {
    setCaption('');
    setMediaUrls([]);
    setMediaTypes([]);
    setFormErrors({});
    setEditingId(null);
    setMenuPostId(null);
    setShowForm(true);
  };

  const toggleForm = () => {
    if (showForm) {
      resetForm();
      return;
    }
    openCreateForm();
  };

  const pickMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showWarning('Cần quyền truy cập thư viện', 'Vui lòng cho phép ứng dụng chọn ảnh hoặc video.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.85,
    });
    if (result.canceled || result.assets.length === 0) return;
    if (mediaUrls.length + result.assets.length > BLOG_MAX_MEDIA) {
      showWarning('Quá số lượng media', `Mỗi bài viết chỉ nên có tối đa ${BLOG_MAX_MEDIA} ảnh/video.`);
      return;
    }

    const totalVideoCount =
      mediaTypes.filter((type) => type === 'video').length +
      result.assets.filter((asset) => asset.type === 'video').length;
    if (totalVideoCount > BLOG_MAX_VIDEOS) {
      showWarning('Quá số lượng video', `Mỗi bài viết chỉ nên có tối đa ${BLOG_MAX_VIDEOS} video để tải ổn định.`);
      return;
    }

    const oversizedAsset = result.assets.find((asset) => {
      const size = asset.fileSize ?? 0;
      return asset.type === 'video' ? size > BLOG_MAX_VIDEO_BYTES : size > BLOG_MAX_IMAGE_BYTES;
    });
    if (oversizedAsset) {
      showWarning(
        'Tệp quá lớn',
        oversizedAsset.type === 'video'
          ? 'Vui lòng chọn video dưới 80MB.'
          : 'Vui lòng chọn ảnh dưới 8MB.',
      );
      return;
    }

    try {
      setSaving(true);
      setUploadProgress({ active: true, percent: 0, label: `Chuẩn bị upload ${result.assets.length} tệp...` });
      const uploadedItems: { url: string; type: 'image' | 'video' }[] = [];

      for (let index = 0; index < result.assets.length; index += 1) {
        const asset = result.assets[index];
        const isVideo = asset.type === 'video';
        const label = `${isVideo ? 'Video' : 'Ảnh'} ${index + 1}/${result.assets.length}`;
        setUploadProgress({
          active: true,
          percent: Math.round((index / result.assets.length) * 100),
          label: `Đang upload ${label}`,
        });
        const uploaded = await uploadMediaToCloudinary({
          uri: asset.uri,
          name: asset.fileName ?? `post-${Date.now()}-${index}.${isVideo ? 'mp4' : 'jpg'}`,
          type: asset.mimeType ?? (isVideo ? 'video/mp4' : 'image/jpeg'),
        }, isVideo ? 'video' : 'image');
        uploadedItems.push({ url: uploaded.secure_url, type: isVideo ? 'video' : 'image' });
        setUploadProgress({
          active: true,
          percent: Math.round(((index + 1) / result.assets.length) * 100),
          label: `Đã upload ${label}`,
        });
      }

      setMediaUrls((current) => [...current, ...uploadedItems.map((item) => item.url)]);
      setMediaTypes((current) => [...current, ...uploadedItems.map((item) => item.type)]);
      setFormErrors((current) => ({ ...current, media: undefined }));
      showSuccess('Đã upload media', `${uploadedItems.length} tệp đã được thêm vào bài viết.`);
    } catch (error: any) {
      showError('Không thể upload media', error.message);
    } finally {
      setSaving(false);
      setTimeout(() => setUploadProgress({ active: false, percent: 0, label: '' }), 700);
    }
  };

  const validatePost = () => {
    const errors: BlogFormErrors = {};
    const cleanCaption = caption.trim();
    const videoCount = mediaTypes.filter((type) => type === 'video').length;

    if (!cleanCaption && mediaUrls.length === 0) {
      errors.caption = 'Vui lòng nhập nội dung hoặc upload media.';
    } else if (cleanCaption.length > BLOG_CAPTION_MAX_LENGTH) {
      errors.caption = `Nội dung tối đa ${BLOG_CAPTION_MAX_LENGTH} ký tự.`;
    }
    if (mediaUrls.length !== mediaTypes.length) {
      errors.media = 'Danh sách media chưa đồng bộ, vui lòng xóa và upload lại.';
    } else if (mediaUrls.length > BLOG_MAX_MEDIA) {
      errors.media = `Mỗi bài viết tối đa ${BLOG_MAX_MEDIA} ảnh/video.`;
    } else if (videoCount > BLOG_MAX_VIDEOS) {
      errors.media = `Mỗi bài viết tối đa ${BLOG_MAX_VIDEOS} video.`;
    } else if (mediaUrls.some((url) => !/^https?:\/\//i.test(url))) {
      errors.media = 'Media chưa có URL hợp lệ.';
    }

    setFormErrors(errors);
    return errors;
  };

  const savePost = async () => {
    if (!user) return;
    const errors = validatePost();
    const firstError = Object.values(errors).find(Boolean);
    if (firstError) {
      showError('Bài viết chưa hợp lệ', firstError);
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
      showSuccess('Đã lưu bài viết', 'Bài viết đã được cập nhật trong database.');
    } catch (error: any) {
      showError('Không thể lưu bài viết', error.message);
    } finally {
      setSaving(false);
    }
  };

  const editPost = (post: BlogPost) => {
    setEditingId(post.id);
    setCaption(post.caption);
    setMediaUrls(post.mediaUrls);
    setMediaTypes(post.mediaTypes);
    setFormErrors({});
    setMenuPostId(null);
    setShowForm(true);
  };

  const deletePost = (post: BlogPost) => {
    if (!user) return;
    const driverId = user.id;
    Alert.alert('Xóa bài viết', 'Bạn muốn xóa bài viết này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            setSaving(true);
            await apiClient.deleteBlogPost(post.id, driverId);
            await loadPosts();
            showSuccess('Đã xóa bài viết', 'Bài viết đã được xóa khỏi database.');
          } catch (error: any) {
            showError('Không thể xóa bài viết', error.message);
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
    <Screen scroll refreshing={loading} onRefresh={loadPosts}>
      <SubmitOverlay
        visible={isUploadingBlogMedia}
        message={uploadProgress.active ? uploadProgress.label || 'Đang upload media...' : 'Đang lưu bài viết...'}
        description={uploadProgress.active ? `${uploadProgress.percent}% hoàn tất` : 'Daigo đang lưu nội dung bài viết vào hệ thống.'}
      />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg, paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
        <View>
          <Text style={{ color: colors.text, fontSize: 22, ...fontForWeight('800')}}>Tin tức của tôi</Text>
          <Text style={{ color: colors.textSecondary, marginTop: spacing.xs }}>{posts.length} bài viết từ database</Text>
        </View>
        <TouchableOpacity
          onPress={toggleForm}
          disabled={saving}
          style={{ width: 44, height: 44, borderRadius: borderRadius.full, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}
        >
          {showForm ? <X size={22} color="white" /> : <Plus size={22} color="white" />}
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: spacing.lg }}>
        <SearchFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          placeholder="Tìm nội dung bài viết..."
          filters={BLOG_FILTERS}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          sortOptions={BLOG_SORTS}
          activeSort={activeSort}
          onSortChange={(key) => setActiveSort(key || 'newest')}
          resultCount={loading ? undefined : filteredPosts.length}
          resultLabel="bài viết"
        />
      </View>

      {showForm && (
        <Card style={{ marginBottom: spacing.lg }}>
          <Text style={{ color: colors.text, fontSize: 18, ...fontForWeight('800'), marginBottom: spacing.md }}>
            {editingId ? 'Sửa bài viết' : 'Tạo bài viết'}
          </Text>
          <TextInput
            value={caption}
            onChangeText={(value) => {
              setCaption(value);
              setFormErrors((current) => ({ ...current, caption: undefined }));
            }}
            placeholder="Bạn muốn chia sẻ điều gì với khách hàng?"
            multiline
            numberOfLines={4}
            disabled={saving}
            error={formErrors.caption}
            style={{ marginBottom: spacing.md }}
          />
          <TouchableOpacity
            onPress={pickMedia}
            disabled={saving}
            style={{ minHeight: 150, borderRadius: borderRadius.lg, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md, overflow: 'hidden' }}
          >
            <View style={{ alignItems: 'center', gap: spacing.sm, padding: spacing.lg }}>
              <Camera size={28} color={colors.primary} />
              <Text style={{ color: colors.textSecondary, ...fontForWeight('700'), textAlign: 'center' }}>
                {mediaUrls.length > 0 ? 'Thêm ảnh hoặc video khác' : 'Upload nhiều ảnh hoặc video'}
              </Text>
            </View>
          </TouchableOpacity>
          {uploadProgress.active && (
            <View style={{ marginBottom: spacing.md }}>
              <View style={{ height: 10, borderRadius: 5, backgroundColor: colors.surfaceAlt, overflow: 'hidden', marginBottom: spacing.xs }}>
                <View style={{ width: `${uploadProgress.percent}%`, height: '100%', backgroundColor: colors.primary }} />
              </View>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
                {uploadProgress.label} - {uploadProgress.percent}%
              </Text>
            </View>
          )}
          {!!formErrors.media && (
            <Text style={{ color: colors.error, fontSize: fontSize.xs, marginBottom: spacing.md }}>
              {formErrors.media}
            </Text>
          )}
          {mediaUrls.length > 0 && (
            <View style={{ marginBottom: spacing.md, gap: spacing.sm }}>
              <BlogMediaGrid urls={mediaUrls} types={mediaTypes} height={220} />
              <FlatList
                data={mediaUrls}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item, index) => `${item}-${index}`}
                contentContainerStyle={{ gap: spacing.sm }}
                renderItem={({ index }) => (
                  <TouchableOpacity
                    onPress={() => removeMedia(index)}
                    style={{ paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: borderRadius.full, backgroundColor: colors.error }}
                  >
                    <Text style={{ color: 'white', ...fontForWeight('800'), fontSize: fontSize.xs }}>
                      Xóa tệp {index + 1}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
          <Button label={editingId ? 'Lưu bài viết' : 'Đăng bài'} onPress={savePost} loading={saving} disabled={saving} />
        </Card>
      )}

      {loading ? (
        <>
          <DriverBlogSkeleton />
          <DriverBlogSkeleton />
        </>
      ) : filteredPosts.map((post) => (
        <View
          key={post.id}
          style={{
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md }}>
            <Image source={{ uri: post.driverAvatar }} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceAlt }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, ...fontForWeight('800')}}>{post.driverName}</Text>
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
            <View
              style={{
                position: 'absolute',
                right: spacing.lg,
                top: 64,
                zIndex: 20,
                padding: spacing.sm,
                borderRadius: borderRadius.md,
                backgroundColor: colors.surfaceAlt,
                borderWidth: 1,
                borderColor: colors.border,
                gap: spacing.xs,
              }}
            >
              <TouchableOpacity onPress={() => editPost(post)} disabled={saving} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm }}>
                <Edit3 size={16} color={colors.text} />
                <Text style={{ color: colors.text, ...fontForWeight('700')}}>Sửa bài viết</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deletePost(post)} disabled={saving} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm }}>
                <Trash2 size={16} color={colors.error} />
                <Text style={{ color: colors.error, ...fontForWeight('700')}}>Xóa bài viết</Text>
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity activeOpacity={0.88} onPress={() => openPost(post)}>
            {!!post.caption && <Text style={{ color: colors.text, lineHeight: 22, marginBottom: spacing.md }}>{post.caption}</Text>}
            {post.mediaUrls.length > 0 && (
              <View style={{ marginBottom: spacing.md }}>
                <BlogMediaGrid
                  urls={post.mediaUrls.slice(0, 4)}
                  types={post.mediaTypes.slice(0, 4)}
                  height={230}
                  active={false}
                  preload={false}
                />
              </View>
            )}
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md }}>
            <Text style={{ color: colors.textSecondary }}><Heart size={14} color={colors.error} /> {post.likes}</Text>
            <TouchableOpacity onPress={() => openPost(post)}>
              <Text style={{ color: colors.textSecondary }}><MessageCircle size={14} color={colors.info} /> {post.comments}</Text>
            </TouchableOpacity>
            <Text style={{ color: colors.textSecondary }}><Share2 size={14} color={colors.primary} /> Chia sẻ</Text>
          </View>
        </View>
      ))}

      {!loading && filteredPosts.length === 0 && (
        search || activeFilter !== 'all' ? (
          <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl }}>
            Không tìm thấy bài viết phù hợp.
          </Text>
        ) : (
          <EmptyState
            icon={<Camera size={48} color={colors.primary} />}
            title="Chưa có bài viết"
            description="Tạo bài viết đầu tiên để khách hàng xem tin tức từ tài xế"
          />
        )
      )}
      {!loading && hasMore && activeFilter === 'all' && !search.trim() && (
        <Button
          label={loadingMore ? 'Đang tải thêm...' : 'Tải thêm bài viết'}
          onPress={loadMorePosts}
          variant="outline"
          loading={loadingMore}
          disabled={loadingMore}
        />
      )}
    </Screen>
  );
}
