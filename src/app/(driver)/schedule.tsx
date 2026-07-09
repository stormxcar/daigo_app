import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Alert, Switch, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import {
  Banknote,
  Ban,
  CalendarDays,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Filter,
  MapPin,
  Repeat2,
  Search,
  SlidersHorizontal,
  Trash2,
  User,
} from "lucide-react-native";
import { TextInput } from "@/components/BaseComponents";
import { CardSkeleton } from "@/components/BaseComponents";
import { EmptyState, Screen } from "@/components/ScreenComponents";
import {
  PaymentStatusBadge,
  getPaymentMethodLabel,
} from "@/components/PaymentStatusBadge";
import { BOOKING_STATUS } from "@/constants";
import { apiClient } from "@/services/api";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/theme";
import { fontForWeight, borderRadius, fontSize, spacing } from "@/theme/tokens";
import { Booking } from "@/types";
import { formatVietnamDate, getBookingStatusInfo } from "@/utils/helpers";
import { showError, showSuccess } from "@/utils/toast";

const WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

type ScheduleScope = "day" | "month";
type ScheduleStatusFilter =
  | "all"
  | "pending"
  | "accepted"
  | "completed"
  | "cancelled";
type ScheduleSortMode =
  | "time_asc"
  | "time_desc"
  | "price_desc"
  | "price_asc"
  | "newest";
type DriverScheduleBlock = {
  id: string;
  startAt: string;
  endAt: string;
  blockKind?: "all_day" | "custom";
  repeatGroupId?: string;
  repeatUntil?: string;
  note?: string;
};

const toLocalIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getMonthLabel = (date: Date) =>
  `Tháng ${date.getMonth() + 1}/${date.getFullYear()}`;

const buildMonthGrid = (monthDate: Date) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const leadingEmpty = (firstDay + 6) % 7;
  const cells: Array<{ date: string; day: number } | null> = [];

  for (let index = 0; index < leadingEmpty; index += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ date: toLocalIsoDate(new Date(year, month, day)), day });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
};

const parseTimeInput = (value: string) => {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  )
    return null;
  return { hour, minute };
};

const createLocalDateTime = (
  dateInput: string,
  hour: number,
  minute: number,
  endOfDay = false,
) => {
  const [year, monthValue, day] = dateInput.split("-").map(Number);
  return new Date(
    year,
    monthValue - 1,
    day,
    hour,
    minute,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0,
  );
};

const createUuid = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });

const matchesStatusFilter = (
  booking: Booking,
  filter: ScheduleStatusFilter,
) => {
  if (filter === "all") return true;
  if (filter === "pending")
    return booking.status === BOOKING_STATUS.SCHEDULED_PENDING_DRIVER;
  if (filter === "accepted") {
    return [
      BOOKING_STATUS.SCHEDULED_DRIVER_ACCEPTED,
      BOOKING_STATUS.SCHEDULED_UPCOMING,
    ].includes(booking.status as any);
  }
  if (filter === "completed")
    return booking.status === BOOKING_STATUS.TRIP_COMPLETED;
  return [
    BOOKING_STATUS.SCHEDULED_DRIVER_REJECTED,
    BOOKING_STATUS.SCHEDULED_CANCELLED,
    BOOKING_STATUS.CUSTOMER_CANCELLED,
    BOOKING_STATUS.DRIVER_CANCELLED,
    BOOKING_STATUS.EXPIRED,
  ].includes(booking.status as any);
};

const sortBookings = (items: Booking[], sortMode: ScheduleSortMode) => {
  const sorted = [...items];
  if (sortMode === "time_asc")
    return sorted.sort((a, b) =>
      `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`),
    );
  if (sortMode === "time_desc")
    return sorted.sort((a, b) =>
      `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`),
    );
  if (sortMode === "price_desc")
    return sorted.sort((a, b) => b.estimatedPrice - a.estimatedPrice);
  if (sortMode === "price_asc")
    return sorted.sort((a, b) => a.estimatedPrice - b.estimatedPrice);
  return sorted.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
};

