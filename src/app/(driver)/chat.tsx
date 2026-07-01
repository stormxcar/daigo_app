import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { MessageCircle, Trash2, X } from "lucide-react-native";
import { useTheme } from "@/theme";
import { fontForWeight, spacing } from '@/theme/tokens';
import { Button } from "@/components/BaseComponents";
import { ChatConversationRow } from "@/components/ChatConversationRow";
import { EmptyState, Screen } from "@/components/ScreenComponents";
import { SearchFilterBar } from "@/components/SearchFilterBar";
import { apiClient } from "@/services/api";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useChatStore } from "@/stores/chatStore";
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

export default function DriverChat() {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const { conversations, setConversations, setError } = useChatStore();
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

  useEffect(() => {
    if (!user) return;
    let active = true;

    refreshConversations();

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
      .channel(`driver-chat-list-${user.id}-${channelInstanceId}`)
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
  }, [refreshConversations, setConversations, setError, user, channelInstanceId]);

  const filteredConversations = useMemo(() => {
    let result = [...conversations];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.participantName?.toLowerCase().includes(q) ||
          c.lastMessage?.toLowerCase().includes(q),
      );
    }

    if (activeFilter === "unread")
      result = result.filter((c) => c.unreadCount > 0);
    if (activeFilter === "read")
      result = result.filter((c) => !c.unreadCount || c.unreadCount === 0);

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

  return (
    <Screen scroll refreshing={refreshing} onRefresh={refreshConversations}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
        <SearchFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          placeholder="Tìm khách hàng hoặc tin nhắn..."
          filters={CHAT_FILTERS}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          sortOptions={CHAT_SORTS}
          activeSort={activeSort}
          onSortChange={(key) => setActiveSort(key || "newest")}
          resultCount={filteredConversations.length}
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
      {filteredConversations.slice(0, visibleCount).map((conversation) => (
        <ChatConversationRow
          key={conversation.id}
          conversation={conversation}
          multipleThreadsLabel="chuyến cùng khách"
          selected={selectedIds.includes(conversation.id)}
          selectionMode={selectionMode}
          onPress={() => {
            if (selectionMode) {
              toggleSelection(conversation);
              return;
            }
            router.push({
              pathname: "/(driver)/chat-detail" as any,
              params: { id: conversation.id },
            });
          }}
          onLongPress={() => toggleSelection(conversation)}
          onDelete={() => confirmDeleteConversation(conversation)}
        />
      ))}

      {filteredConversations.length === 0 &&
        (search || activeFilter !== "all" ? (
          <Text
            style={{
              color: colors.textSecondary,
              textAlign: "center",
              marginTop: spacing.xl,
            }}
          >
            Không tìm thấy cuộc trò chuyện phù hợp.
          </Text>
        ) : (
          <EmptyState
            icon={<MessageCircle size={48} color={colors.primary} />}
            title="Chưa có tin nhắn"
            description="Tin nhắn từ khách hàng sẽ hiển thị khi chuyến đi có cuộc trò chuyện."
          />
        ))}
      {filteredConversations.length > visibleCount && (
        <Button
          label="Tải thêm tin nhắn"
          onPress={() => setVisibleCount((current) => current + 12)}
          variant="outline"
        />
      )}
    </Screen>
  );
}
