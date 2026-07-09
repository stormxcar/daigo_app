import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ActivityIndicator, Text, TouchableOpacity, Vibration, View } from "react-native";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import * as Location from "expo-location";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Bell, MapPin, UserCircle } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActiveTripSheet } from "@/components/ActiveTripSheet";
import { LocationAccessFallback } from "@/components/LocationAccessFallback";
import { DriverDashboardSheet } from "@/components/driver-dashboard/DriverDashboardSheet";
import {
  DriverDashboardRouteState,
  DriverMapView,
} from "@/components/driver-dashboard/DriverMapView";
import { DriverStatusPill } from "@/components/driver-dashboard/DriverStatusPill";
import { BOOKING_STATUS, VISIBLE_ACTIVE_BOOKING_STATUSES } from "@/constants";
import { apiClient } from "@/services/api";
import {
  DeviceLocation,
  getCurrentDeviceLocation,
} from "@/services/deviceLocation";
import {
  getDistanceMeters,
  startDriverLocationWatch,
} from "@/services/driverLocation";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useNotificationStore } from "@/stores/notificationStore";
import { useTheme } from "@/theme";
import {
  borderRadius,
  fontForWeight,
  fontSize,
  shadows,
  spacing,
} from "@/theme/tokens";
import { Booking, BookingDispatch, RatingReview, TripPhase } from "@/types";
import { showError, showInfo, showSuccess } from "@/utils/toast";

const money = (value: number) => `${value.toLocaleString("vi-VN")}đ`;
const defaultRouteState: DriverDashboardRouteState = {
  loading: false,
  route: null,
  error: null,
};

const getTripPhase = (booking?: Booking | null): TripPhase =>
  booking?.status === BOOKING_STATUS.TRIP_STARTED ? "dropoff" : "pickup";

const canShowAsNearby = (booking: Booking) =>
  !booking.driverId &&
  [
    BOOKING_STATUS.SEARCHING_DRIVER,
    BOOKING_STATUS.SCHEDULED_PENDING_DRIVER,
  ].includes(booking.status as any);

