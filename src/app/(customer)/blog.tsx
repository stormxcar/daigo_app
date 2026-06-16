import React, { useEffect, useMemo, useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Heart, MessageCircle, Share2 } from "lucide-react-native";
import { useTheme } from "@/theme";
import { fontSize, spacing } from "@/theme/tokens";
import { Button, Card, CardSkeleton } from "@/components/BaseComponents";
import { Screen } from "@/components/ScreenComponents";
import { SearchFilterBar } from "@/components/SearchFilterBar";
import { apiClient } from "@/services/api";
import { useAuthStore } from "@/stores/authStore";
import { BlogPost } from "@/types";
import { showError, showSuccess, showWarning } from "@/utils/toast";
import { shareBlogPostNative } from "@/utils/share";
import { BlogMediaGrid } from "@/components/BlogMediaGrid";

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

export default function BlogScreen() {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(8);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeSort, setActiveSort] = useState("newest");

  const loadPosts = async () => {
    setLoading(true);
    apiClient
      .getBlogPosts()
      .then(setPosts)
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
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

  return (
    <Screen scroll refreshing={loading} onRefresh={loadPosts}>
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
      </View>

      {loading ? (
        <>
          <CardSkeleton image style={{ marginBottom: spacing.lg }} />
          <CardSkeleton image style={{ marginBottom: spacing.lg }} />
        </>
      ) : (
        filteredPosts.slice(0, visibleCount).map((post) => (
          <TouchableOpacity
            key={post.id}
            activeOpacity={0.86}
            onPress={() =>
              router.push({
                pathname: "/(customer)/blog-detail" as any,
                params: { id: post.id },
              })
            }
          >
            <Card style={{ marginBottom: spacing.lg }}>
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
            </Card>
          </TouchableOpacity>
        ))
      )}
      {!loading && filteredPosts.length === 0 && (
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
      )}
      {!loading && filteredPosts.length > visibleCount && (
        <Button
          label="Tải thêm bài viết"
          onPress={() => setVisibleCount((current) => current + 8)}
          variant="outline"
        />
      )}
    </Screen>
  );
}
