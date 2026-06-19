import React, { useEffect, useMemo, useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Image as ImageIcon, MessageCircle } from "lucide-react-native";
import { useTheme } from "@/theme";
import { borderRadius, fontSize, spacing } from "@/theme/tokens";
import { Button, Card } from "@/components/BaseComponents";
import { EmptyState, Screen } from "@/components/ScreenComponents";
import { SearchFilterBar } from "@/components/SearchFilterBar";
import { apiClient } from "@/services/api";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useChatStore } from "@/stores/chatStore";

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

  const refreshConversations = async () => {
    if (!user) return;
    try {
      setRefreshing(true);
      setConversations(await apiClient.getConversations(user.id));
    } catch (error: any) {
      setError(error.message);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    refreshConversations();

    const channel = supabase
      .channel(`driver-chat-list-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => {
          apiClient
            .getConversations(user.id)
            .then(setConversations)
            .catch((error) => setError(error.message));
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => {
          apiClient
            .getConversations(user.id)
            .then(setConversations)
            .catch((error) => setError(error.message));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

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
      {filteredConversations.slice(0, visibleCount).map((conversation) => (
        <TouchableOpacity
          key={conversation.id}
          activeOpacity={0.84}
          onPress={() =>
            router.push({
              pathname: "/(driver)/chat-detail" as any,
              params: { id: conversation.id },
            })
          }
        >
          <Card style={{ marginBottom: spacing.md }}>
            <View
              style={{
                flexDirection: "row",
                gap: spacing.md,
                alignItems: "center",
              }}
            >
              <View>
                <Image
                  source={{ uri: conversation.participantAvatar }}
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: 29,
                    backgroundColor: colors.surfaceAlt,
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 16,
                      fontWeight: "900",
                      flex: 1,
                    }}
                    numberOfLines={1}
                  >
                    {conversation.participantName}
                  </Text>
                  <MessageCircle size={14} color={colors.primary} />
                </View>
                <Text
                  numberOfLines={1}
                  style={{
                    color: conversation.unreadCount > 0 ? colors.text : colors.textSecondary,
                    fontSize: fontSize.sm,
                    fontWeight: conversation.unreadCount > 0 ? "800" : "500",
                    marginTop: spacing.xs,
                  }}
                >
                  {conversation.lastMessage === "Đã gửi một ảnh" ? "Ảnh trong cuộc trò chuyện" : conversation.lastMessage}
                </Text>
                {conversation.lastMessage === "Đã gửi một ảnh" && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.xs }}>
                    <ImageIcon size={13} color={colors.primary} />
                    <Text style={{ color: colors.textTertiary, fontSize: fontSize.xs }}>Nhấn để xem ảnh</Text>
                  </View>
                )}
                {(conversation.threadIds?.length ?? 0) > 1 && (
                  <Text
                    style={{
                      color: colors.textTertiary,
                      fontSize: fontSize.xs,
                      marginTop: spacing.xs,
                    }}
                  >
                    {conversation.threadIds?.length} chuyến cùng khách
                  </Text>
                )}
              </View>
              <View style={{ alignItems: "flex-end", gap: spacing.sm }}>
                <Text
                  style={{ color: colors.textTertiary, fontSize: fontSize.xs }}
                >
                  {conversation.lastMessageTime}
                </Text>
                {conversation.unreadCount > 0 && (
                  <View
                    style={{
                      minWidth: 22,
                      height: 22,
                      borderRadius: borderRadius.full,
                      backgroundColor: colors.primary,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: "white",
                        fontSize: fontSize.xs,
                        fontWeight: "700",
                      }}
                    >
                      {conversation.unreadCount}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </Card>
        </TouchableOpacity>
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
