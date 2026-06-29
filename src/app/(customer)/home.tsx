import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  ImageBackground,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router, usePathname } from "expo-router";
import {
  CalendarClock,
  Car,
  FileText,
  LocateFixed,
  Map,
  MapPin,
  Phone,
  Plane,
  Route,
  ShieldCheck,
  Star,
} from "lucide-react-native";
import { useTheme } from "@/theme";
import { borderRadius, fontSize, spacing } from "@/theme/tokens";
import { Badge, Button, Card, Skeleton } from "@/components/BaseComponents";
import { Screen } from "@/components/ScreenComponents";
import { useAuth } from "@/hooks/useAuth";
import { useBooking } from "@/hooks/useBooking";
import { PromoBanner } from "@/components/PromoBanner";
import { QuickActionRow } from "@/components/QuickActionRow";
import { NearbyDriverMapCard } from "@/components/NearbyMapCard";
import { RecommendedVehicleCarousel } from "@/components/RecommendedVehicleCarousel";
import { RecentTripsCarousel } from "@/components/RecentTripsCarousel";
import { NewsUpdatesList } from "@/components/NewsUpdatesList";
import { ActiveTripSheet } from "@/components/ActiveTripSheet";
import {
  DestinationPlace,
  DestinationSearchInput,
} from "@/components/DestinationSearchInput";
import { AppTourGuide } from "@/components/AppTourGuide";
import { LocationAccessFallback } from "@/components/LocationAccessFallback";
import { LazyMount } from "@/components/LazyMount";

import { HelpSupportRow } from "@/components/HelpSupportRow";
import { useVehicles } from "@/hooks/useVehicles";
import { apiClient } from "@/services/api";
import { buildOptimizedCloudinaryImageUrl } from "@/services/videoOptimizationService";
import {
  DeviceLocation,
  getCurrentDeviceLocation,
} from "@/services/deviceLocation";
import { BOOKING_STATUS, VISIBLE_ACTIVE_BOOKING_STATUSES } from "@/constants";

import { BlogPost, Vehicle } from "@/types";
import { DAIGO_LOGO_URL } from "@/constants/branding";

const BOOKING_SERVICES: Array<{
  key: string;
  label: string;
  description: string;
  icon: typeof Car;
  imageUrl: string;
}> = [
  {
    key: "airport",
    label: "SÂN BAY",
    description: "Đón tiễn đúng giờ",
    icon: Plane,
    imageUrl:
      "https://res.cloudinary.com/dzwjgfd7t/image/upload/q_auto,w_520,h_410,c_fill/v1782272561/booking_daigo/be1335b295fd6d50ef4c9b8a2b10a28d_gwkwhf.jpg",
  },
  {
    key: "intercity",
    label: "LIÊN TỈNH",
    description: "Đi xa an toàn",
    icon: Route,
    imageUrl:
      "https://res.cloudinary.com/dzwjgfd7t/image/upload/q_auto,w_520,h_410,c_fill/v1782272712/booking_daigo/774aa2e1e05ebfcd8c1b17c9dd3db99e_y9bcf9.jpg",
  },
  {
    key: "contract",
    label: "HỢP ĐỒNG",
    description: "Cưới hỏi, sự kiện",
    icon: FileText,
    imageUrl:
      "https://res.cloudinary.com/dzwjgfd7t/image/upload/q_auto,w_520,h_410,c_fill/v1782272802/booking_daigo/51491fc49a0ab53da6382355064f1bad_yyk1ch.jpg",
  },
  {
    key: "travel",
    label: "DU LỊCH",
    description: "Tour, nghỉ dưỡng",
    icon: Map,
    imageUrl:
      "https://res.cloudinary.com/dzwjgfd7t/image/upload/q_auto,w_520,h_410,c_fill/v1782272931/booking_daigo/58b3a0d6dbe2d167969c00c56831c62a_oousho.jpg",
  },
];

