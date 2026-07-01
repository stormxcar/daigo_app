import React, { FC } from "react";
import { View, Text, TouchableOpacity, Image, ViewStyle } from "react-native";
import { useTheme } from "@/theme";
import { fontForWeight, spacing, borderRadius } from '@/theme/tokens';
import { Card } from "./BaseComponents";
import {
  Star,
  MapPin,
  Clock,
  Users,
  Phone,
  MessageCircle,
} from "lucide-react-native";
import { getBookingStatusInfo } from "@/utils/helpers";
import { PaymentStatusBadge, getPaymentMethodLabel } from "@/components/PaymentStatusBadge";
import { BookingPaymentStatus, PaymentMethod } from "@/types";

interface VehicleCardProps {
  id: string;
  name: string;
  licensePlate: string;
  color: string;
  seats: number;
  pricePerKm: number;
  status: string;
  imageUri?: string;
  onPress?: () => void;
  style?: ViewStyle;
}

export const VehicleCard: FC<VehicleCardProps> = ({
  id: _id,
  name,
  licensePlate,
  color,
  seats,
  pricePerKm,
  status,
  imageUri,
  onPress,
  style,
}) => {
  const { colors } = useTheme();

  return (
    <Card onPress={onPress} pressable={!!onPress} style={style}>
      {imageUri && (
        <Image
          source={{ uri: imageUri }}
          style={{
            width: "100%",
            height: 200,
            borderRadius: borderRadius.md,
            marginBottom: spacing.md,
          }}
        />
      )}

      <Text
        style={{
          fontSize: 16,
          ...fontForWeight("700"),
          color: colors.text,
          marginBottom: spacing.sm,
        }}
      >
        {name}
      </Text>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: spacing.md,
        }}
      >
        <View>
          <Text style={{ fontSize: 12, color: colors.textSecondary, ...fontForWeight("400") }}>
            Biển số
          </Text>
          <Text style={{ fontSize: 14, ...fontForWeight("600"), color: colors.text }}>
            {licensePlate}
          </Text>
        </View>
        <View>
          <Text style={{ fontSize: 12, color: colors.textSecondary, ...fontForWeight("400") }}>
            Màu sắc
          </Text>
          <Text style={{ fontSize: 14, ...fontForWeight("600"), color: colors.text }}>
            {color}
          </Text>
        </View>
        <View>
          <Text style={{ fontSize: 12, color: colors.textSecondary, ...fontForWeight("400") }}>Ghế</Text>
          <Text style={{ fontSize: 14, ...fontForWeight("600"), color: colors.text }}>
            {seats} chỗ
          </Text>
        </View>
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text
          style={{ fontSize: 14, ...fontForWeight("600"), color: colors.primary }}
        >
          {pricePerKm.toLocaleString("vi-VN")} VND/km
        </Text>
        <View
          style={{
            paddingVertical: spacing.xs,
            paddingHorizontal: spacing.sm,
            borderRadius: borderRadius.full,
            backgroundColor:
              status === "Sẵn sàng"
                ? colors.success
                : status === "Đang bận"
                  ? colors.warning
                  : colors.error,
          }}
        >
          <Text style={{ fontSize: 12, ...fontForWeight("600"), color: "white" }}>
            {status}
          </Text>
        </View>
      </View>
    </Card>
  );
};

interface DriverCardProps {
  name: string;
  rating: number;
  experience: number;
  phone: string;
  avatarUri?: string;
  onCallPress?: () => void;
  onChatPress?: () => void;
}

export const DriverCard: FC<DriverCardProps> = ({
  name,
  rating,
  experience,
  phone,
  avatarUri,
  onCallPress,
  onChatPress,
}) => {
  const { colors } = useTheme();

  return (
    <Card style={{ marginVertical: spacing.md }}>
      <View style={{ flexDirection: "row", marginBottom: spacing.md }}>
        {avatarUri && (
          <Image
            source={{ uri: avatarUri }}
            style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              marginRight: spacing.md,
            }}
          />
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, ...fontForWeight("700"), color: colors.text }}>
            {name}
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginVertical: spacing.xs,
            }}
          >
            <Star size={16} color={colors.warning} fill={colors.warning} />
            <Text
              style={{
                marginLeft: spacing.xs,
                fontSize: 14,
                ...fontForWeight("600"),
                color: colors.text,
              }}
            >
              {rating}
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: colors.textSecondary, ...fontForWeight("400") }}>
            {experience} năm kinh nghiệm
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: colors.primary,
              ...fontForWeight("700"),
              marginTop: spacing.xs,
            }}
          >
            {phone}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <TouchableOpacity
          onPress={onCallPress}
          style={{
            flex: 1,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.md,
            borderRadius: borderRadius.md,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: spacing.sm,
          }}
        >
          <Phone size={18} color="white" />
          <Text style={{ color: "white", ...fontForWeight("600")}}>Gọi</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onChatPress}
          style={{
            flex: 1,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.md,
            borderRadius: borderRadius.md,
            backgroundColor: colors.surfaceAlt,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: spacing.sm,
          }}
        >
          <MessageCircle size={18} color={colors.text} />
          <Text style={{ color: colors.text, ...fontForWeight("600")}}>Chat</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
};