export default function DriverDashboard() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const unreadNotifications = useNotificationStore(
    (state) => state.notifications.filter((item) => !item.read).length,
  );
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [visibleBookings, setVisibleBookings] = useState<Booking[]>([]);
  const [pendingDispatches, setPendingDispatches] = useState<BookingDispatch[]>(
    [],
  );
  const [ratings, setRatings] = useState<RatingReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [driverLocation, setDriverLocation] = useState<DeviceLocation | null>(
    null,
  );
  const [locationAccessBlocked, setLocationAccessBlocked] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [verificationStatus, setVerificationStatus] =
    useState<string>("PENDING");
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [hiddenNearbyBookingIds, setHiddenNearbyBookingIds] = useState<
    Set<string>
  >(() => new Set());
  const [serverSkippedBookingIds, setServerSkippedBookingIds] = useState<
    Set<string>
  >(() => new Set());
  const [lastSkippedBooking, setLastSkippedBooking] = useState<Booking | null>(
    null,
  );
  const [pickupRadiusKm, setPickupRadiusKm] = useState<2 | 5 | 10>(5);
  const [pauseUntil, setPauseUntil] = useState<string | null>(null);
  const [routeState, setRouteState] =
    useState<DriverDashboardRouteState>(defaultRouteState);
  const [followDriver, setFollowDriver] = useState(true);
  const bookingAlertPlayer = useAudioPlayer(require("../../../assets/sounds/incoming-call.mp3"));
  const knownNearbyBookingIdsRef = useRef<Set<string>>(new Set());
  const nearbyAlertReadyRef = useRef(false);
  const bookingAlertStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastOnlineLocationSyncRef = useRef(0);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = useCallback(
    async (manualRefresh = false) => {
      if (!user) return;
      try {
        if (manualRefresh) setRefreshing(true);
        else setLoading(true);

        const [
          driverBookings,
          candidateBookings,
          dispatches,
          skippedBookingIds,
          driverStatus,
          driverRatings,
        ] = await Promise.all([
          apiClient.getBookings({ driverId: user.id, page: 1, pageSize: 80 }),
          apiClient.getBookings({
            driverVisibleTo: user.id,
            page: 1,
            pageSize: 30,
          }),
          apiClient
            .getPendingBookingDispatches(user.id)
            .catch(() => [] as BookingDispatch[]),
          apiClient
            .getSkippedBookingIdsForDriver(user.id)
            .catch(() => [] as string[]),
          apiClient.getDriverStatus(user.id),
          apiClient.getRatingsForUser(user.id),
        ]);

        setBookings(driverBookings);
        setVisibleBookings(candidateBookings);
        setPendingDispatches(
          dispatches.filter((dispatch) => !!dispatch.booking),
        );
        setServerSkippedBookingIds(new Set(skippedBookingIds));
        setRatings(driverRatings);
        const activePauseUntil =
          driverStatus?.pauseUntil &&
          new Date(driverStatus.pauseUntil).getTime() > Date.now()
            ? driverStatus.pauseUntil
            : null;
        setPauseUntil(activePauseUntil);
        setIsOnline(!!driverStatus?.isOnline && !activePauseUntil);
        setVerificationStatus(driverStatus?.verificationStatus ?? "PENDING");

        if (
          driverStatus?.pauseUntil &&
          !activePauseUntil &&
          !driverStatus.isOnline
        ) {
          getCurrentDeviceLocation()
            .then((location) =>
              apiClient.setDriverOnline(user.id, true, location),
            )
            .then((updated) => {
              setIsOnline(updated.isOnline);
              setVerificationStatus(updated.verificationStatus);
              setPauseUntil(null);
            })
            .catch(() => undefined);
        }

        getCurrentDeviceLocation()
          .then((location) => {
            setDriverLocation(location);
            setLocationAccessBlocked(false);
          })
          .catch(() => undefined);
      } catch (error: any) {
        showError("Không thể tải dashboard", error.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const scheduleDashboardRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => loadData(true), 650);
  }, [loadData]);

  useEffect(() => {
    if (!user) return;

    const refreshIfRelevantBooking = (payload: any) => {
      const row = (payload.new ?? payload.old) as any;
      if (!row) return;
      const isDriverTrip = row.driver_id === user.id;
      const isOpenTrip =
        !row.driver_id &&
        [
          BOOKING_STATUS.SEARCHING_DRIVER,
          BOOKING_STATUS.SCHEDULED_PENDING_DRIVER,
        ].includes(row.status);
      if (isDriverTrip || isOpenTrip) scheduleDashboardRefresh();
    };

    const channel = supabase
      .channel(`driver-dashboard-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        refreshIfRelevantBooking,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "booking_dispatches",
          filter: `driver_id=eq.${user.id}`,
        },
        () => scheduleDashboardRefresh(),
      )
      .subscribe();

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [scheduleDashboardRefresh, user]);

  useEffect(
    () => () => {
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    },
    [],
  );

  const activeTrip = useMemo(
    () =>
      bookings.find((booking) =>
        VISIBLE_ACTIVE_BOOKING_STATUSES.includes(booking.status as any),
      ) ?? null,
    [bookings],
  );
  const activeTripId = activeTrip?.id;
  const activeTripPhase = useMemo(() => getTripPhase(activeTrip), [activeTrip]);

  useEffect(() => {
    if (!user || !isOnline || activeTrip) return;

    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;

    const startWatch = async () => {
      const existing = await Location.getForegroundPermissionsAsync();
      let status = existing.status;
      if (status !== "granted") {
        const requested = await Location.requestForegroundPermissionsAsync();
        status = requested.status;
      }
      if (status !== "granted") {
        setLocationAccessBlocked(true);
        return;
      }

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (position) => {
          const nextLocation: DeviceLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            label: driverLocation?.label ?? "Vị trí GPS hiện tại",
          };
          setDriverLocation(nextLocation);
          setLocationAccessBlocked(false);

          const now = Date.now();
          if (now - lastOnlineLocationSyncRef.current < 15000) return;
          lastOnlineLocationSyncRef.current = now;
          apiClient
            .setDriverOnline(user.id, true, nextLocation)
            .then((statusRow) =>
              setVerificationStatus(statusRow.verificationStatus),
            )
            .catch((error) => {
              if (__DEV__)
                console.warn("Không thể đồng bộ vị trí online tài xế", error);
            });
        },
      );

      if (cancelled) subscription.remove();
    };

    startWatch().catch((error) => {
      if (__DEV__) console.warn("Không thể theo dõi vị trí dashboard", error);
    });

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [activeTrip, driverLocation?.label, isOnline, user]);

  useEffect(() => {
    if (!user || !activeTripId) return;

    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;
    const phase = activeTripPhase;

    startDriverLocationWatch(activeTripId, user.id, phase, (location) => {
      setDriverLocation({
        lat: location.latitude,
        lng: location.longitude,
        label:
          phase === "pickup"
            ? "Đang di chuyển đến điểm đón"
            : "Đang di chuyển đến điểm đến",
      });
      setLocationAccessBlocked(false);
    })
      .then((watch) => {
        subscription = watch;
        if (cancelled) watch.remove();
      })
      .catch((error) => {
        if (__DEV__)
          console.warn("Không thể bật GPS realtime cho chuyến", error);
      });

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [activeTripId, activeTripPhase, user]);

  const toggleOnline = async () => {
    if (!user) return;
    try {
      setOnlineLoading(true);
      const location = await getCurrentDeviceLocation().catch(() => {
        setLocationAccessBlocked(true);
        return driverLocation;
      });

      if (!location && !isOnline) {
        showError(
          "Không thể lấy vị trí",
          "Vui lòng bật GPS hoặc nhập vị trí hiện tại để nhận chuyến.",
        );
        return;
      }

      const updated = await apiClient.setDriverOnline(
        user.id,
        !isOnline,
        location ?? undefined,
      );
      setIsOnline(updated.isOnline);
      setVerificationStatus(updated.verificationStatus);
      if (location) {
        setDriverLocation(location);
        setLocationAccessBlocked(false);
      }
      if (updated.isOnline) setPauseUntil(null);
      showSuccess(
        updated.isOnline ? "Đã bật nhận chuyến" : "Đã tắt nhận chuyến",
        "Trạng thái tài xế đã được cập nhật.",
      );
    } catch (error: any) {
      showError("Không thể cập nhật trạng thái tài xế", error.message);
    } finally {
      setOnlineLoading(false);
    }
  };

  const applyManualDriverLocation = (place: {
    name: string;
    address: string;
    placeId: string;
    latitude?: number;
    longitude?: number;
  }) => {
    if (
      typeof place.latitude !== "number" ||
      typeof place.longitude !== "number"
    ) {
      showError(
        "Địa điểm thiếu tọa độ",
        "Vui lòng chọn một gợi ý hợp lệ từ danh sách.",
      );
      return;
    }
    setDriverLocation({
      label: place.address || place.name,
      lat: place.latitude,
      lng: place.longitude,
    });
    setLocationAccessBlocked(false);
    showSuccess(
      "Đã dùng vị trí thủ công",
      "Bạn có thể bật nhận chuyến bằng vị trí này.",
    );
  };

  const dispatchByBookingId = useMemo(() => {
    const map = new Map<string, BookingDispatch>();
    pendingDispatches.forEach((dispatch) => {
      if (dispatch.bookingId) map.set(dispatch.bookingId, dispatch);
    });
    return map;
  }, [pendingDispatches]);

  const nearbyBookings = useMemo(() => {
    const byId = new Map<string, Booking>();
    pendingDispatches.forEach((dispatch) => {
      if (
        dispatch.booking &&
        !hiddenNearbyBookingIds.has(dispatch.booking.id) &&
        !serverSkippedBookingIds.has(dispatch.booking.id)
      ) {
        byId.set(dispatch.booking.id, dispatch.booking);
      }
    });
    visibleBookings.forEach((booking) => {
      if (
        canShowAsNearby(booking) &&
        !hiddenNearbyBookingIds.has(booking.id) &&
        !serverSkippedBookingIds.has(booking.id)
      ) {
        byId.set(booking.id, booking);
      }
    });

    const items = [...byId.values()];
    if (!driverLocation) return items.slice(0, 8);

    return items
      .filter((booking) => {
        if (
          typeof booking.pickupLat !== "number" ||
          typeof booking.pickupLng !== "number"
        )
          return true;
        const distance = getDistanceMeters(
          { latitude: driverLocation.lat, longitude: driverLocation.lng },
          { latitude: booking.pickupLat, longitude: booking.pickupLng },
        );
        return distance <= pickupRadiusKm * 1000;
      })
      .sort((a, b) => {
        const aDistance =
          typeof a.pickupLat === "number" && typeof a.pickupLng === "number"
            ? getDistanceMeters(
                { latitude: driverLocation.lat, longitude: driverLocation.lng },
                { latitude: a.pickupLat, longitude: a.pickupLng },
              )
            : Infinity;
        const bDistance =
          typeof b.pickupLat === "number" && typeof b.pickupLng === "number"
            ? getDistanceMeters(
                { latitude: driverLocation.lat, longitude: driverLocation.lng },
                { latitude: b.pickupLat, longitude: b.pickupLng },
              )
            : Infinity;
        return aDistance - bDistance;
      })
      .slice(0, 8);
  }, [
    driverLocation,
    hiddenNearbyBookingIds,
    pendingDispatches,
    pickupRadiusKm,
    serverSkippedBookingIds,
    visibleBookings,
  ]);

  const stopBookingAlertFeedback = useCallback(async () => {
    Vibration.cancel();
    if (bookingAlertStopRef.current) {
      clearTimeout(bookingAlertStopRef.current);
      bookingAlertStopRef.current = null;
    }
    try {
      bookingAlertPlayer.pause();
      await bookingAlertPlayer.seekTo(0);
    } catch {
      // Audio feedback is best-effort; notification/realtime UI still works.
    }
  }, [bookingAlertPlayer]);

  const playBookingAlertFeedback = useCallback(async () => {
    Vibration.cancel();
    Vibration.vibrate([0, 450, 220, 450, 220, 650], false);
    try {
      await setAudioModeAsync({ playsInSilentMode: true });
      bookingAlertPlayer.loop = false;
      bookingAlertPlayer.volume = 0.78;
      await bookingAlertPlayer.seekTo(0);
      bookingAlertPlayer.play();
      if (bookingAlertStopRef.current) clearTimeout(bookingAlertStopRef.current);
      bookingAlertStopRef.current = setTimeout(() => {
        stopBookingAlertFeedback().catch(() => undefined);
      }, 4200);
    } catch (error) {
      if (__DEV__) console.warn("Không thể phát âm báo booking mới", error);
    }
  }, [bookingAlertPlayer, stopBookingAlertFeedback]);

  useEffect(() => () => {
    stopBookingAlertFeedback().catch(() => undefined);
  }, [stopBookingAlertFeedback]);

  useEffect(() => {
    const currentIds = new Set(nearbyBookings.map((booking) => booking.id));
    if (!nearbyAlertReadyRef.current) {
      knownNearbyBookingIdsRef.current = currentIds;
      nearbyAlertReadyRef.current = true;
      return;
    }

    const newInstantBooking = nearbyBookings.find((booking) => {
      if (knownNearbyBookingIdsRef.current.has(booking.id)) return false;
      return booking.status === BOOKING_STATUS.SEARCHING_DRIVER && booking.bookingMode !== "scheduled";
    });

    knownNearbyBookingIdsRef.current = currentIds;
    if (!newInstantBooking || !isOnline || activeTrip) return;

    playBookingAlertFeedback().catch(() => undefined);
    showInfo("Có chuyến mới gần bạn", `${newInstantBooking.pickupLocation} → ${newInstantBooking.dropoffLocation}`);
  }, [activeTrip, isOnline, nearbyBookings, playBookingAlertFeedback]);
  const acceptNearbyBooking = async (booking: Booking) => {
    if (!user) return;
    try {
      await stopBookingAlertFeedback();
      setActionLoadingId(booking.id);
      const dispatch = dispatchByBookingId.get(booking.id);
      const updated = dispatch
        ? await apiClient.acceptBookingDispatch(dispatch)
        : booking.bookingMode === "scheduled" ||
            booking.status === BOOKING_STATUS.SCHEDULED_PENDING_DRIVER
          ? await apiClient.acceptScheduledBooking(booking.id)
          : await apiClient.acceptBooking(booking.id, user.id);
      setLastSkippedBooking(null);
      setBookings((current) => [
        updated,
        ...current.filter((item) => item.id !== updated.id),
      ]);
      setVisibleBookings((current) =>
        current.filter((item) => item.id !== updated.id),
      );
      setPendingDispatches((current) =>
        current.filter((item) => item.bookingId !== updated.id),
      );
      setFollowDriver(true);
      showSuccess(
        "Đã nhận chuyến",
        "Dashboard sẽ chuyển sang chế độ theo dõi chuyến đi.",
      );
      loadData(true);
    } catch (error: any) {
      showError("Không thể nhận chuyến", error.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const rejectNearbyBooking = async (booking: Booking) => {
    try {
      await stopBookingAlertFeedback();
      setActionLoadingId(booking.id);
      const dispatch = dispatchByBookingId.get(booking.id);
      if (dispatch) {
        await apiClient.rejectBookingDispatch(dispatch.id);
        setPendingDispatches((current) =>
          current.filter((item) => item.id !== dispatch.id),
        );
        showSuccess(
          "Đã từ chối chuyến",
          "Chuyến này sẽ không còn hiển thị trong danh sách gợi ý của bạn.",
        );
      } else {
        if (user)
          await apiClient.skipBookingForDriver(
            user.id,
            booking.id,
            "dashboard_dismissed",
          );
        setServerSkippedBookingIds(
          (current) => new Set([...current, booking.id]),
        );
        setHiddenNearbyBookingIds(
          (current) => new Set([...current, booking.id]),
        );
        showInfo(
          "Đã bỏ qua chuyến",
          "Chuyến này sẽ không hiện lại sau khi bạn refresh dashboard.",
        );
      }
    } catch (error: any) {
      showError("Không thể từ chối chuyến", error.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const restoreSkippedBooking = async (booking: Booking) => {
    if (!user) return;
    try {
      setActionLoadingId(booking.id);
      await apiClient.restoreSkippedBookingForDriver(user.id, booking.id);
      setServerSkippedBookingIds((current) => {
        const next = new Set(current);
        next.delete(booking.id);
        return next;
      });
      setHiddenNearbyBookingIds((current) => {
        const next = new Set(current);
        next.delete(booking.id);
        return next;
      });
      setLastSkippedBooking(null);
      showSuccess(
        "Đã hoàn tác",
        "Chuyến vừa bỏ qua đã được hiển thị lại nếu còn khả dụng.",
      );
      loadData(true);
    } catch (error: any) {
      showError("Không thể hoàn tác", error.message);
    } finally {
      setActionLoadingId(null);
    }
  };
  const pauseReceiving = async (minutes: 15 | 30) => {
    if (!user) return;
    const until = new Date(Date.now() + minutes * 60 * 1000);
    try {
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
      setPauseUntil(until.toISOString());
      if (isOnline) {
        const updated = await apiClient.setDriverOnline(
          user.id,
          false,
          driverLocation ?? undefined,
          until.toISOString(),
        );
        setIsOnline(updated.isOnline);
        setVerificationStatus(updated.verificationStatus);
      }
      showInfo(
        "Đã bật tạm nghỉ",
        `Bạn sẽ tạm dừng nhận chuyến trong ${minutes} phút.`,
      );
      pauseTimerRef.current = setTimeout(
        async () => {
          const location = await getCurrentDeviceLocation().catch(
            () => driverLocation,
          );
          if (!location) return;
          apiClient
            .setDriverOnline(user.id, true, location)
            .then((updated) => {
              setIsOnline(updated.isOnline);
              setVerificationStatus(updated.verificationStatus);
              setPauseUntil(null);
              setDriverLocation(location);
              showSuccess(
                "Đã bật lại nhận chuyến",
                "Thời gian tạm nghỉ đã kết thúc.",
              );
            })
            .catch(() => undefined);
        },
        minutes * 60 * 1000,
      );
    } catch (error: any) {
      showError("Không thể bật tạm nghỉ", error.message);
    }
  };

  const stats = useMemo(() => {
    const completed = bookings.filter(
      (booking) => booking.status === BOOKING_STATUS.TRIP_COMPLETED,
    );
    const active = bookings.filter((booking) =>
      VISIBLE_ACTIVE_BOOKING_STATUSES.includes(booking.status as any),
    );
    const revenue = completed.reduce(
      (sum, booking) =>
        sum + (booking.actualPrice ?? booking.estimatedPrice ?? 0),
      0,
    );
    const todayKey = new Date().toISOString().slice(0, 10);
    const todayCompleted = completed.filter(
      (booking) => booking.date === todayKey,
    );
    const todayRevenue = todayCompleted.reduce(
      (sum, booking) =>
        sum + (booking.actualPrice ?? booking.estimatedPrice ?? 0),
      0,
    );
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const weekRevenue = completed
      .filter(
        (booking) =>
          new Date(booking.date || booking.createdAt) >= sevenDaysAgo,
      )
      .reduce(
        (sum, booking) =>
          sum + (booking.actualPrice ?? booking.estimatedPrice ?? 0),
        0,
      );
    const averageRating = ratings.length
      ? ratings.reduce((sum, item) => sum + item.rating, 0) / ratings.length
      : 0;
    return {
      completed: completed.length,
      active: active.length,
      revenue,
      todayRevenue,
      todayCompleted: todayCompleted.length,
      weekRevenue,
      averageRating,
      ratingCount: ratings.length,
    };
  }, [bookings, ratings]);

  const todayScheduledBooking = useMemo(() => {
    const now = new Date();
    return (
      [...bookings]
        .filter((booking) => {
          if (!booking.scheduledStartAt) return false;
          if (
            ![
              BOOKING_STATUS.SCHEDULED_DRIVER_ACCEPTED,
              BOOKING_STATUS.SCHEDULED_UPCOMING,
            ].includes(booking.status as any)
          )
            return false;
          const tripDate = new Date(booking.scheduledStartAt);
          return (
            tripDate.getFullYear() === now.getFullYear() &&
            tripDate.getMonth() === now.getMonth() &&
            tripDate.getDate() === now.getDate() &&
            tripDate.getTime() > now.getTime()
          );
        })
        .sort(
          (a, b) =>
            new Date(a.scheduledStartAt!).getTime() -
            new Date(b.scheduledStartAt!).getTime(),
        )[0] ?? null
    );
  }, [bookings]);

  const recentBookings = useMemo(() => bookings.slice(0, 5), [bookings]);

  const paymentSummary = useMemo(() => {
    const cash = bookings.filter((booking) => booking.paymentMethod === "cash");
    const transfer = bookings.filter(
      (booking) =>
        booking.paymentMethod === "bank_transfer" ||
        booking.paymentMethod === "vietqr",
    );
    const pendingReview = bookings.filter((booking) =>
      ["pending", "submitted"].includes(booking.paymentStatus ?? "unpaid"),
    );
    const paid = bookings.filter((booking) =>
      ["paid", "driver_verified"].includes(booking.paymentStatus ?? "unpaid"),
    );
    return {
      cash: cash.length,
      transfer: transfer.length,
      pendingReview: pendingReview.length,
      paid: paid.length,
    };
  }, [bookings]);

  if (locationAccessBlocked && !driverLocation) {
    return (
      <LocationAccessFallback
        description="Tài xế cần vị trí để hệ thống chỉ đường đến điểm đón và gợi ý chuyến gần bạn. Nếu GPS chưa bật, hãy nhập vị trí hiện tại để tiếp tục nhận chuyến."
        onSelectLocation={applyManualDriverLocation}
        onRetryGps={async () => {
          const location = await getCurrentDeviceLocation().catch(() => null);
          if (location) {
            setDriverLocation(location);
            setLocationAccessBlocked(false);
          }
        }}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <DriverMapView
        location={driverLocation}
        isOnline={isOnline}
        activeTrip={activeTrip}
        nearbyBookings={nearbyBookings}
        pickupRadiusKm={pickupRadiusKm}
        followDriver={followDriver}
        onCenterPress={() => setFollowDriver(true)}
        onBookingPress={(booking) =>
          router.push({
            pathname: "/(driver)/booking-detail" as any,
            params: { id: booking.id },
          })
        }
        onRouteStateChange={setRouteState}
      />

      <LinearGradient
        pointerEvents="none"
        colors={
          isDark
            ? ["rgba(15,23,42,0.88)", "rgba(15,23,42,0.38)", "rgba(15,23,42,0)"]
            : [
                "rgba(248,250,252,0.92)",
                "rgba(248,250,252,0.38)",
                "rgba(248,250,252,0)",
              ]
        }
        locations={[0, 0.58, 1]}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: insets.top + 146,
        }}
      />

      <View
        style={{
          position: "absolute",
          top: insets.top + spacing.sm,
          left: spacing.lg,
          right: spacing.lg,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: spacing.md,
        }}
      >
        <TouchableOpacity
          activeOpacity={0.84}
          onPress={() => router.push("/(driver)/profile" as any)}
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
            borderRadius: borderRadius.full,
            backgroundColor: isDark
              ? "rgba(15,23,42,0.92)"
              : "rgba(255,255,255,0.94)",
            ...shadows.md,
          }}
        >
          <UserCircle size={28} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text
              numberOfLines={1}
              style={{
                color: colors.text,
                fontSize: fontSize.sm,
                ...fontForWeight("900"),
              }}
            >
              {user?.fullName ?? "Tài xế Daigo"}
            </Text>
            <Text
              numberOfLines={1}
              style={{ color: colors.textSecondary, fontSize: 11 }}
            >
              {driverLocation?.label ?? "Đang xác định vị trí"}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.84}
          onPress={() => router.push("/(driver)/notifications" as any)}
          style={{
            width: 46,
            height: 46,
            borderRadius: 23,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: isDark
              ? "rgba(15,23,42,0.92)"
              : "rgba(255,255,255,0.94)",
            ...shadows.md,
          }}
        >
          <Bell size={21} color={colors.text} />
          {unreadNotifications > 0 && (
            <View
              style={{
                position: "absolute",
                top: 7,
                right: 6,
                minWidth: 17,
                height: 17,
                borderRadius: 9,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.error,
                paddingHorizontal: 4,
              }}
            >
              <Text
                style={{ color: "#fff", fontSize: 9, ...fontForWeight("900") }}
              >
                {Math.min(unreadNotifications, 99)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View
        style={{ position: "absolute", top: insets.top + 70, left: spacing.lg }}
      >
        <DriverStatusPill
          enabled={isOnline}
          loading={onlineLoading}
          verificationStatus={verificationStatus}
          onPress={toggleOnline}
        />
      </View>

      {!!activeTrip && (
        <TouchableOpacity
          activeOpacity={0.86}
          onPress={() =>
            router.push({
              pathname: "/(driver)/booking-detail" as any,
              params: { id: activeTrip.id },
            })
          }
          style={{
            position: "absolute",
            top: insets.top + 132,
            left: spacing.lg,
            right: spacing.lg,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
            borderRadius: borderRadius.lg,
            backgroundColor: colors.primary,
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
            ...shadows.md,
          }}
        >
          <MapPin size={18} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: "#fff",
                fontSize: fontSize.sm,
                ...fontForWeight("900"),
              }}
            >
              Đang có chuyến cần xử lý
            </Text>
            <Text
              numberOfLines={1}
              style={{ color: "rgba(255,255,255,0.86)", fontSize: 11 }}
            >
              {activeTrip.pickupLocation} •{" "}
              {money(activeTrip.actualPrice ?? activeTrip.estimatedPrice ?? 0)}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {loading && !refreshing && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: insets.top + 192,
            alignSelf: "center",
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            borderRadius: borderRadius.full,
            backgroundColor: isDark
              ? "rgba(15,23,42,0.9)"
              : "rgba(255,255,255,0.92)",
            ...shadows.sm,
          }}
        >
          <ActivityIndicator size="small" color={colors.primary} />
          <Text
            style={{
              color: colors.text,
              fontSize: fontSize.xs,
              ...fontForWeight("800"),
            }}
          >
            Đang tải dashboard
          </Text>
        </View>
      )}

      <ActiveTripSheet
        booking={activeTrip}
        role="driver"
        onOpenDetail={(id) =>
          router.push({
            pathname: "/(driver)/booking-detail" as any,
            params: { id },
          })
        }
      />

      <DriverDashboardSheet
        loading={loading}
        refreshing={refreshing}
        actionLoadingId={actionLoadingId}
        stats={stats}
        recentBookings={recentBookings}
        nearbyBookings={nearbyBookings}
        activeTrip={activeTrip}
        lastSkippedBooking={lastSkippedBooking}
        todayScheduledBooking={todayScheduledBooking}
        routeState={routeState}
        pickupRadiusKm={pickupRadiusKm}
        pauseUntil={pauseUntil}
        paymentSummary={paymentSummary}
        onRefresh={() => loadData(true)}
        onOpenBookings={() => router.push("/(driver)/bookings" as any)}
        onOpenBookingDetail={(id) =>
          router.push({
            pathname: "/(driver)/booking-detail" as any,
            params: { id },
          })
        }
        onOpenSchedule={() => router.push("/(driver)/schedule" as any)}
        onOpenRevenue={() => router.push("/(driver)/revenue" as any)}
        onOpenChat={() => router.push("/(driver)/chat" as any)}
        onAcceptBooking={acceptNearbyBooking}
        onRejectBooking={rejectNearbyBooking}
        onRestoreSkippedBooking={restoreSkippedBooking}
        onChangePickupRadius={setPickupRadiusKm}
        onPauseReceiving={pauseReceiving}
      />
    </View>
  );
}