function DriverVehicleCard({ vehicle }: { vehicle: Vehicle }) {
  const { colors } = useTheme();
  const callDriver = () => {
    if (vehicle.driverPhone) {
      Linking.openURL(`tel:${vehicle.driverPhone}`);
    }
  };

  return (
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
      {!!vehicle.image && (
        <Image
          source={{ uri: buildOptimizedCloudinaryImageUrl(vehicle.image, { width: 720 }) }}
          style={{
            width: "100%",
            height: 176,
            borderRadius: borderRadius.lg,
            backgroundColor: colors.surfaceAlt,
            marginBottom: spacing.md,
          }}
        />
      )}
      {!!vehicle.imageUrls?.length && vehicle.imageUrls.length > 1 && (
        <View
          style={{
            flexDirection: "row",
            gap: spacing.sm,
            marginBottom: spacing.md,
          }}
        >
          {vehicle.imageUrls.slice(1, 5).map((url, index) => (
            <Image
              key={`${vehicle.id}-preview-${index}`}
              source={{ uri: buildOptimizedCloudinaryImageUrl(url, { width: 240 }) }}
              style={{
                flex: 1,
                height: 58,
                borderRadius: borderRadius.md,
                backgroundColor: colors.surfaceAlt,
              }}
            />
          ))}
        </View>
      )}

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          gap: spacing.md,
          marginBottom: spacing.md,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: "900" }}>
            {vehicle.name}
          </Text>
          <Text style={{ color: colors.textSecondary, marginTop: spacing.xs }}>
            {vehicle.licensePlate} - {vehicle.color} - {vehicle.seats} chỗ
          </Text>
        </View>
        <Badge
          label={vehicle.status}
          variant={vehicle.status === "Sẵn sàng" ? "success" : "warning"}
        />
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
          padding: spacing.md,
          borderRadius: borderRadius.lg,
          backgroundColor: colors.surfaceAlt,
          marginBottom: spacing.md,
        }}
      >
        <Image
          source={{ uri: vehicle.driverAvatar }}
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: colors.surface,
          }}
        />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: "900" }}>
            {vehicle.driverName ?? "Tài xế"}
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.xs,
              marginTop: spacing.xs,
            }}
          >
            <Star size={14} color={colors.warning} fill={colors.warning} />
            <Text
              style={{ color: colors.textSecondary, fontSize: fontSize.sm }}
            >
              Tài xế đã xác thực
            </Text>
          </View>
        </View>
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: spacing.md,
        }}
      >
        <Text
          style={{ color: colors.primary, fontSize: 18, fontWeight: "900" }}
        >
          {vehicle.pricePerKm.toLocaleString("vi-VN")}đ/km
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
          Thanh toán sau chuyến đi
        </Text>
      </View>

      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <Button
          label="Đặt xe"
          onPress={() => router.push("/(customer)/booking")}
          style={{ flex: 1 }}
          icon={<Car size={18} color="white" />}
        />
        <Button
          label="Gọi ngay"
          onPress={callDriver}
          disabled={!vehicle.driverPhone}
          variant="secondary"
          style={{ flex: 1 }}
          icon={<Phone size={18} color={colors.text} />}
        />
      </View>
    </View>
  );
}