interface BookingCardProps {
  id: string;
  bookingCode?: string;
  pickupLocation: string;
  dropoffLocation: string;
  date: string;
  time: string;
  passengers: number;
  estimatedPrice: number;
  paymentStatus?: BookingPaymentStatus;
  paymentMethod?: PaymentMethod;
  status: string;
  onPress?: () => void;
}

export const BookingCard: FC<BookingCardProps> = ({
  id: _id,
  bookingCode,
  pickupLocation,
  dropoffLocation,
  date: _date,
  time,
  passengers,
  estimatedPrice,
  paymentStatus,
  paymentMethod,
  status,
  onPress,
}) => {
  const { colors } = useTheme();
  const statusInfo = getBookingStatusInfo(status);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.82 : 1}
      disabled={!onPress}
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
          marginBottom: spacing.md,
        }}
      >
        <Text style={{ fontSize: 14, ...fontForWeight("700"), color: colors.text }}>
          {bookingCode ?? "Chuyến đi"}
        </Text>
        <View style={{ alignItems: "flex-end", gap: spacing.xs }}>
          <View
            style={{
              paddingVertical: spacing.xs,
              paddingHorizontal: spacing.sm,
              borderRadius: borderRadius.full,
              backgroundColor: statusInfo.color,
            }}
          >
            <Text style={{ fontSize: 11, ...fontForWeight("600"), color: "white" }}>
              {statusInfo.label}
            </Text>
          </View>
          <PaymentStatusBadge status={paymentStatus} />
        </View>
      </View>

      <View style={{ marginBottom: spacing.md }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: spacing.sm,
          }}
        >
          <MapPin size={16} color={colors.primary} />
          <Text
            style={{
              marginLeft: spacing.sm,
              fontSize: 13,
              ...fontForWeight("400"),
              color: colors.text,
              flex: 1,
            }}
          >
            {pickupLocation}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <MapPin size={16} color={colors.error} />
          <Text
            style={{
              marginLeft: spacing.sm,
              fontSize: 13,
              ...fontForWeight("400"),
              color: colors.text,
              flex: 1,
            }}
          >
            {dropoffLocation}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Clock size={14} color={colors.textSecondary} />
          <Text
            style={{
              marginLeft: spacing.xs,
              fontSize: 12,
              ...fontForWeight("400"),
              color: colors.textSecondary,
            }}
          >
            {time}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Users size={14} color={colors.textSecondary} />
          <Text
            style={{
              marginLeft: spacing.xs,
              fontSize: 12,
              ...fontForWeight("400"),
              color: colors.textSecondary,
            }}
          >
            {passengers} hành khách
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text
            style={{
              marginLeft: spacing.xs,
              fontSize: 12,
              ...fontForWeight("600"),
              color: colors.primary,
            }}
          >
            {estimatedPrice.toLocaleString("vi-VN")} đ
          </Text>
        </View>
      </View>
      <Text style={{ color: colors.textTertiary, fontSize: 11, marginTop: spacing.sm, ...fontForWeight("700")}}>
        Thanh toán: {getPaymentMethodLabel(paymentMethod)}
      </Text>
    </TouchableOpacity>
  );
};

interface NotificationCardProps {
  id: string;
  title: string;
  content: string;
  time: string;
  read: boolean;
  onPress?: () => void;
}

export const NotificationCard: FC<NotificationCardProps> = ({
  id: _id,
  title,
  content,
  time,
  read,
  onPress,
}) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: read ? colors.background : colors.surface,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: spacing.sm,
        }}
      >
        <Text
          style={{
            fontSize: 14,
            ...fontForWeight("700"),
            color: colors.text,
            flex: 1,
          }}
        >
          {title}
        </Text>
        {!read && (
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: colors.primary,
              marginLeft: spacing.sm,
            }}
          />
        )}
      </View>
      <Text
        style={{
          fontSize: 13,
          color: colors.textSecondary,
          marginBottom: spacing.xs,
        }}
      >
        {content}
      </Text>
      <Text style={{ fontSize: 11, color: colors.textTertiary }}>{time}</Text>
    </TouchableOpacity>
  );
};
