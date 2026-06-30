import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Image, Text, TouchableOpacity, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { Camera, Car, MoreVertical, Plus, X } from "lucide-react-native";
import { useTheme } from "@/theme";
import { borderRadius, fontSize, spacing } from "@/theme/tokens";
import {
  Badge,
  Button,
  Card,
  CardSkeleton,
  TextInput,
} from "@/components/BaseComponents";
import { EmptyState, Screen } from "@/components/ScreenComponents";
import { SearchFilterBar } from "@/components/SearchFilterBar";
import { SubmitOverlay } from "@/components/SubmitOverlay";
import { useSubmitLeaveGuard } from "@/hooks/useSubmitLeaveGuard";
import { apiClient } from "@/services/api";
import { uploadMediaToCloudinary } from "@/services/cloudinary";
import { useAuthStore } from "@/stores/authStore";
import { Vehicle, VehicleStatus } from "@/types";
import { showError, showSuccess, showWarning } from "@/utils/toast";

const VEHICLE_FILTERS = [
  { key: "all", label: "Tất cả" },
  { key: "Sẵn sàng", label: "🟢 Sẵn sàng" },
  { key: "Đang bận", label: "🔵 Đang bận" },
  { key: "Bảo trì", label: "🟡 Bảo trì" },
];

const VEHICLE_SORTS = [
  { key: "newest", label: "Mới nhất" },
  { key: "priceLow", label: "Giá thấp → cao" },
  { key: "priceHigh", label: "Giá cao → thấp" },
  { key: "seatsAsc", label: "Ít ghế trước" },
  { key: "seatsDesc", label: "Nhiều ghế trước" },
  { key: "name", label: "Tên A-Z" },
];

const blankForm = {
  name: "",
  brand: "",
  licensePlate: "",
  color: "",
  seats: "4",
  pricePerKm: "15000",
  status: "Sẵn sàng" as VehicleStatus,
  image: "",
  imageUrls: [] as string[],
  description: "",
};

const statuses: VehicleStatus[] = ["Sẵn sàng", "Đang bận", "Bảo trì"];
const MAX_VEHICLE_IMAGES = 8;
const MAX_VEHICLE_IMAGE_BYTES = 5 * 1024 * 1024;
const VEHICLE_NAME_MAX_LENGTH = 60;
const VEHICLE_DESCRIPTION_MAX_LENGTH = 500;
const LICENSE_PLATE_PATTERN = /^[0-9]{2}[A-Z][A-Z0-9]?-?[0-9]{4,5}$/i;

type VehicleFormErrors = Partial<Record<keyof typeof blankForm, string>>;