function BookingServicesRail() {
  const { colors } = useTheme();

  const openServiceBooking = (service: (typeof BOOKING_SERVICES)[number]) => {
    router.push({
      pathname: "/(customer)/booking" as any,
      params: {
        serviceType: service.key,
        serviceLabel: service.label,
      },
    });
  };

  return (
    <View style={{ marginBottom: spacing.xl }}>
      <View
        style={{
          paddingHorizontal: spacing.md,
          marginBottom: spacing.md,
        }}
      >
        <Text
          style={{
            color: colors.text,
            fontSize: 18,
            fontWeight: "900",
          }}
        >
          Dịch vụ đặt xe
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: fontSize.sm,
            marginTop: spacing.xs,
          }}
        >
          Chọn nhanh loại chuyến phù hợp với nhu cầu của bạn
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          gap: spacing.sm,
          paddingHorizontal: spacing.md,
        }}
      >
        {BOOKING_SERVICES.map((service) => {
          const Icon = service.icon;

          return (
            <TouchableOpacity
              key={service.key}
              activeOpacity={0.84}
              accessibilityRole="button"
              accessibilityLabel={`Đặt xe dịch vụ ${service.label}`}
              onPress={() => openServiceBooking(service)}
              style={{
                width: 208,
                height: 262,
                overflow: "hidden",
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: colors.border,
                borderRadius : borderRadius["xl"]
              }}
            >
              <ImageBackground
                source={{ uri: service.imageUrl }}
                resizeMode="cover"
                style={{
                  flex: 1,
                  justifyContent: "flex-end",
                }}
              >
                <View
                  style={{
                    ...StyleSheet.absoluteFillObject,
                    backgroundColor: "rgba(0,0,0,0.24)",
                  }}
                />
                <View
                  style={{
                    ...StyleSheet.absoluteFillObject,
                    backgroundColor: "rgba(0,0,0,0.18)",
                  }}
                />
                <View
                  style={{
                    padding: spacing.md,
                    paddingTop: spacing.lg,
                    // backgroundColor: "rgba(0,0,0,0.42)",
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: borderRadius.full,
                      backgroundColor: "rgba(255,255,255,0.2)",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: spacing.sm,
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.26)",
                    }}
                  >
                    <Icon size={20} color="white" />
                  </View>
                  <Text
                    numberOfLines={1}
                    style={{
                      color: "white",
                      fontWeight: "900",
                      fontSize: fontSize.sm,
                    }}
                  >
                    {service.label}
                  </Text>
                  <Text
                    numberOfLines={2}
                    style={{
                      color: "rgba(255,255,255,0.86)",
                      fontSize: fontSize.xs,
                      lineHeight: 17,
                      marginTop: spacing.xs,
                    }}
                  >
                    {service.description}
                  </Text>
                </View>
              </ImageBackground>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function HomeVehicleSkeleton() {
  return (
    <Card style={{ marginBottom: spacing.lg }}>
      <Skeleton
        height={176}
        borderRadius={borderRadius.lg}
        style={{ marginBottom: spacing.md }}
      />
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          gap: spacing.md,
          marginBottom: spacing.md,
        }}
      >
        <View style={{ flex: 1, gap: spacing.sm }}>
          <Skeleton width="58%" height={18} />
          <Skeleton width="82%" height={12} />
        </View>
        <Skeleton width={72} height={26} borderRadius={borderRadius.full} />
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
          padding: spacing.md,
          borderRadius: borderRadius.lg,
        }}
      >
        <Skeleton width={52} height={52} borderRadius={26} />
        <View style={{ flex: 1, gap: spacing.sm }}>
          <Skeleton width="42%" height={14} />
          <Skeleton width="62%" height={12} />
        </View>
      </View>
      <View
        style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }}
      >
        <Skeleton width="49%" height={44} borderRadius={borderRadius.lg} />
        <Skeleton width="49%" height={44} borderRadius={borderRadius.lg} />
      </View>
    </Card>
  );
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const pathname = usePathname();
  const { user } = useAuth();
  const { vehicles, fetchVehicles, isLoading } = useVehicles();
  const { bookings, fetchBookings } = useBooking();
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<DeviceLocation | null>(
    null,
  );
  const [locationAccessBlocked, setLocationAccessBlocked] = useState(false);
  const [destinationQuery, setDestinationQuery] = useState("");
  const [tourPromptVisible, setTourPromptVisible] = useState(false);
  const [tourVisible, setTourVisible] = useState(false);

  const loadHomeData = useCallback(() => {
    fetchVehicles();
    if (user?.id) {
      fetchBookings({ customerId: user.id });
    }
    apiClient
      .getBlogPosts(1, 6)
      .then(setBlogPosts)
      .catch(() => setBlogPosts([]));
    getCurrentDeviceLocation()
      .then((location) => {
        setCurrentLocation(location);
        setLocationAccessBlocked(false);
      })
      .catch(() => setLocationAccessBlocked(true));
  }, [fetchBookings, fetchVehicles, user?.id]);

  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

  useEffect(() => {
    const isCustomerHome = pathname.includes('/(customer)/home') || pathname.endsWith('/home');
    if (!user?.id || !isCustomerHome) {
      setTourPromptVisible(false);
      setTourVisible(false);
      return;
    }
    apiClient
      .getProfileSettings(user.id)
      .then((settings) => {
        if (!settings.hasSeenAppTour) setTourPromptVisible(true);
      })
      .catch(() => undefined);
  }, [pathname, user?.id]);

  const refreshHome = async () => {
    setRefreshing(true);
    try {
      await fetchVehicles();
      if (user?.id) await fetchBookings({ customerId: user.id });
      const posts = await apiClient.getBlogPosts(1, 6);
      setBlogPosts(posts);
      const location = await getCurrentDeviceLocation().catch(() => null);
      if (location) {
        setCurrentLocation(location);
        setLocationAccessBlocked(false);
      } else {
        setLocationAccessBlocked(true);
      }
    } finally {
      setRefreshing(false);
    }
  };

  const openBookingWithDestination = (destination: DestinationPlace) => {
    setDestinationQuery(destination.name || destination.address);
    router.push({
      pathname: "/(customer)/booking" as any,
      params: {
        destinationPlaceId: destination.placeId,
        destinationName: destination.name,
        destinationAddress: destination.address,
        destinationLat:
          destination.latitude !== undefined
            ? String(destination.latitude)
            : "",
        destinationLng:
          destination.longitude !== undefined
            ? String(destination.longitude)
            : "",
      },
    });
  };

  const openBookingWithDestinationText = (text: string) => {
    if (!text.trim()) return;
    router.push({
      pathname: "/(customer)/booking" as any,
      params: {
        destinationText: text.trim(),
      },
    });
  };

  const useManualLocation = (place: DestinationPlace) => {
    if (typeof place.latitude !== "number" || typeof place.longitude !== "number") {
      return;
    }
    setCurrentLocation({
      label: place.address || place.name,
      lat: place.latitude,
      lng: place.longitude,
    });
    setLocationAccessBlocked(false);
  };

  const retryGpsLocation = async () => {
    const location = await getCurrentDeviceLocation().catch(() => null);
    if (location) {
      setCurrentLocation(location);
      setLocationAccessBlocked(false);
    } else {
      setLocationAccessBlocked(true);
    }
  };

  const markTourSeen = async () => {
    if (user?.id) {
      await apiClient
        .updateProfileSettings(user.id, { hasSeenAppTour: true })
        .catch(() => undefined);
    }
    setTourPromptVisible(false);
    setTourVisible(false);
  };

  const startTour = () => {
    setTourPromptVisible(false);
    setTourVisible(true);
  };

  const isLoggedIn = !!user?.id;

  const promotions = useMemo(() => {
    const postPromotions = blogPosts.slice(0, 3).map((post) => ({
      id: post.id,
      image:
        post.mediaUrls[0]?.startsWith("http") &&
        (post.mediaTypes?.[0] ?? "image") === "image"
          ? { uri: post.mediaUrls[0] }
          : undefined,
      mediaUrl: post.mediaUrls[0]?.startsWith("http")
        ? post.mediaUrls[0]
        : undefined,
      mediaType: post.mediaTypes?.[0] ?? "image",
      title: post.caption || "Cập nhật mới từ tài xế",
      description: `${post.driverName} - ${new Date(post.createdAt).toLocaleDateString("vi-VN")}`,
      cta: "Xem bài viết",
      onPress: () =>
        router.push({
          pathname: "/(customer)/blog-detail" as any,
          params: { id: post.id },
        }),
    }));

    if (postPromotions.length > 0) return postPromotions;

    return vehicles.slice(0, 3).map((vehicle) => ({
      id: vehicle.id,
      image: vehicle.image?.startsWith("http")
        ? { uri: vehicle.image }
        : undefined,
      title: vehicle.name,
      description: `${vehicle.pricePerKm.toLocaleString("vi-VN")}đ/km - ${vehicle.seats} chỗ`,
      cta: "Đặt xe",
      onPress: () => router.push("/(customer)/booking"),
    }));
  }, [blogPosts, vehicles]);

  const quickActions = [
    { label: "Đặt xe", icon: "Car", route: "/(customer)/booking" },
    ...(isLoggedIn
      ? [
          {
            label: "Lịch sử",
            icon: "CalendarClock",
            route: "/(customer)/profile",
          } as const,
        ]
      : []),
    { label: "Tin mới", icon: "Star", route: "/(customer)/blog" },
    {
      label: "Thông báo",
      icon: "ShieldCheck",
      route: "/(customer)/notifications",
    },
  ] as const;
  const availableVehicles = vehicles.filter(
    (vehicle) => vehicle.status === "Sẵn sàng",
  );
  const recommendedVehicles =
    availableVehicles.length > 0 ? availableVehicles : vehicles;
  const recentTrips = isLoggedIn ? bookings.slice(0, 6) : [];
  const activeTrip = isLoggedIn
    ? bookings.find((booking) =>
        VISIBLE_ACTIVE_BOOKING_STATUSES.includes(booking.status as any),
      )
    : null;
  const todayScheduledBooking = useMemo(() => {
    if (!isLoggedIn) return null;
    const now = new Date();
    return [...bookings]
      .filter((booking) => {
        if (!booking.scheduledStartAt) return false;
        if (
          ![
            BOOKING_STATUS.SCHEDULED_DRIVER_ACCEPTED,
            BOOKING_STATUS.SCHEDULED_UPCOMING,
          ].includes(booking.status as any)
        ) {
          return false;
        }
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
      )[0] ?? null;
  }, [bookings, isLoggedIn]);

  if (locationAccessBlocked && !currentLocation) {
    return (
      <LocationAccessFallback
        onSelectLocation={useManualLocation}
        onRetryGps={retryGpsLocation}
      />
    );
  }

  return (
    <Screen scroll refreshing={refreshing || isLoading} onRefresh={refreshHome}>
      <ActiveTripSheet
        booking={activeTrip}
        role="customer"
        onOpenDetail={(id) =>
          router.push({
            pathname: "/(customer)/booking-detail" as any,
            params: { id },
          })
        }
      />
      {!!todayScheduledBooking && (
        <TouchableOpacity
          activeOpacity={0.86}
          onPress={() =>
            router.push({
              pathname: "/(customer)/booking-detail" as any,
              params: { id: todayScheduledBooking.id },
            })
          }
          style={{
            backgroundColor: colors.warning + "18",
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: colors.warning,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.md,
            marginBottom: spacing.lg,
          }}
        >
          <CalendarClock size={26} color={colors.warning} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.warning, fontWeight: "900", fontSize: 14 }}>
              Bạn có chuyến đặt trước hôm nay!
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }} numberOfLines={2}>
              {new Date(todayScheduledBooking.scheduledStartAt!).toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              • Đón tại {todayScheduledBooking.pickupLocation?.split(",")[0] ?? "..."}
            </Text>
          </View>
          <Text style={{ color: colors.warning, fontWeight: "800", fontSize: 13 }}>
            Xem ›
          </Text>
        </TouchableOpacity>
      )}
      <Modal
        visible={tourPromptVisible}
        transparent
        animationType="fade"
        onRequestClose={markTourSeen}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            padding: spacing.lg,
            backgroundColor: "rgba(15,23,42,0.58)",
          }}
        >
          <Card>
            <Text
              style={{
                color: colors.text,
                fontSize: 20,
                fontWeight: "900",
                marginBottom: spacing.sm,
              }}
            >
              Bạn có muốn xem hướng dẫn nhanh cách sử dụng Daigo không?
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                lineHeight: 22,
                marginBottom: spacing.lg,
              }}
            >
              Mình sẽ giới thiệu nhanh các khu vực chính như nhập điểm đến, đặt
              xe, tin tức, thông báo và hồ sơ.
            </Text>
            <View style={{ gap: spacing.md }}>
              <Button label="Có, hướng dẫn tôi" onPress={startTour} />
              <Button label="Bỏ qua" onPress={markTourSeen} variant="outline" />
            </View>
          </Card>
        </View>
      </Modal>
      <AppTourGuide
        visible={tourVisible}
        onDone={markTourSeen}
        onSkip={markTourSeen}
      />

      {/* ─── GREETING + LOGO SECTION (Grab pattern) ─── */}
      <View style={{ marginBottom: spacing.xl, paddingHorizontal: spacing.md }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: spacing.sm,
            marginTop: spacing.sm,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>
              Xin chào 👋
            </Text>
            <Text
              style={{
                fontSize: 22,
                fontWeight: "900",
                color: colors.text,
                marginTop: spacing.xs,
              }}
            >
              {user?.fullName || "Khách hàng"}
            </Text>
          </View>
          {/* Daigo logo badge — right aligned */}
          <Image
            source={{
              uri: "https://res.cloudinary.com/dzwjgfd7t/image/upload/v1782178208/booking_daigo/logo_text_no_bg-removebg-preview_dsu4n1.png",
            }}
            style={{
              width: 120,
              height: 40,
              resizeMode: "contain",
            }}
          />
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.xs,
            marginTop: spacing.xs,
          }}
        >
          <LocateFixed size={15} color={colors.primary} />
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              color: colors.textSecondary,
              fontSize: fontSize.sm,
            }}
          >
            {currentLocation?.label ?? "Đang chờ quyền GPS để gợi ý điểm đón"}
          </Text>
        </View>
      </View>

      <DestinationSearchInput
        value={destinationQuery}
        onChangeText={setDestinationQuery}
        onSelectPlace={openBookingWithDestination}
        onSubmitText={openBookingWithDestinationText}
        currentLocation={currentLocation}
        containerStyle={{
          marginBottom: spacing.xl,
          paddingHorizontal: spacing.md,
        }}
      />

      <BookingServicesRail />

      <Card
        style={{ marginBottom: spacing.xl, backgroundColor: colors.primary, borderRadius: borderRadius.xs }}
      >
        <View
          style={{
            flexDirection: "row",
            gap: spacing.md,
            alignItems: "center",
            marginBottom: spacing.md,
          }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: borderRadius.full,
              backgroundColor: "rgba(255,255,255,0.18)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ShieldCheck size={24} color="white" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "white", fontSize: 20, fontWeight: "900" }}>
              Đặt xe với tài xế thật
            </Text>
            <Text
              style={{
                color: "rgba(255,255,255,0.86)",
                marginTop: spacing.xs,
                lineHeight: 20,
              }}
            >
              Chọn xe đang sẵn sàng và gọi trực tiếp tài xế khi cần.
            </Text>
          </View>
        </View>
        <Button
          label="Tạo chuyến mới"
          onPress={() => router.push("/(customer)/booking")}
          variant="secondary"
          icon={<MapPin size={18} color={colors.text} />}
        />
      </Card>

      <Text
        style={{
          fontSize: 18,
          fontWeight: "900",
          color: colors.text,
          marginBottom: spacing.md,
          paddingHorizontal: spacing.md,
        }}
      >
        Xe và tài xế khả dụng
      </Text>

      {isLoading ? (
        <>
          <HomeVehicleSkeleton />
          <HomeVehicleSkeleton />
        </>
      ) : (
        availableVehicles.map((vehicle) => (
          <DriverVehicleCard key={vehicle.id} vehicle={vehicle} />
        ))
      )}

      {!isLoading && availableVehicles.length === 0 && (
        <Card style={{ marginBottom: spacing.lg }}>
          <Text
            style={{
              color: colors.text,
              fontWeight: "800",
              marginBottom: spacing.xs,
            }}
          >
            Chưa có xe sẵn sàng
          </Text>
          <Text style={{ color: colors.textSecondary }}>
            Khi tài xế thêm xe hoặc bật trạng thái sẵn sàng, xe sẽ hiển thị tại
            đây.
          </Text>
        </Card>
      )}

      <View style={{ marginBottom: spacing.xl, marginTop: spacing.xl }}>
        <Text
          style={{
            fontSize: 18,
            fontWeight: "900",
            color: colors.text,
            marginBottom: spacing.md,
            paddingHorizontal: spacing.md,
          }}
        >
          Hành động nhanh
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/(customer)/booking")}
          style={{
            padding: spacing.lg,
            backgroundColor: colors.surface,
            borderRadius: borderRadius.lg,
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.md,
            marginBottom: spacing.md,
          }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: colors.primary,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <MapPin size={24} color="white" />
          </View>
          <View>
            <Text
              style={{ fontWeight: "800", color: colors.text, marginBottom: 4 }}
            >
              Đặt chuyến đi
            </Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
              Chọn điểm đón, điểm đến và xe
            </Text>
          </View>
        </TouchableOpacity>

        {isLoggedIn && (
          <TouchableOpacity
            onPress={() => router.push("/(customer)/profile")}
            style={{
              padding: spacing.lg,
              backgroundColor: colors.surface,
              borderRadius: borderRadius.lg,
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.md,
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: colors.info,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <CalendarClock size={24} color="white" />
            </View>
            <View>
              <Text
                style={{
                  fontWeight: "800",
                  color: colors.text,
                  marginBottom: 4,
                }}
              >
                Lịch sử chuyến đi
              </Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                Xem lại các chuyến đã đặt
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
      {/* New premium sections */}
      {promotions.length > 0 && (
        <LazyMount minHeight={240} label="Đang chuẩn bị ưu đãi..." style={{ marginHorizontal: spacing.md, marginBottom: spacing.xl }}>
          <PromoBanner promotions={promotions} />
        </LazyMount>
      )}

      <LazyMount minHeight={280} label="Đang tải bản đồ tài xế gần bạn..." style={{ marginHorizontal: spacing.md, marginBottom: spacing.xl }}>
        <NearbyDriverMapCard
          vehicles={recommendedVehicles}
          currentLocation={currentLocation}
          onPress={(vehicle) =>
            router.push({
              pathname: "/(customer)/booking" as any,
              params: vehicle?.id ? { suggestedVehicleId: vehicle.id } : undefined,
            })
          }
        />
      </LazyMount>

      <LazyMount minHeight={180} label="Đang chuẩn bị gợi ý xe..." style={{ marginHorizontal: spacing.md, marginBottom: spacing.xl }}>
        <RecommendedVehicleCarousel
          vehicles={recommendedVehicles}
          onVehiclePress={() => router.push("/(customer)/booking")}
        />
      </LazyMount>

      {isLoggedIn && (
        <LazyMount minHeight={220} label="Đang tải lịch sử chuyến đi..." style={{ marginHorizontal: spacing.md, marginBottom: spacing.xl }}>
          <RecentTripsCarousel
            trips={recentTrips}
            onTripPress={(booking) =>
              router.push({
                pathname: "/(customer)/booking-detail" as any,
                params: { id: booking.id },
              })
            }
          />
        </LazyMount>
      )}

      <LazyMount minHeight={180} label="Đang tải tin tức..." style={{ marginHorizontal: spacing.md, marginBottom: spacing.xl }}>
        <NewsUpdatesList
          posts={blogPosts}
          onPostPress={(post) =>
            router.push({
              pathname: "/(customer)/blog-detail" as any,
              params: { id: post.id },
            })
          }
        />
      </LazyMount>
    </Screen>
  );
}