function Pill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={onPress}
      style={{
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        backgroundColor: active ? colors.primary : colors.surfaceAlt,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
      }}
    >
      <Text
        style={{
          color: active ? "white" : colors.textSecondary,
          fontSize: fontSize.xs,
          ...fontForWeight("900"),
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function ScheduleAcceptanceToggle({
  enabled,
  loading,
  onToggle,
}: {
  enabled: boolean;
  loading: boolean;
  onToggle: () => void;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.84}
      disabled={loading}
      onPress={onToggle}
      style={{
        marginHorizontal: spacing.lg,
        marginBottom: spacing.md,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.border,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        opacity: loading ? 0.72 : 1,
      }}
    >
      <CalendarDays
        size={22}
        color={enabled ? colors.primary : colors.textTertiary}
      />
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, ...fontForWeight("900") }}>
          Nhận chuyến đặt trước
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: fontSize.xs,
            marginTop: 2,
          }}
        >
          {enabled
            ? "Bạn có thể nhận lịch tương lai dù đang offline nhận chuyến ngay."
            : "Đã tắt nhận lịch mới. Lịch đã nhận và ngày nghỉ vẫn được giữ."}
        </Text>
      </View>
      <View
        style={{
          width: 48,
          height: 28,
          borderRadius: 14,
          padding: 3,
          backgroundColor: enabled ? colors.primary : colors.surfaceAlt,
          borderWidth: 1,
          borderColor: enabled ? colors.primary : colors.border,
          alignItems: enabled ? "flex-end" : "flex-start",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: "#fff",
          }}
        />
      </View>
    </TouchableOpacity>
  );
}
function ScheduleBookingRow({
  booking,
  loading,
  onAccept,
  onReject,
  onOpen,
}: {
  booking: Booking;
  loading: boolean;
  onAccept: () => void;
  onReject: () => void;
  onOpen: () => void;
}) {
  const { colors } = useTheme();
  const statusInfo = getBookingStatusInfo(booking.status);
  const canRespond = booking.status === BOOKING_STATUS.SCHEDULED_PENDING_DRIVER;

  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={onOpen}
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
          justifyContent: "space-between",
          gap: spacing.md,
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={{ color: colors.text, ...fontForWeight("900") }}
          >
            {booking.bookingCode ?? "Chuyến đặt trước"}
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: fontSize.xs,
              marginTop: 2,
            }}
          >
            {formatVietnamDate(booking.date)} lúc {booking.time}
          </Text>
        </View>
        <View
          style={{
            alignSelf: "flex-start",
            borderRadius: borderRadius.full,
            paddingHorizontal: spacing.sm,
            paddingVertical: 4,
            backgroundColor: statusInfo.color + "20",
          }}
        >
          <Text
            style={{
              color: statusInfo.color,
              fontSize: 10,
              ...fontForWeight("900"),
            }}
          >
            {statusInfo.label}
          </Text>
        </View>
      </View>

      <View style={{ gap: spacing.xs, marginTop: spacing.md }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.xs,
          }}
        >
          <MapPin size={14} color={colors.primary} />
          <Text
            numberOfLines={1}
            style={{
              color: colors.textSecondary,
              flex: 1,
              fontSize: fontSize.sm,
            }}
          >
            {booking.pickupLocation}
          </Text>
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.xs,
          }}
        >
          <MapPin size={14} color={colors.error} />
          <Text
            numberOfLines={1}
            style={{
              color: colors.textSecondary,
              flex: 1,
              fontSize: fontSize.sm,
            }}
          >
            {booking.dropoffLocation}
          </Text>
        </View>
      </View>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: spacing.sm,
          marginTop: spacing.md,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <User size={13} color={colors.textTertiary} />
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }}>
            {booking.customerName}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Banknote size={13} color={colors.primary} />
          <Text
            style={{
              color: colors.primary,
              fontSize: fontSize.xs,
              ...fontForWeight("900"),
            }}
          >
            {booking.estimatedPrice.toLocaleString("vi-VN")}đ
          </Text>
        </View>
        <PaymentStatusBadge status={booking.paymentStatus} />
        <Text
          style={{
            color: colors.textTertiary,
            fontSize: fontSize.xs,
            ...fontForWeight("700"),
          }}
        >
          {getPaymentMethodLabel(booking.paymentMethod)}
        </Text>
      </View>

      {booking.note ? (
        <Text
          numberOfLines={2}
          style={{
            color: colors.textSecondary,
            fontSize: fontSize.xs,
            marginTop: spacing.sm,
          }}
        >
          Ghi chú: {booking.note}
        </Text>
      ) : null}

      {canRespond ? (
        <View
          style={{
            flexDirection: "row",
            gap: spacing.sm,
            marginTop: spacing.md,
          }}
        >
          <TouchableOpacity
            disabled={loading}
            activeOpacity={0.84}
            onPress={onAccept}
            style={{
              flex: 1,
              borderRadius: borderRadius.md,
              paddingVertical: spacing.sm,
              alignItems: "center",
              backgroundColor: colors.primary,
              opacity: loading ? 0.6 : 1,
            }}
          >
            <Text
              style={{
                color: "white",
                fontSize: fontSize.sm,
                ...fontForWeight("900"),
              }}
            >
              Nhận lịch
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            disabled={loading}
            activeOpacity={0.84}
            onPress={onReject}
            style={{
              flex: 1,
              borderRadius: borderRadius.md,
              paddingVertical: spacing.sm,
              alignItems: "center",
              backgroundColor: colors.error + "18",
              opacity: loading ? 0.6 : 1,
            }}
          >
            <Text
              style={{
                color: colors.error,
                fontSize: fontSize.sm,
                ...fontForWeight("900"),
              }}
            >
              Từ chối
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

export default function DriverScheduleScreen() {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [scheduleBlocks, setScheduleBlocks] = useState<DriverScheduleBlock[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [blocking, setBlocking] = useState(false);
  const [acceptsScheduledBookings, setAcceptsScheduledBookings] =
    useState(true);
  const [acceptanceLoading, setAcceptanceLoading] = useState(false);
  const [blockMode, setBlockMode] = useState<"all_day" | "custom">("all_day");
  const [blockStartTime, setBlockStartTime] = useState("08:00");
  const [blockEndTime, setBlockEndTime] = useState("12:00");
  const [repeatWeekly, setRepeatWeekly] = useState(false);
  const [month, setMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() =>
    toLocalIsoDate(new Date()),
  );
  const [scope, setScope] = useState<ScheduleScope>("day");
  const [statusFilter, setStatusFilter] = useState<ScheduleStatusFilter>("all");
  const [sortMode, setSortMode] = useState<ScheduleSortMode>("time_asc");
  const [query, setQuery] = useState("");
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchSchedule = useCallback(async () => {
    if (!user?.id) {
      setBookings([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [data, blocks, driverStatus] = await Promise.all([
        apiClient.getDriverScheduledBookingsByMonth(user.id, month),
        apiClient.getDriverScheduleBlocks(user.id, month),
        apiClient.getDriverStatus(user.id),
      ]);
      const scheduledEnabled = driverStatus?.acceptsScheduledBookings ?? true;
      setAcceptsScheduledBookings(scheduledEnabled);
      setBookings(
        scheduledEnabled
          ? data
          : data.filter((booking) => booking.driverId === user.id),
      );
      setScheduleBlocks(blocks);
    } catch (error: any) {
      showError("Không thể tải lịch đặt trước", error.message);
    } finally {
      setLoading(false);
    }
  }, [month, user?.id]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  useEffect(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    if (!user?.id) return;

    const channel = supabase
      .channel(`driver-schedule-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        fetchSchedule,
      )
      .subscribe();
    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      if (channelRef.current === channel) channelRef.current = null;
    };
  }, [fetchSchedule, user?.id]);

  const monthCells = useMemo(() => buildMonthGrid(month), [month]);

  const dayCounts = useMemo(() => {
    const counts = new Map<string, number>();
    bookings.forEach((booking) => {
      counts.set(booking.date, (counts.get(booking.date) ?? 0) + 1);
    });
    return counts;
  }, [bookings]);

  const blockCounts = useMemo(() => {
    const counts = new Map<string, number>();
    scheduleBlocks.forEach((block) => {
      const date = toLocalIsoDate(new Date(block.startAt));
      counts.set(date, (counts.get(date) ?? 0) + 1);
    });
    return counts;
  }, [scheduleBlocks]);

  const selectedBlocks = useMemo(
    () =>
      scheduleBlocks.filter(
        (block) => toLocalIsoDate(new Date(block.startAt)) === selectedDate,
      ),
    [scheduleBlocks, selectedDate],
  );

  const stats = useMemo(() => {
    const pending = bookings.filter(
      (booking) => booking.status === BOOKING_STATUS.SCHEDULED_PENDING_DRIVER,
    ).length;
    const accepted = bookings.filter((booking) =>
      [
        BOOKING_STATUS.SCHEDULED_DRIVER_ACCEPTED,
        BOOKING_STATUS.SCHEDULED_UPCOMING,
      ].includes(booking.status as any),
    ).length;
    const completed = bookings.filter(
      (booking) => booking.status === BOOKING_STATUS.TRIP_COMPLETED,
    );
    return {
      total: bookings.length,
      pending,
      accepted,
      completed: completed.length,
      revenue: completed.reduce(
        (sum, booking) => sum + (booking.actualPrice ?? booking.estimatedPrice),
        0,
      ),
    };
  }, [bookings]);

  const visibleBookings = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = bookings.filter((booking) => {
      if (scope === "day" && booking.date !== selectedDate) return false;
      if (!matchesStatusFilter(booking, statusFilter)) return false;
      if (!normalizedQuery) return true;
      return [
        booking.bookingCode,
        booking.customerName,
        booking.customerPhone,
        booking.pickupLocation,
        booking.dropoffLocation,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));
    });
    return sortBookings(filtered, sortMode);
  }, [bookings, query, scope, selectedDate, sortMode, statusFilter]);

  const moveMonth = (offset: number) => {
    setMonth((current) => {
      const next = new Date(
        current.getFullYear(),
        current.getMonth() + offset,
        1,
      );
      setSelectedDate(toLocalIsoDate(next));
      return next;
    });
  };

  const openBooking = (bookingId: string) => {
    router.push({
      pathname: "/(driver)/booking-detail" as any,
      params: { id: bookingId },
    });
  };

  const acceptBooking = async (booking: Booking) => {
    try {
      setLoadingId(booking.id);
      await apiClient.acceptScheduledBooking(booking.id);
      await fetchSchedule();
      showSuccess(
        "Đã nhận lịch",
        "Chuyến đặt trước đã được thêm vào lịch của bạn.",
      );
    } catch (error: any) {
      showError("Không thể nhận lịch", error.message);
    } finally {
      setLoadingId(null);
    }
  };

  const toggleScheduledAcceptance = async () => {
    if (!user?.id) return;
    const nextValue = !acceptsScheduledBookings;
    try {
      setAcceptanceLoading(true);
      const updated = await apiClient.setDriverScheduledBookingAcceptance(
        user.id,
        nextValue,
      );
      const enabled = updated.acceptsScheduledBookings ?? nextValue;
      setAcceptsScheduledBookings(enabled);
      await fetchSchedule();
      showSuccess(
        enabled
          ? "Đã bật nhận chuyến đặt trước"
          : "Đã tắt nhận chuyến đặt trước",
        enabled
          ? "Bạn sẽ thấy các chuyến đặt trước phù hợp trong lịch."
          : "Bạn sẽ không nhận lịch mới cho tới khi bật lại.",
      );
    } catch (error: any) {
      showError("Không thể cập nhật nhận lịch", error.message);
    } finally {
      setAcceptanceLoading(false);
    }
  };
  const rejectBooking = (booking: Booking) => {
    Alert.alert(
      "Từ chối chuyến đặt trước?",
      "Chuyến này sẽ không còn nằm trong lịch chờ của bạn.",
      [
        { text: "Đóng", style: "cancel" },
        {
          text: "Từ chối",
          style: "destructive",
          onPress: async () => {
            try {
              setLoadingId(booking.id);
              await apiClient.rejectScheduledBooking(booking.id);
              await fetchSchedule();
              showSuccess(
                "Đã từ chối lịch",
                "Trạng thái chuyến đã được cập nhật.",
              );
            } catch (error: any) {
              showError("Không thể từ chối lịch", error.message);
            } finally {
              setLoadingId(null);
            }
          },
        },
      ],
    );
  };

  const createBlockForSelectedDay = async () => {
    if (!user?.id) return;

    const startInput =
      blockMode === "all_day"
        ? { hour: 0, minute: 0 }
        : parseTimeInput(blockStartTime);
    const endInput =
      blockMode === "all_day"
        ? { hour: 23, minute: 59 }
        : parseTimeInput(blockEndTime);
    if (!startInput || !endInput) {
      showError(
        "Giờ nghỉ chưa hợp lệ",
        "Vui lòng nhập giờ theo định dạng HH:mm, ví dụ 08:30.",
      );
      return;
    }

    const firstStart = createLocalDateTime(
      selectedDate,
      startInput.hour,
      startInput.minute,
    );
    const firstEnd = createLocalDateTime(
      selectedDate,
      endInput.hour,
      endInput.minute,
      blockMode === "all_day",
    );
    if (firstEnd <= firstStart) {
      showError(
        "Khung giờ chưa hợp lệ",
        "Giờ kết thúc phải lớn hơn giờ bắt đầu.",
      );
      return;
    }

    const repeatCount = repeatWeekly ? 8 : 1;
    const repeatGroupId = repeatWeekly ? createUuid() : undefined;
    const repeatUntilDate = repeatWeekly
      ? toLocalIsoDate(
          new Date(
            firstStart.getFullYear(),
            firstStart.getMonth(),
            firstStart.getDate() + 7 * (repeatCount - 1),
          ),
        )
      : undefined;
    const note = repeatWeekly ? "Lặp hằng tuần" : undefined;
    const entries = Array.from({ length: repeatCount }, (_, index) => {
      const startAt = new Date(firstStart);
      const endAt = new Date(firstEnd);
      startAt.setDate(firstStart.getDate() + index * 7);
      endAt.setDate(firstEnd.getDate() + index * 7);
      return {
        driverId: user.id,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        blockKind: blockMode,
        repeatGroupId,
        repeatUntil: repeatUntilDate,
        note,
      };
    });

    try {
      setBlocking(true);
      await apiClient.createDriverScheduleBlocks(entries);
      await fetchSchedule();
      showSuccess(
        "Đã thêm thời gian không nhận chuyến",
        repeatWeekly
          ? "Khung nghỉ đã được lặp hằng tuần trong 8 tuần tới."
          : blockMode === "all_day"
            ? "Ngày này sẽ không nhận chuyến đặt trước."
            : "Khung nghỉ đã được thêm vào lịch.",
      );
    } catch (error: any) {
      const message = String(error?.message ?? "Không thể khóa lịch");
      showError(
        "Không thể khóa lịch",
        message.includes("driver_schedules_no_overlap")
          ? "Khung nghỉ bị trùng lịch đã có. Vui lòng chọn thời gian khác."
          : message,
      );
    } finally {
      setBlocking(false);
    }
  };

  const removeScheduleBlock = async (
    block: DriverScheduleBlock,
    removeSeries = false,
  ) => {
    if (!user?.id) return;
    try {
      setBlocking(true);
      if (removeSeries && block.repeatGroupId) {
        await apiClient.deleteDriverScheduleBlockGroup(
          user.id,
          block.repeatGroupId,
        );
      } else {
        await apiClient.deleteDriverScheduleBlock(block.id);
      }
      await fetchSchedule();
      showSuccess(
        "Đã mở lại lịch",
        removeSeries
          ? "Chuỗi nghỉ lặp đã được xóa."
          : "Khung nghỉ đã được xóa.",
      );
    } catch (error: any) {
      showError("Không thể xóa khung nghỉ", error.message);
    } finally {
      setBlocking(false);
    }
  };

  const deleteScheduleBlock = (block: DriverScheduleBlock) => {
    if (!block.repeatGroupId) {
      void removeScheduleBlock(block);
      return;
    }

    Alert.alert(
      "Xóa khung nghỉ lặp?",
      "Bạn muốn xóa riêng ngày này hay xóa toàn bộ chuỗi lặp hằng tuần?",
      [
        { text: "Đóng", style: "cancel" },
        {
          text: "Chỉ ngày này",
          onPress: () => void removeScheduleBlock(block),
        },
        {
          text: "Cả chuỗi",
          style: "destructive",
          onPress: () => void removeScheduleBlock(block, true),
        },
      ],
    );
  };

  return (
    <Screen scroll refreshing={loading} onRefresh={fetchSchedule}>
      <View
        style={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: spacing.md,
        }}
      >
        <Text
          style={{ color: colors.text, fontSize: 22, ...fontForWeight("900") }}
        >
          Quản lý lịch
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: fontSize.sm,
            marginTop: 3,
          }}
        >
          Theo dõi chuyến đặt trước theo ngày, tháng và trạng thái xử lý.
        </Text>
      </View>

      <View
        style={{
          flexDirection: "row",
          paddingHorizontal: spacing.lg,
          gap: spacing.sm,
          marginBottom: spacing.md,
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: colors.border,
            padding: spacing.md,
          }}
        >
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: fontSize.xs,
              ...fontForWeight("800"),
            }}
          >
            Tổng lịch
          </Text>
          <Text
            style={{
              color: colors.text,
              fontSize: 20,
              ...fontForWeight("900"),
              marginTop: 2,
            }}
          >
            {stats.total}
          </Text>
        </View>
        <View
          style={{
            flex: 1,
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: colors.border,
            padding: spacing.md,
          }}
        >
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: fontSize.xs,
              ...fontForWeight("800"),
            }}
          >
            Chờ nhận
          </Text>
          <Text
            style={{
              color: colors.warning,
              fontSize: 20,
              ...fontForWeight("900"),
              marginTop: 2,
            }}
          >
            {stats.pending}
          </Text>
        </View>
        <View
          style={{
            flex: 1,
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: colors.border,
            padding: spacing.md,
          }}
        >
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: fontSize.xs,
              ...fontForWeight("800"),
            }}
          >
            Doanh thu
          </Text>
          <Text
            style={{
              color: colors.primary,
              fontSize: 15,
              ...fontForWeight("900"),
              marginTop: 5,
            }}
          >
            {stats.revenue.toLocaleString("vi-VN")}đ
          </Text>
        </View>
      </View>

      <ScheduleAcceptanceToggle
        enabled={acceptsScheduledBookings}
        loading={acceptanceLoading}
        onToggle={toggleScheduledAcceptance}
      />

      <View
        style={{
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: colors.border,
          paddingVertical: spacing.md,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: spacing.lg,
            marginBottom: spacing.md,
          }}
        >
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => moveMonth(-1)}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: colors.surfaceAlt,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ChevronLeft size={18} color={colors.text} />
          </TouchableOpacity>
          <View style={{ alignItems: "center" }}>
            <Text
              style={{
                color: colors.text,
                fontSize: fontSize.lg,
                ...fontForWeight("900"),
              }}
            >
              {getMonthLabel(month)}
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: fontSize.xs,
                marginTop: 2,
              }}
            >
              Ngày đang chọn: {formatVietnamDate(selectedDate)}
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => moveMonth(1)}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: colors.surfaceAlt,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ChevronRight size={18} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: "row", paddingHorizontal: spacing.lg }}>
          {WEEKDAY_LABELS.map((label) => (
            <Text
              key={label}
              style={{
                flex: 1,
                textAlign: "center",
                color: colors.textSecondary,
                fontSize: fontSize.xs,
                ...fontForWeight("900"),
                paddingBottom: spacing.xs,
              }}
            >
              {label}
            </Text>
          ))}
        </View>

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            paddingHorizontal: spacing.lg,
          }}
        >
          {monthCells.map((cell, index) => {
            if (!cell)
              return (
                <View
                  key={`empty-${index}`}
                  style={{ width: `${100 / 7}%`, aspectRatio: 1 }}
                />
              );
            const selected = selectedDate === cell.date;
            const today = toLocalIsoDate(new Date()) === cell.date;
            const count = dayCounts.get(cell.date) ?? 0;
            const blocked = (blockCounts.get(cell.date) ?? 0) > 0;
            const isFull = blocked || count >= 3;
            return (
              <TouchableOpacity
                key={cell.date}
                activeOpacity={0.84}
                onPress={() => {
                  setSelectedDate(cell.date);
                  setScope("day");
                }}
                style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 3 }}
              >
                <View
                  style={{
                    flex: 1,
                    borderRadius: borderRadius.md,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: selected
                      ? colors.primary
                      : isFull
                        ? colors.error + "18"
                        : count > 0
                          ? colors.primary + "14"
                          : colors.surfaceAlt,
                    borderWidth: today || count > 0 || isFull ? 1 : 0,
                    borderColor: selected
                      ? colors.primary
                      : isFull
                        ? colors.error
                        : today
                          ? colors.primary
                          : colors.border,
                  }}
                >
                  <Text
                    style={{
                      color: selected ? "white" : colors.text,
                      ...fontForWeight(today || count > 0 ? "900" : "700"),
                    }}
                  >
                    {cell.day}
                  </Text>
                  {count > 0 ? (
                    <View
                      style={{
                        minWidth: 18,
                        height: 18,
                        borderRadius: 9,
                        marginTop: 2,
                        paddingHorizontal: 5,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: selected
                          ? "rgba(255,255,255,0.24)"
                          : colors.primary,
                      }}
                    >
                      <Text
                        style={{
                          color: "white",
                          fontSize: 10,
                          ...fontForWeight("900"),
                        }}
                      >
                        {count}
                      </Text>
                    </View>
                  ) : null}
                  {isFull ? (
                    <Text
                      style={{
                        color: selected ? "white" : colors.error,
                        fontSize: 8,
                        ...fontForWeight("900"),
                        marginTop: 1,
                      }}
                    >
                      {blocked ? "NGHỈ" : "KÍN"}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Tìm theo khách, SĐT, điểm đón, điểm đến..."
          icon={<Search size={18} color={colors.textTertiary} />}
        />

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: spacing.sm,
            marginTop: spacing.md,
          }}
        >
          <Pill
            label="Ngày đang chọn"
            active={scope === "day"}
            onPress={() => setScope("day")}
          />
          <Pill
            label="Cả tháng"
            active={scope === "month"}
            onPress={() => setScope("month")}
          />
        </View>

        <View
          style={{
            marginTop: spacing.md,
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: colors.border,
            paddingVertical: spacing.md,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.sm,
              paddingHorizontal: spacing.md,
            }}
          >
            <Ban size={17} color={colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, ...fontForWeight("900") }}>
                Thời gian không nhận chuyến
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: fontSize.xs,
                  marginTop: 2,
                }}
              >
                Khóa ngày hoặc khung giờ để khách không đặt trước trùng lịch
                nghỉ của bạn.
              </Text>
            </View>
          </View>

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: spacing.sm,
              paddingHorizontal: spacing.md,
              marginTop: spacing.md,
            }}
          >
            <Pill
              label="Nghỉ cả ngày"
              active={blockMode === "all_day"}
              onPress={() => setBlockMode("all_day")}
            />
            <Pill
              label="Theo khung giờ"
              active={blockMode === "custom"}
              onPress={() => setBlockMode("custom")}
            />
          </View>

          {blockMode === "custom" ? (
            <View
              style={{
                flexDirection: "row",
                gap: spacing.sm,
                paddingHorizontal: spacing.md,
                marginTop: spacing.md,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: fontSize.xs,
                    ...fontForWeight("800"),
                    marginBottom: 6,
                  }}
                >
                  Bắt đầu
                </Text>
                <TextInput
                  value={blockStartTime}
                  onChangeText={setBlockStartTime}
                  placeholder="08:00"
                  keyboardType="default"
                  icon={<Clock size={17} color={colors.textTertiary} />}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: fontSize.xs,
                    ...fontForWeight("800"),
                    marginBottom: 6,
                  }}
                >
                  Kết thúc
                </Text>
                <TextInput
                  value={blockEndTime}
                  onChangeText={setBlockEndTime}
                  placeholder="12:00"
                  keyboardType="default"
                  icon={<Clock size={17} color={colors.textTertiary} />}
                />
              </View>
            </View>
          ) : null}

          <View
            style={{
              marginTop: spacing.md,
              paddingHorizontal: spacing.md,
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.md,
            }}
          >
            <Repeat2
              size={18}
              color={repeatWeekly ? colors.primary : colors.textTertiary}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: colors.text,
                  fontSize: fontSize.sm,
                  ...fontForWeight("900"),
                }}
              >
                Lặp lại hằng tuần
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: fontSize.xs,
                  marginTop: 2,
                }}
              >
                Tạo cùng khung nghỉ trong 8 tuần tới.
              </Text>
            </View>
            <Switch
              value={repeatWeekly}
              onValueChange={setRepeatWeekly}
              trackColor={{
                false: colors.surfaceAlt,
                true: colors.primary + "66",
              }}
              thumbColor={repeatWeekly ? colors.primary : colors.textTertiary}
            />
          </View>

          <View
            style={{ paddingHorizontal: spacing.md, marginTop: spacing.md }}
          >
            <TouchableOpacity
              activeOpacity={0.84}
              disabled={blocking}
              onPress={createBlockForSelectedDay}
              style={{
                borderRadius: borderRadius.md,
                backgroundColor: colors.warning + "18",
                borderWidth: 1,
                borderColor: colors.warning + "50",
                paddingVertical: spacing.sm,
                alignItems: "center",
                opacity: blocking ? 0.6 : 1,
              }}
            >
              <Text
                style={{
                  color: colors.warning,
                  ...fontForWeight("900"),
                  fontSize: fontSize.sm,
                }}
              >
                {blocking ? "Đang thêm..." : "Thêm thời gian không nhận chuyến"}
              </Text>
            </TouchableOpacity>
          </View>

          {selectedBlocks.length > 0 && (
            <View
              style={{
                marginTop: spacing.md,
                borderTopWidth: 1,
                borderTopColor: colors.border,
              }}
            >
              {selectedBlocks.map((block) => {
                const isAllDay = block.blockKind === "all_day";
                return (
                  <View
                    key={block.id}
                    style={{
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: spacing.md,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    }}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontSize: fontSize.xs,
                          ...fontForWeight("900"),
                        }}
                      >
                        {isAllDay
                          ? "Nghỉ cả ngày"
                          : `${new Date(block.startAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} - ${new Date(block.endAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`}
                      </Text>
                      {block.repeatGroupId ? (
                        <Text
                          style={{
                            color: colors.textTertiary,
                            fontSize: 10,
                            marginTop: 2,
                          }}
                        >
                          Lặp hằng tuần
                          {block.repeatUntil
                            ? ` đến ${formatVietnamDate(block.repeatUntil)}`
                            : ""}
                        </Text>
                      ) : null}
                    </View>
                    <TouchableOpacity
                      activeOpacity={0.84}
                      disabled={blocking}
                      onPress={() => deleteScheduleBlock(block)}
                    >
                      <Trash2 size={17} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.xs,
            marginTop: spacing.md,
            marginBottom: spacing.sm,
          }}
        >
          <Filter size={16} color={colors.textSecondary} />
          <Text style={{ color: colors.text, ...fontForWeight("900") }}>
            Trạng thái
          </Text>
        </View>
        <View
          style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}
        >
          <Pill
            label="Tất cả"
            active={statusFilter === "all"}
            onPress={() => setStatusFilter("all")}
          />
          <Pill
            label="Chờ nhận"
            active={statusFilter === "pending"}
            onPress={() => setStatusFilter("pending")}
          />
          <Pill
            label="Đã nhận"
            active={statusFilter === "accepted"}
            onPress={() => setStatusFilter("accepted")}
          />
          <Pill
            label="Hoàn thành"
            active={statusFilter === "completed"}
            onPress={() => setStatusFilter("completed")}
          />
          <Pill
            label="Hủy/từ chối"
            active={statusFilter === "cancelled"}
            onPress={() => setStatusFilter("cancelled")}
          />
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.xs,
            marginTop: spacing.md,
            marginBottom: spacing.sm,
          }}
        >
          <SlidersHorizontal size={16} color={colors.textSecondary} />
          <Text style={{ color: colors.text, ...fontForWeight("900") }}>
            Sắp xếp
          </Text>
        </View>
        <View
          style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}
        >
          <Pill
            label="Giờ sớm nhất"
            active={sortMode === "time_asc"}
            onPress={() => setSortMode("time_asc")}
          />
          <Pill
            label="Giờ muộn nhất"
            active={sortMode === "time_desc"}
            onPress={() => setSortMode("time_desc")}
          />
          <Pill
            label="Giá cao"
            active={sortMode === "price_desc"}
            onPress={() => setSortMode("price_desc")}
          />
          <Pill
            label="Giá thấp"
            active={sortMode === "price_asc"}
            onPress={() => setSortMode("price_asc")}
          />
          <Pill
            label="Mới tạo"
            active={sortMode === "newest"}
            onPress={() => setSortMode("newest")}
          />
        </View>
      </View>

      <View style={{ paddingTop: spacing.lg }}>
        <View
          style={{
            paddingHorizontal: spacing.lg,
            marginBottom: spacing.sm,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View>
            <Text style={{ color: colors.text, ...fontForWeight("900") }}>
              {scope === "day"
                ? `Chuyến ngày ${formatVietnamDate(selectedDate)}`
                : `Chuyến ${getMonthLabel(month).toLowerCase()}`}
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: fontSize.xs,
                marginTop: 2,
              }}
            >
              {visibleBookings.length} chuyến phù hợp bộ lọc
            </Text>
          </View>
          <CheckCircle2 size={19} color={colors.success} />
        </View>

        {loading ? (
          <View style={{ gap: spacing.sm }}>
            <CardSkeleton />
            <CardSkeleton />
          </View>
        ) : visibleBookings.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            {visibleBookings.map((booking) => (
              <ScheduleBookingRow
                key={booking.id}
                booking={booking}
                loading={loadingId === booking.id}
                onOpen={() => openBooking(booking.id)}
                onAccept={() => acceptBooking(booking)}
                onReject={() => rejectBooking(booking)}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            icon={<CalendarDays size={42} color={colors.textTertiary} />}
            title="Không có chuyến đặt trước"
            description="Thử đổi ngày, chuyển sang cả tháng hoặc bỏ bớt bộ lọc."
          />
        )}
      </View>
    </Screen>
  );
}
