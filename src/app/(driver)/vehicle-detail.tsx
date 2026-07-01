import React, { useEffect, useMemo, useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  BadgeCheck,
  CalendarClock,
  Car,
  CircleDollarSign,
  CreditCard,
  Gauge,
  Palette,
  Phone,
  ShieldCheck,
  UserCircle,
  Users,
} from "lucide-react-native";
import { Badge, Button } from "@/components/BaseComponents";
import { EmptyState, Screen } from "@/components/ScreenComponents";
import { PRICE_CONFIG } from "@/constants";
import { apiClient } from "@/services/api";
import { useTheme } from "@/theme";
import { fontForWeight, borderRadius, fontSize, spacing } from '@/theme/tokens';
import { Vehicle } from "@/types";
import { showError } from "@/utils/toast";
import { calculateBookingPrice, formatCurrency } from "@/utils/helpers";

function DetailSection({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
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
      {children}
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: borderRadius.full,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.surfaceAlt,
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }}>{label}</Text>
        <Text style={{ color: colors.text, ...fontForWeight("900"), marginTop: 3 }}>{value}</Text>
      </View>
    </View>
  );
}

function FeeRow({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}>
        <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, flex: 1 }}>{label}</Text>
        <Text style={{ color: colors.text, ...fontForWeight("900") }}>{value}</Text>
      </View>
      {!!note && (
        <Text style={{ color: colors.textTertiary, fontSize: fontSize.xs, marginTop: 3, lineHeight: 18 }}>
          {note}
        </Text>
      )}
    </View>
  );
}

