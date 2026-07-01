import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { MessageCircle, Trash2, X } from "lucide-react-native";
import { useTheme } from "@/theme";
import { fontForWeight, spacing } from '@/theme/tokens';
import { AuthRequired } from "@/components/AuthRequired";
import { Button, Skeleton } from "@/components/BaseComponents";
import { ChatConversationRow } from "@/components/ChatConversationRow";
import { Screen } from "@/components/ScreenComponents";
import { SearchFilterBar } from "@/components/SearchFilterBar";
import { useAuthStore } from "@/stores/authStore";
import { useChatStore } from "@/stores/chatStore";
import { apiClient } from "@/services/api";
import { supabase } from "@/services/supabase";
import { ChatConversation } from "@/types";
import { showError, showSuccess } from "@/utils/toast";

const CHAT_FILTERS = [
  { key: "all", label: "Tất cả" },
  { key: "unread", label: "🔵 Chưa đọc" },
  { key: "read", label: "✅ Đã đọc" },
];

const CHAT_SORTS = [
  { key: "newest", label: "Tin nhắn mới" },
  { key: "oldest", label: "Tin nhắn cũ" },
  { key: "unread", label: "Chưa đọc trước" },
  { key: "name", label: "Theo tên A-Z" },
];

export default function ChatScreen() {
  const { colors } = useTheme();
  const { isAuthenticated, user } = useAuthStore();
  const { conversations, setConversations, setError } = useChatStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeSort, setActiveSort] = useState("newest");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const channelInstanceId = useRef(Math.random().toString(36).slice(2)).current;
  const selectionMode = selectedIds.length > 0;

  const refreshConversations = useCallback(async () => {
    if (!user) return;
    try {
      setRefreshing(true);
      setConversations(await apiClient.getConversationSummaries(user.id));
    } catch (error: any) {
      setError(error.message);
    } finally {
      setRefreshing(false);
    }
  }, [setConversations, setError, user]);

  const initialLoad = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      setConversations(await apiClient.getConversationSummaries(user.id));
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [setConversations, setError, user]);

  useEffect(() => {
    if (!user) return;
    let active = true;

    initialLoad();

    const refreshFromRealtime = () => {
      if (!active) return;
      apiClient
        .getConversationSummaries(user.id)
        .then((items) => {
          if (active) setConversations(items);
        })
        .catch((error) => {
          if (active) setError(error.message);
        });
    };

    const channel = supabase
      .channel(`chat-list-${user.id}-${channelInstanceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        refreshFromRealtime,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        refreshFromRealtime,
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [initialLoad, setConversations, setError, user, channelInstanceId]);

  const filteredConversations = useMemo(() => {
    let result = [...conversations];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.participantName?.toLowerCase().includes(q) ||
          c.lastMessage?.toLowerCase().includes(q),
      );
    }

    // Filter
    if (activeFilter === "unread")
      result = result.filter((c) => c.unreadCount > 0);
    if (activeFilter === "read")
      result = result.filter((c) => !c.unreadCount || c.unreadCount === 0);

    // Sort
    if (activeSort === "unread")
      result.sort((a, b) => (b.unreadCount ?? 0) - (a.unreadCount ?? 0));
    if (activeSort === "name")
      result.sort((a, b) =>
        (a.participantName ?? "").localeCompare(b.participantName ?? ""),
      );
    if (activeSort === "oldest") result = [...result].reverse();

    return result;
  }, [conversations, search, activeFilter, activeSort]);

  const getConversationHideIds = (conversation: ChatConversation) => conversation.threadIds ?? [conversation.id];

  const hideConversationIds = useCallback(async (ids: string[]) => {
    if (!user) return;
    try {
      await apiClient.hideConversations(user.id, ids);
      setConversations(await apiClient.getConversationSummaries(user.id));
      setSelectedIds([]);
      showSuccess('Đã xóa khỏi danh sách', 'Cuộc trò chuyện đã được ẩn khỏi tài khoản của bạn.');
    } catch (error: any) {
      showError('Không thể xóa cuộc trò chuyện', error.message);
    }
  }, [setConversations, user]);

  const confirmDeleteConversation = (conversation: ChatConversation) => {
    Alert.alert(
      'Xóa cuộc trò chuyện',
      `Bạn có chắc muốn xóa cuộc trò chuyện với ${conversation.participantName} khỏi danh sách không?`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa', style: 'destructive', onPress: () => hideConversationIds(getConversationHideIds(conversation)) },
      ],
    );
  };

  const toggleSelection = (conversation: ChatConversation) => {
    setSelectedIds((current) =>
      current.includes(conversation.id)
        ? current.filter((id) => id !== conversation.id)
        : [...current, conversation.id]
    );
  };

  const confirmDeleteSelected = () => {
    const selectedConversations = filteredConversations.filter((conversation) => selectedIds.includes(conversation.id));
    const ids = selectedConversations.flatMap(getConversationHideIds);
    Alert.alert('Xóa nhiều cuộc trò chuyện', `Bạn có chắc muốn xóa ${selectedConversations.length} cuộc trò chuyện đã chọn không?`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: () => hideConversationIds(ids) },
    ]);
  };

  if (!isAuthenticated) {
    return (
      <AuthRequired description="Bạn cần đăng nhập để trò chuyện với tài xế." />
    );
  }

  if (!user?.phoneVerified) {
    return (
      <AuthRequired
        title="Xác minh số điện thoại"
        description="Bạn cần xác minh SĐT bằng OTP trước khi chat hoặc gọi tài xế."
        actionLabel="Xác minh SĐT"
        onActionPress={() => router.push({ pathname: "/(auth)/phone-otp" as any, params: { redirectTo: "/(customer)/chat" } })}
      />
    );
  }

  return (
    <Screen scroll refreshing={refreshing} onRefresh={refreshConversations}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
        <SearchFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          placeholder="Tìm tài xế hoặc tin nhắn..."
          filters={CHAT_FILTERS}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          sortOptions={CHAT_SORTS}
          activeSort={activeSort}
          onSortChange={(key) => setActiveSort(key || "newest")}
          resultCount={loading ? undefined : filteredConversations.length}
          resultLabel="cuộc trò chuyện"
        />
      </View>

      {selectionMode && (
        <View
          style={{
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text style={{ color: colors.text, ...fontForWeight("900")}}>{selectedIds.length} cuộc trò chuyện đã chọn</Text>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <TouchableOpacity onPress={() => setSelectedIds([])} style={{ padding: spacing.sm }}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={confirmDeleteSelected} style={{ padding: spacing.sm }}>
              <Trash2 size={20} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Skeleton loading lần đầu */}
      {loading && (
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <View
              key={i}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.md,
                paddingVertical: spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <Skeleton width={58} height={58} borderRadius={29} />
              <View style={{ flex: 1, gap: spacing.sm }}>
                <Skeleton width="60%" height={16} />
                <Skeleton width="85%" height={12} />
              </View>
              <View style={{ alignItems: "flex-end", gap: spacing.sm }}>
                <Skeleton width={36} height={10} />
              </View>
            </View>
          ))}
        </View>
      )}

      {!loading && filteredConversations.slice(0, visibleCount).map((conversation) => (
        <ChatConversationRow
          key={conversation.id}
          conversation={conversation}
          multipleThreadsLabel="chuyến cùng tài xế"
          selected={selectedIds.includes(conversation.id)}
          selectionMode={selectionMode}
          onPress={() => {
            if (selectionMode) {
              toggleSelection(conversation);
              return;
            }
            router.push({
              pathname: "/(customer)/chat-detail" as any,
              params: { id: conversation.id },
            });
          }}
          onLongPress={() => toggleSelection(conversation)}
          onDelete={() => confirmDeleteConversation(conversation)}
        />
      ))}
      {!loading && filteredConversations.length === 0 && (
        <Text
          style={{
            color: colors.textSecondary,
            textAlign: "center",
            marginTop: spacing.xl,
          }}
        >
          {search || activeFilter !== "all"
            ? "Không tìm thấy cuộc trò chuyện phù hợp."
            : "Chưa có cuộc trò chuyện. Conversation sẽ được tạo sau khi bạn đặt xe."}
        </Text>
      )}
      {!loading && filteredConversations.length > visibleCount && (
        <Button
          label="Tải thêm tin nhắn"
          onPress={() => setVisibleCount((current) => current + 12)}
          variant="outline"
        />
      )}
    </Screen>
  );
}
