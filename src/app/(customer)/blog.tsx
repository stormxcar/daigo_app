import React, { useEffect, useMemo, useState } from "react";
import { FlatList, Image, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Heart, MessageCircle, Share2 } from "lucide-react-native";
import { useTheme } from "@/theme";
import { fontSize, spacing } from "@/theme/tokens";
import { Button, Card, Skeleton } from "@/components/BaseComponents";
import { Screen } from "@/components/ScreenComponents";
import { SearchFilterBar } from "@/components/SearchFilterBar";
import { apiClient } from "@/services/api";
import { useAuthStore } from "@/stores/authStore";
import { BlogPost } from "@/types";
import { showError, showSuccess, showWarning } from "@/utils/toast";
import { shareBlogPostNative } from "@/utils/share";
import { BlogMediaGrid } from "@/components/BlogMediaGrid";
import { useVideoFeedPlayback } from "@/hooks/useVideoFeedPlayback";

const BLOG_FILTERS = [
  { key: "all", label: "Tất cả" },
  { key: "image", label: "📷 Có ảnh" },
  { key: "video", label: "🎬 Có video" },
  { key: "liked", label: "❤️ Đã thích" },
];

const BLOG_SORTS = [
  { key: "newest", label: "Mới nhất" },
  { key: "oldest", label: "Cũ nhất" },
  { key: "mostLiked", label: "Nhiều tim nhất" },
  { key: "mostComments", label: "Nhiều bình luận" },
];

const BLOG_PAGE_SIZE = 8;

function BlogPostSkeleton() {
  return (
    <Card style={{ marginBottom: spacing.lg }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md }}>
        <Skeleton width={44} height={44} borderRadius={22} />
        <View style={{ flex: 1, gap: spacing.sm }}>
          <Skeleton width="46%" height={14} />
          <Skeleton width="30%" height={10} />
        </View>
      </View>
      <Skeleton width="92%" height={12} style={{ marginBottom: spacing.sm }} />
      <Skeleton width="70%" height={12} style={{ marginBottom: spacing.md }} />
      <Skeleton height={230} borderRadius={16} style={{ marginBottom: spacing.md }} />
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Skeleton width="18%" height={14} />
        <Skeleton width="22%" height={14} />
        <Skeleton width="20%" height={14} />
      </View>
    </Card>
  );
}