export default function DriverVehicleDetail() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const gallery = useMemo(() => {
    if (!vehicle) return [];
    return Array.from(new Set([vehicle.image, ...(vehicle.imageUrls ?? [])].filter(Boolean)));
  }, [vehicle]);

  useEffect(() => {
    setSelectedImage((current) => (gallery.includes(current) ? current : gallery[0] || ""));
  }, [gallery]);

  useEffect(() => {
    if (!id) return;
    apiClient
      .getVehicleById(id)
      .then(setVehicle)
      .catch((error) => showError("Không thể tải chi tiết xe", error.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <Screen padding>
        <Text style={{ color: colors.textSecondary, textAlign: "center" }}>Đang tải chi tiết xe...</Text>
      </Screen>
    );
  }

  if (!vehicle) {
    return (
      <Screen padding>
        <EmptyState
          icon={<Car size={46} color={colors.primary} />}
          title="Không tìm thấy xe"
          description="Xe này có thể đã bị xóa hoặc bạn không còn quyền xem."
        />
      </Screen>
    );
  }

  const statusVariant =
    vehicle.status === "Sẵn sàng" ? "success" : vehicle.status === "Bảo trì" ? "warning" : "info";
  const normalQuote = calculateBookingPrice(10, vehicle.pricePerKm, 1, "10:00");
  const peakQuote = calculateBookingPrice(10, vehicle.pricePerKm, 1, "08:00");
  const nightQuote = calculateBookingPrice(10, vehicle.pricePerKm, 1, "23:00");

  return (
    <Screen scroll>
      <View style={{ backgroundColor: colors.surface }}>
        {selectedImage ? (
          <Image
            source={{ uri: selectedImage }}
            style={{ width: "100%", height: 260, backgroundColor: colors.surfaceAlt }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              height: 230,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.surfaceAlt,
            }}
          >
            <Car size={64} color={colors.primary} />
          </View>
        )}
        <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 24, ...fontForWeight("900")}}>{vehicle.name}</Text>
              <Text style={{ color: colors.textSecondary, marginTop: spacing.xs }}>
                {vehicle.brand} · {vehicle.licensePlate}
              </Text>
            </View>
            <Badge label={vehicle.status} variant={statusVariant} />
          </View>
        </View>
      </View>

      {gallery.length > 0 && (
        <DetailSection>
          <Text style={{ color: colors.text, fontSize: 18, ...fontForWeight("900"), marginBottom: spacing.md }}>
            Hình ảnh xe
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {gallery.slice(0, 8).map((url, index) => (
              <TouchableOpacity
                key={`${url}-${index}`}
                activeOpacity={0.84}
                onPress={() => setSelectedImage(url)}
                style={{
                  width: "31%",
                  aspectRatio: 1,
                  borderWidth: selectedImage === url ? 2 : 1,
                  borderColor: selectedImage === url ? colors.primary : colors.border,
                  overflow: "hidden",
                  backgroundColor: colors.surfaceAlt,
                }}
              >
                <Image
                  source={{ uri: url }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </View>
        </DetailSection>
      )}

      <DetailSection>
        <Text style={{ color: colors.text, fontSize: 18, ...fontForWeight("900"), marginBottom: spacing.sm }}>
          Tổng quan xe
        </Text>
        <InfoRow icon={<Car size={18} color={colors.primary} />} label="Tên xe" value={vehicle.name} />
        <InfoRow icon={<BadgeCheck size={18} color={colors.primary} />} label="Hãng xe" value={vehicle.brand || "Chưa có"} />
        <InfoRow icon={<CreditCard size={18} color={colors.primary} />} label="Biển số" value={vehicle.licensePlate || "Chưa có"} />
        <InfoRow icon={<Palette size={18} color={colors.primary} />} label="Màu xe" value={vehicle.color || "Chưa có"} />
        <InfoRow icon={<Users size={18} color={colors.primary} />} label="Số chỗ" value={`${vehicle.seats} chỗ`} />
        <InfoRow
          icon={<CircleDollarSign size={18} color={colors.success} />}
          label="Giá theo km"
          value={`${vehicle.pricePerKm.toLocaleString("vi-VN")}đ/km`}
        />
      </DetailSection>

      <DetailSection>
        <Text style={{ color: colors.text, fontSize: 18, ...fontForWeight("900"), marginBottom: spacing.sm }}>
          Tài xế phụ trách
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm }}>
          {vehicle.driverAvatar ? (
            <Image
              source={{ uri: vehicle.driverAvatar }}
              style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: colors.surfaceAlt }}
            />
          ) : (
            <View
              style={{
                width: 54,
                height: 54,
                borderRadius: 27,
                backgroundColor: colors.surfaceAlt,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <UserCircle size={30} color={colors.primary} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, ...fontForWeight("900"), fontSize: fontSize.base }}>
              {vehicle.driverName || "Tài xế"}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.xs }}>
              <Phone size={14} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary }}>{vehicle.driverPhone || "Chưa có số điện thoại"}</Text>
            </View>
          </View>
        </View>
      </DetailSection>

      <DetailSection>
        <Text style={{ color: colors.text, fontSize: 18, ...fontForWeight("900"), marginBottom: spacing.sm }}>
          Vận hành
        </Text>
        <InfoRow icon={<ShieldCheck size={18} color={colors.success} />} label="Trạng thái khai thác" value={vehicle.status} />
        <InfoRow icon={<Gauge size={18} color={colors.primary} />} label="Mức giá vận hành" value={`${vehicle.pricePerKm.toLocaleString("vi-VN")}đ/km`} />
        <InfoRow icon={<CalendarClock size={18} color={colors.primary} />} label="Ngày cập nhật" value={new Date(vehicle.updatedAt).toLocaleString("vi-VN")} />
      </DetailSection>

      <DetailSection>
        <Text style={{ color: colors.text, fontSize: 18, ...fontForWeight("900"), marginBottom: spacing.xs }}>
          Cách hệ thống tính giá chuyến
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 21, marginBottom: spacing.md }}>
          Tài xế thiết lập giá/km cho xe. Tổng tiền khách thấy sẽ cộng thêm các phí hệ thống theo thời điểm và chính sách nền tảng.
        </Text>

        <FeeRow
          label="Giá xe của bạn"
          value={`${vehicle.pricePerKm.toLocaleString("vi-VN")}đ/km`}
          note="Đây là phần tài xế có thể chỉnh trong form xe, trong giới hạn hệ thống cho phép."
        />
        <FeeRow
          label="Giá tối thiểu"
          value={formatCurrency(PRICE_CONFIG.MINIMUM_BOOKING_PRICE)}
          note="Nếu cước lộ trình thấp hơn mức tối thiểu, hệ thống dùng giá tối thiểu."
        />
        <FeeRow
          label="Phí nền tảng"
          value={`${PRICE_CONFIG.PLATFORM_FEE_PERCENT}%`}
          note="Phí vận hành nền tảng, realtime, thông báo, bản đồ và xử lý giao dịch."
        />
        <FeeRow
          label="Phụ phí cao điểm"
          value={`x${PRICE_CONFIG.SURGE_MULTIPLIER_PEAK}`}
          note="Áp dụng khung 07:00-09:00 và 17:00-20:00."
        />
        <FeeRow
          label="Phí đêm"
          value="12% cước xe"
          note="Áp dụng khung 22:00-05:00."
        />
        <FeeRow
          label="Phí chờ"
          value="Chưa phát sinh"
          note="Hiện hệ thống đang để 0đ; có thể bổ sung theo phút chờ trong phase sau."
        />

        <View style={{ marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Text style={{ color: colors.text, ...fontForWeight("900"), marginBottom: spacing.sm }}>
            Ví dụ 10km với xe này
          </Text>
          <FeeRow label="Giờ thường 10:00" value={formatCurrency(normalQuote.totalPrice)} />
          <FeeRow label="Cao điểm 08:00" value={formatCurrency(peakQuote.totalPrice)} />
          <FeeRow label="Ban đêm 23:00" value={formatCurrency(nightQuote.totalPrice)} />
        </View>
      </DetailSection>

      {!!vehicle.description && (
        <DetailSection>
          <Text style={{ color: colors.text, fontSize: 18, ...fontForWeight("900"), marginBottom: spacing.sm }}>
            Mô tả xe
          </Text>
          <Text style={{ color: colors.textSecondary, lineHeight: 22 }}>{vehicle.description}</Text>
        </DetailSection>
      )}

      <View style={{ padding: spacing.lg, gap: spacing.sm }}>
        <Button
          label="Quay lại danh sách xe"
          variant="outline"
          onPress={() => router.push("/(driver)/vehicles" as any)}
        />
      </View>
    </Screen>
  );
}