export default function DriverVehicles() {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [visibleCount, setVisibleCount] = useState(8);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeSort, setActiveSort] = useState("newest");
  const [formErrors, setFormErrors] = useState<VehicleFormErrors>({});

  useSubmitLeaveGuard(
    saving,
    "Daigo đang lưu xe hoặc upload ảnh xe. Thoát lúc này có thể khiến dữ liệu xe chưa được cập nhật đầy đủ.",
  );

  const loadVehicles = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await apiClient.getDriverVehicles(user.id);
      setVehicles(data);
    } catch (error: any) {
      showError("Không thể tải xe", error.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  const filteredVehicles = useMemo(() => {
    let result = [...vehicles];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (v) =>
          v.name?.toLowerCase().includes(q) ||
          v.brand?.toLowerCase().includes(q) ||
          v.licensePlate?.toLowerCase().includes(q) ||
          v.color?.toLowerCase().includes(q),
      );
    }
    if (activeFilter !== "all")
      result = result.filter((v) => v.status === activeFilter);
    if (activeSort === "priceLow")
      result.sort((a, b) => a.pricePerKm - b.pricePerKm);
    if (activeSort === "priceHigh")
      result.sort((a, b) => b.pricePerKm - a.pricePerKm);
    if (activeSort === "seatsAsc") result.sort((a, b) => a.seats - b.seats);
    if (activeSort === "seatsDesc") result.sort((a, b) => b.seats - a.seats);
    if (activeSort === "name")
      result.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
    return result;
  }, [vehicles, search, activeFilter, activeSort]);

  const resetForm = () => {
    setForm(blankForm);
    setFormErrors({});
    setEditingId(null);
    setShowForm(false);
  };

  const openCreateForm = () => {
    setForm(blankForm);
    setEditingId(null);
    setShowForm(true);
  };

  const toggleForm = () => {
    if (showForm) {
      resetForm();
      return;
    }
    openCreateForm();
  };

  const editVehicle = (vehicle: Vehicle) => {
    setEditingId(vehicle.id);
    setForm({
      name: vehicle.name,
      brand: vehicle.brand,
      licensePlate: vehicle.licensePlate,
      color: vehicle.color,
      seats: String(vehicle.seats),
      pricePerKm: String(vehicle.pricePerKm),
      status: vehicle.status,
      image: vehicle.image,
      imageUrls: vehicle.imageUrls?.length ? vehicle.imageUrls : vehicle.image ? [vehicle.image] : [],
      description: vehicle.description ?? "",
    });
    setFormErrors({});
    setShowForm(true);
  };

  const pickImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showWarning(
        "Cần quyền truy cập ảnh",
        "Vui lòng cho phép ứng dụng chọn ảnh xe.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 8,
      quality: 0.82,
    });

    if (result.canceled || result.assets.length === 0) return;
    if (form.imageUrls.length + result.assets.length > MAX_VEHICLE_IMAGES) {
      showWarning("Quá số lượng ảnh", `Mỗi xe chỉ nên có tối đa ${MAX_VEHICLE_IMAGES} ảnh.`);
      return;
    }

    const oversizedAsset = result.assets.find((asset) => (asset.fileSize ?? 0) > MAX_VEHICLE_IMAGE_BYTES);
    if (oversizedAsset) {
      showWarning("Ảnh quá lớn", "Vui lòng chọn ảnh dưới 5MB để app tải nhanh và ổn định hơn.");
      return;
    }

    try {
      setSaving(true);
      const uploadedUrls: string[] = [];
      for (const [index, asset] of result.assets.entries()) {
        const uploaded = await uploadMediaToCloudinary(
          {
            uri: asset.uri,
            name: asset.fileName ?? `vehicle-${Date.now()}-${index}.jpg`,
            type: asset.mimeType ?? "image/jpeg",
          },
          "image",
        );
        uploadedUrls.push(uploaded.secure_url);
      }
      setForm((current) => {
        const nextUrls = [...current.imageUrls, ...uploadedUrls].slice(0, 8);
        return { ...current, imageUrls: nextUrls, image: nextUrls[0] ?? current.image };
      });
      showSuccess("Đã upload ảnh xe", `${uploadedUrls.length} ảnh đã sẵn sàng để lưu.`);
    } catch (error: any) {
      showError("Không thể upload ảnh", error.message);
    } finally {
      setSaving(false);
    }
  };

  const removeVehicleImage = (url: string) => {
    setForm((current) => {
      const nextUrls = current.imageUrls.filter((item) => item !== url);
      return { ...current, imageUrls: nextUrls, image: nextUrls[0] ?? "" };
    });
  };

  const validate = () => {
    const errors: VehicleFormErrors = {};
    const name = form.name.trim();
    const brand = form.brand.trim();
    const licensePlate = form.licensePlate.trim().toUpperCase();
    const seats = Number(form.seats);
    const pricePerKm = Number(form.pricePerKm);
    const duplicatePlate = vehicles.some(
      (vehicle) =>
        vehicle.id !== editingId &&
        vehicle.licensePlate.trim().toUpperCase() === licensePlate,
    );

    if (name.length < 2) errors.name = "Tên xe phải có ít nhất 2 ký tự.";
    else if (name.length > VEHICLE_NAME_MAX_LENGTH) errors.name = `Tên xe tối đa ${VEHICLE_NAME_MAX_LENGTH} ký tự.`;
    if (brand.length < 2) errors.brand = "Hãng xe phải có ít nhất 2 ký tự.";
    if (!licensePlate) errors.licensePlate = "Vui lòng nhập biển số xe.";
    else if (!LICENSE_PLATE_PATTERN.test(licensePlate)) errors.licensePlate = "Biển số chưa đúng định dạng phổ biến, ví dụ 30A-12345.";
    else if (duplicatePlate) errors.licensePlate = "Biển số này đã tồn tại trong danh sách xe của bạn.";
    if (form.color.trim().length > 30) errors.color = "Màu xe tối đa 30 ký tự.";
    if (!Number.isInteger(seats) || seats < 2 || seats > 45) errors.seats = "Số ghế phải từ 2 đến 45.";
    if (!Number.isFinite(pricePerKm) || pricePerKm < 5000 || pricePerKm > 100000)
      errors.pricePerKm = "Giá/km nên nằm trong khoảng 5.000đ đến 100.000đ.";
    if (form.imageUrls.length > MAX_VEHICLE_IMAGES) errors.imageUrls = `Tối đa ${MAX_VEHICLE_IMAGES} ảnh cho mỗi xe.`;
    if (form.description.trim().length > VEHICLE_DESCRIPTION_MAX_LENGTH)
      errors.description = `Mô tả tối đa ${VEHICLE_DESCRIPTION_MAX_LENGTH} ký tự.`;

    setFormErrors(errors);
    return errors;
  };

  const saveVehicle = async () => {
    if (!user) return;
    const errors = validate();
    const firstError = Object.values(errors).find(Boolean);
    if (firstError) {
      showError("Thông tin chưa hợp lệ", firstError);
      return;
    }

    try {
      setSaving(true);
      const payload = {
        driverId: user.id,
        name: form.name.trim(),
        brand: form.brand.trim(),
        licensePlate: form.licensePlate.trim().toUpperCase(),
        color: form.color.trim(),
        seats: Number(form.seats),
        pricePerKm: Number(form.pricePerKm),
        status: form.status,
        image: form.image,
        imageUrls: form.imageUrls,
        description: form.description.trim(),
      };

      if (editingId) {
        await apiClient.updateVehicle(editingId, payload);
      } else {
        await apiClient.createVehicle(payload);
      }

      await loadVehicles();
      resetForm();
      showSuccess("Đã lưu xe", "Thông tin xe đã được cập nhật.");
    } catch (saveError: any) {
      showError("Không thể lưu xe", saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteVehicle = (vehicle: Vehicle) => {
    Alert.alert("Xóa xe", `Bạn muốn xóa ${vehicle.name}?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            setSaving(true);
            await apiClient.deleteVehicle(vehicle.id, user?.id);
            await loadVehicles();
            showSuccess(
              "Đã xóa xe",
              `${vehicle.name} đã được xóa khỏi danh sách.`,
            );
          } catch (error: any) {
            showError("Không thể xóa xe", error.message);
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  const openVehicleActions = (vehicle: Vehicle) => {
    Alert.alert("Tùy chọn xe", vehicle.name, [
      { text: "Sửa thông tin", onPress: () => editVehicle(vehicle) },
      { text: "Xóa xe", style: "destructive", onPress: () => deleteVehicle(vehicle) },
      { text: "Đóng", style: "cancel" },
    ]);
  };

  return (
    <Screen scroll refreshing={loading} onRefresh={loadVehicles}>
      <SubmitOverlay
        visible={saving}
        message="Đang xử lý xe..."
        description="Daigo đang upload ảnh hoặc lưu thông tin xe vào hệ thống."
      />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: spacing.lg,
          paddingHorizontal: spacing.md,
          paddingTop: spacing.md
        }}
      >
        <View>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: "800" }}>
            Xe của tôi
          </Text>
          <Text style={{ color: colors.textSecondary, marginTop: spacing.xs }}>
            {vehicles.length} xe đang liên kết với tài khoản
          </Text>
        </View>
        <TouchableOpacity
          onPress={toggleForm}
          disabled={saving}
          style={{
            width: 44,
            height: 44,
            borderRadius: borderRadius.full,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.primary,
          }}
        >
          {showForm ? (
            <X size={22} color="white" />
          ) : (
            <Plus size={22} color="white" />
          )}
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
        <SearchFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          placeholder="Tìm tên xe, hãng, biển số, màu..."
          filters={VEHICLE_FILTERS}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          sortOptions={VEHICLE_SORTS}
          activeSort={activeSort}
          onSortChange={(key) => setActiveSort(key || "newest")}
          resultCount={loading ? undefined : filteredVehicles.length}
          resultLabel="xe"
        />
      </View>
      {showForm && (
        <Card style={{ marginBottom: spacing.lg }}>
          <Text
            style={{
              color: colors.text,
              fontSize: 18,
              fontWeight: "800",
              marginBottom: spacing.md,
            }}
          >
            {editingId ? "Cập nhật xe" : "Thêm xe mới"}
          </Text>

          <TouchableOpacity
            onPress={pickImages}
            disabled={saving}
            activeOpacity={0.82}
            style={{
              height: 172,
              borderRadius: borderRadius.lg,
              backgroundColor: colors.surfaceAlt,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: spacing.md,
              overflow: "hidden",
            }}
          >
            {form.image ? (
              <Image
                source={{ uri: form.image }}
                style={{ width: "100%", height: "100%" }}
              />
            ) : (
              <View style={{ alignItems: "center", gap: spacing.sm }}>
                <Camera size={28} color={colors.primary} />
                <Text
                  style={{ color: colors.textSecondary, fontWeight: "600" }}
                >
                  Upload ảnh xe
                </Text>
                <Text style={{ color: colors.textTertiary, fontSize: fontSize.xs }}>
                  Có thể chọn nhiều ảnh cùng lúc
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {form.imageUrls.length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md }}>
              {form.imageUrls.map((url, index) => (
                <View key={`${url}-${index}`} style={{ width: 74, height: 74, borderRadius: borderRadius.md, overflow: "hidden", backgroundColor: colors.surfaceAlt }}>
                  <Image source={{ uri: url }} style={{ width: "100%", height: "100%" }} />
                  <TouchableOpacity
                    onPress={() => removeVehicleImage(url)}
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: "rgba(0,0,0,0.55)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <X size={13} color="white" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <TextInput
            label="Tên xe"
            value={form.name}
            onChangeText={(name) =>
              {
                setForm((current) => ({ ...current, name }));
                setFormErrors((current) => ({ ...current, name: undefined }));
              }
            }
            error={formErrors.name}
            disabled={saving}
            style={{ marginBottom: spacing.md }}
          />
          <TextInput
            label="Hãng xe"
            value={form.brand}
            onChangeText={(brand) =>
              {
                setForm((current) => ({ ...current, brand }));
                setFormErrors((current) => ({ ...current, brand: undefined }));
              }
            }
            error={formErrors.brand}
            disabled={saving}
            style={{ marginBottom: spacing.md }}
          />
          <TextInput
            label="Biển số"
            value={form.licensePlate}
            onChangeText={(licensePlate) =>
              {
                setForm((current) => ({ ...current, licensePlate: licensePlate.toUpperCase() }));
                setFormErrors((current) => ({ ...current, licensePlate: undefined }));
              }
            }
            autoCapitalize="characters"
            error={formErrors.licensePlate}
            disabled={saving}
            style={{ marginBottom: spacing.md }}
          />
          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <TextInput
              label="Màu xe"
              value={form.color}
              onChangeText={(color) =>
                {
                  setForm((current) => ({ ...current, color }));
                  setFormErrors((current) => ({ ...current, color: undefined }));
                }
              }
              error={formErrors.color}
              disabled={saving}
              style={{ flex: 1, marginBottom: spacing.md }}
            />
            <TextInput
              label="Số ghế"
              value={form.seats}
              onChangeText={(seats) =>
                {
                  setForm((current) => ({ ...current, seats: seats.replace(/\D/g, "") }));
                  setFormErrors((current) => ({ ...current, seats: undefined }));
                }
              }
              error={formErrors.seats}
              keyboardType="numeric"
              disabled={saving}
              style={{ width: 96, marginBottom: spacing.md }}
            />
          </View>
          <TextInput
            label="Giá/km"
            value={form.pricePerKm}
            onChangeText={(pricePerKm) =>
              {
                setForm((current) => ({ ...current, pricePerKm: pricePerKm.replace(/\D/g, "") }));
                setFormErrors((current) => ({ ...current, pricePerKm: undefined }));
              }
            }
            error={formErrors.pricePerKm}
            keyboardType="numeric"
            disabled={saving}
            style={{ marginBottom: spacing.md }}
          />

          <Text
            style={{
              color: colors.text,
              fontWeight: "700",
              marginBottom: spacing.sm,
            }}
          >
            Trạng thái
          </Text>
          <View
            style={{
              flexDirection: "row",
              gap: spacing.sm,
              marginBottom: spacing.md,
            }}
          >
            {statuses.map((status) => (
              <TouchableOpacity
                key={status}
                onPress={() => setForm((current) => ({ ...current, status }))}
                disabled={saving}
                style={{
                  flex: 1,
                  paddingVertical: spacing.sm,
                  borderRadius: borderRadius.md,
                  alignItems: "center",
                  backgroundColor:
                    form.status === status ? colors.primary : colors.surfaceAlt,
                }}
              >
                <Text
                  style={{
                    color: form.status === status ? "white" : colors.text,
                    fontSize: fontSize.xs,
                    fontWeight: "700",
                  }}
                >
                  {status}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            label="Mô tả"
            value={form.description}
            onChangeText={(description) =>
              {
                setForm((current) => ({ ...current, description }));
                setFormErrors((current) => ({ ...current, description: undefined }));
              }
            }
            error={formErrors.description}
            multiline
            numberOfLines={3}
            disabled={saving}
            style={{ marginBottom: spacing.md }}
          />
          <Button
            label={editingId ? "Lưu thay đổi" : "Thêm xe"}
            onPress={saveVehicle}
            loading={saving}
            disabled={saving}
          />
        </Card>
      )}

      {loading ? (
        <>
          <CardSkeleton image style={{ marginBottom: spacing.lg }} />
          <CardSkeleton image style={{ marginBottom: spacing.lg }} />
        </>
      ) : (
        filteredVehicles.slice(0, visibleCount).map((vehicle) => (
          <TouchableOpacity
            key={vehicle.id}
            activeOpacity={0.86}
            onPress={() => router.push({ pathname: "/(driver)/vehicle-detail" as any, params: { id: vehicle.id } })}
            style={{
              backgroundColor: colors.surface,
              borderTopWidth: 1,
              borderBottomWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
              position: "relative",
            }}
          >
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => openVehicleActions(vehicle)}
              disabled={saving}
              style={{
                position: "absolute",
                top: spacing.md,
                right: spacing.lg,
                zIndex: 3,
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <MoreVertical size={18} color={colors.text} />
            </TouchableOpacity>
            {!!vehicle.image && (
              <Image
                source={{ uri: vehicle.image }}
                style={{
                  width: "100%",
                  height: 168,
                  borderRadius: borderRadius.lg,
                  marginBottom: spacing.md,
                  backgroundColor: colors.surfaceAlt,
                }}
              />
            )}
            {!!vehicle.imageUrls?.length && vehicle.imageUrls.length > 1 && (
              <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md }}>
                {vehicle.imageUrls.slice(1, 5).map((url, index) => (
                  <Image
                    key={`${vehicle.id}-gallery-${index}`}
                    source={{ uri: url }}
                    style={{ flex: 1, height: 58, borderRadius: borderRadius.md, backgroundColor: colors.surfaceAlt }}
                  />
                ))}
              </View>
            )}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                gap: spacing.md,
                paddingRight: spacing.xl,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 18,
                    fontWeight: "800",
                  }}
                >
                  {vehicle.name}
                </Text>
                <Text
                  style={{ color: colors.textSecondary, marginTop: spacing.xs }}
                >
                  {vehicle.brand} - {vehicle.licensePlate}
                </Text>
              </View>
              <Badge
                label={vehicle.status}
                variant={
                  vehicle.status === "Sẵn sàng"
                    ? "success"
                    : vehicle.status === "Bảo trì"
                      ? "warning"
                      : "info"
                }
              />
            </View>
            <View
              style={{
                flexDirection: "row",
                gap: spacing.md,
                marginTop: spacing.md,
              }}
            >
              <Text style={{ color: colors.textSecondary, flex: 1 }}>
                {vehicle.color || "Chưa có màu"}
              </Text>
              <Text style={{ color: colors.textSecondary }}>
                {vehicle.seats} ghế
              </Text>
              <Text style={{ color: colors.text, fontWeight: "800" }}>
                {vehicle.pricePerKm.toLocaleString("vi-VN")}đ/km
              </Text>
            </View>
            {!!vehicle.description && (
              <Text
                style={{
                  color: colors.textSecondary,
                  lineHeight: 20,
                  marginTop: spacing.sm,
                }}
              >
                {vehicle.description}
              </Text>
            )}
          </TouchableOpacity>
        ))
      )}

      {!loading &&
        filteredVehicles.length === 0 &&
        (search || activeFilter !== "all" ? (
          <Text
            style={{
              color: colors.textSecondary,
              textAlign: "center",
              marginTop: spacing.xl,
            }}
          >
            Không tìm thấy xe phù hợp.
          </Text>
        ) : (
          <EmptyState
            icon={<Car size={48} color={colors.primary} />}
            title="Chưa có xe"
            description="Thêm xe của bạn để bắt đầu nhận chuyến đi"
          />
        ))}
      {!loading && filteredVehicles.length > visibleCount && (
        <Button
          label="Tải thêm xe"
          onPress={() => setVisibleCount((current) => current + 8)}
          variant="outline"
        />
      )}
    </Screen>
  );
}