export default function BlogScreen() {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeSort, setActiveSort] = useState("newest");

  const loadPosts = async () => {
    setLoading(true);
    apiClient
      .getBlogPosts(1, BLOG_PAGE_SIZE)
      .then((data) => {
        setPosts(data);
        setPage(1);
        setHasMore(data.length === BLOG_PAGE_SIZE);
      })
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  };

  const loadMorePosts = async () => {
    if (loading || loadingMore || !hasMore) return;
    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const data = await apiClient.getBlogPosts(nextPage, BLOG_PAGE_SIZE);
      setPosts((current) => {
        const existingIds = new Set(current.map((post) => post.id));
        return [...current, ...data.filter((post) => !existingIds.has(post.id))];
      });
      setPage(nextPage);
      setHasMore(data.length === BLOG_PAGE_SIZE);
    } catch (error: any) {
      showError("Không thể tải thêm", error.message);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const updatePost = (updated: BlogPost) => {
    setPosts((current) =>
      current.map((post) => (post.id === updated.id ? updated : post)),
    );
  };

  const requireAuth = (action: string) => {
    if (user) return true;
    showWarning("Bạn cần đăng nhập", `Vui lòng đăng nhập để ${action}.`);
    router.push("/(auth)/login");
    return false;
  };

  const toggleLike = async (post: BlogPost) => {
    if (!requireAuth("thích bài viết")) return;
    try {
      updatePost(await apiClient.toggleBlogLike(post.id, user!.id));
    } catch (error: any) {
      showError("Không thể thả tim", error.message);
    }
  };

  const sharePost = async (post: BlogPost) => {
    try {
      await shareBlogPostNative(post);
      showSuccess("Đã mở chia sẻ", "Chọn ứng dụng bạn muốn gửi bài viết đến.");
    } catch (error: any) {
      showError("Không thể chia sẻ", error.message);
    }
  };

  const filteredPosts = useMemo(() => {
    let result = [...posts];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.caption?.toLowerCase().includes(q) ||
          p.driverName?.toLowerCase().includes(q),
      );
    }

    // Filter
    if (activeFilter === "image")
      result = result.filter((p) => p.mediaTypes?.includes("image"));
    if (activeFilter === "video")
      result = result.filter((p) => p.mediaTypes?.includes("video"));
    if (activeFilter === "liked") result = result.filter((p) => p.liked);

    // Sort
    if (activeSort === "newest")
      result.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    if (activeSort === "oldest")
      result.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    if (activeSort === "mostLiked")
      result.sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));
    if (activeSort === "mostComments")
      result.sort((a, b) => (b.comments ?? 0) - (a.comments ?? 0));

    return result;
  }, [posts, search, activeFilter, activeSort]);

  const videoPlayback = useVideoFeedPlayback(filteredPosts);

  const renderPost = ({ item: post }: { item: BlogPost }) => (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={() =>
        router.push({
          pathname: "/(customer)/blog-detail" as any,
          params: { id: post.id },
        })
      }
    >
      <View
        style={{
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.md,
            marginBottom: spacing.md,
          }}
        >
          <Image
            source={{ uri: post.driverAvatar }}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.surfaceAlt,
            }}
          />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: "700" }}>
              {post.driverName}
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: fontSize.xs,
              }}
            >
              {new Date(post.createdAt).toLocaleDateString("vi-VN")}
            </Text>
          </View>
        </View>
        <Text
          style={{
            color: colors.text,
            lineHeight: 22,
            marginBottom: spacing.md,
          }}
        >
          {post.caption}
        </Text>
        {post.mediaUrls.length > 0 && (
          <View style={{ marginBottom: spacing.md }}>
            <BlogMediaGrid
              urls={post.mediaUrls}
              types={post.mediaTypes}
              height={230}
              active={videoPlayback.isVideoActive(post.id)}
              preload={videoPlayback.shouldPreloadVideo(post.id)}
            />
          </View>
        )}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <TouchableOpacity
            onPress={() => toggleLike(post)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.xs,
            }}
          >
            <Heart
              size={14}
              color={post.liked ? colors.error : colors.textSecondary}
              fill={post.liked ? colors.error : "transparent"}
            />
            <Text style={{ color: colors.textSecondary }}>
              {post.likes}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              if (!requireAuth("bình luận bài viết")) return;
              router.push({
                pathname: "/(customer)/blog-detail" as any,
                params: { id: post.id },
              });
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.xs,
            }}
          >
            <MessageCircle size={14} color={colors.info} />
            <Text style={{ color: colors.textSecondary }}>
              {post.comments}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => sharePost(post)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.xs,
            }}
          >
            <Share2 size={14} color={colors.primary} />
            <Text style={{ color: colors.textSecondary }}>Chia sẻ</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <Screen>
      <FlatList
        data={loading ? [] : filteredPosts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        refreshing={loading}
        onRefresh={loadPosts}
        onEndReached={() => {
          if (activeFilter === "all" && !search.trim()) loadMorePosts();
        }}
        onEndReachedThreshold={0.35}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={6}
        removeClippedSubviews
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        viewabilityConfig={videoPlayback.viewabilityConfig}
        onViewableItemsChanged={videoPlayback.onViewableItemsChanged}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
            <SearchFilterBar
              searchValue={search}
              onSearchChange={setSearch}
              placeholder="Tìm bài viết, tài xế..."
              filters={BLOG_FILTERS}
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              sortOptions={BLOG_SORTS}
              activeSort={activeSort}
              onSortChange={(key) => setActiveSort(key || "newest")}
              resultCount={loading ? undefined : filteredPosts.length}
              resultLabel="bài viết"
            />
            {loading && (
              <>
                <BlogPostSkeleton />
                <BlogPostSkeleton />
                <BlogPostSkeleton />
              </>
            )}
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <Button label="Đang tải thêm..." onPress={() => undefined} variant="outline" loading disabled />
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <Text
              style={{
                color: colors.textSecondary,
                textAlign: "center",
                marginTop: spacing.xl,
              }}
            >
              {search || activeFilter !== "all"
                ? "Không tìm thấy bài viết phù hợp."
                : "Chưa có bài viết trong database."}
            </Text>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: spacing.lg }}
      />
    </Screen>
  );
}
