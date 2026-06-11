import React, { useEffect, useState } from 'react';
import { Alert, Image, Text, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Car, Edit3, Plus, Trash2, X } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, spacing } from '@/theme/tokens';
import { Badge, Button, Card, CardSkeleton, TextInput } from '@/components/BaseComponents';
import { EmptyState, Screen } from '@/components/ScreenComponents';
import { apiClient } from '@/services/api';
import { uploadMediaToCloudinary } from '@/services/cloudinary';
import { useAuthStore } from '@/stores/authStore';
import { Vehicle, VehicleStatus } from '@/types';

const blankForm = {
  name: '',
  brand: '',
  licensePlate: '',
  color: '',
  seats: '4',
  pricePerKm: '15000',
  status: 'Sẵn sàng' as VehicleStatus,
  image: '',
  description: '',
};

const statuses: VehicleStatus[] = ['Sẵn sàng', 'Đang bận', 'Bảo trì'];

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

  const loadVehicles = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await apiClient.getDriverVehicles(user.id);
      setVehicles(data);
    } catch (error: any) {
      Alert.alert('Không thể tải xe', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, [user?.id]);

  const resetForm = () => {
    setForm(blankForm);
    setEditingId(null);
    setShowForm(false);
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
      description: vehicle.description ?? '',
    });
    setShowForm(true);
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Cần quyền truy cập ảnh', 'Vui lòng cho phép ứng dụng chọn ảnh xe.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.82,
    });

    if (result.canceled || !result.assets[0]) return;

    try {
      setSaving(true);
      const asset = result.assets[0];
      const uploaded = await uploadMediaToCloudinary({
        uri: asset.uri,
        name: asset.fileName ?? `vehicle-${Date.now()}.jpg`,
        type: asset.mimeType ?? 'image/jpeg',
      }, 'image');
      setForm((current) => ({ ...current, image: uploaded.secure_url }));
    } catch (error: any) {
      Alert.alert('Không thể upload ảnh', error.message);
    } finally {
      setSaving(false);
    }
  };

  const validate = () => {
    if (!form.name.trim()) return 'Vui lòng nhập tên xe.';
    if (!form.brand.trim()) return 'Vui lòng nhập hãng xe.';
    if (!form.licensePlate.trim()) return 'Vui lòng nhập biển số xe.';
    if (!Number(form.seats) || Number(form.seats) < 1) return 'Số ghế không hợp lệ.';
    if (!Number(form.pricePerKm) || Number(form.pricePerKm) < 0) return 'Giá theo km không hợp lệ.';
    return '';
  };

  const saveVehicle = async () => {
    if (!user) return;
    const error = validate();
    if (error) {
      Alert.alert('Thông tin chưa hợp lệ', error);
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
        description: form.description.trim(),
      };

      if (editingId) {
        await apiClient.updateVehicle(editingId, payload);
      } else {
        await apiClient.createVehicle(payload);
      }

      await loadVehicles();
      resetForm();
      Alert.alert('Đã lưu xe', 'Thông tin xe đã được cập nhật.');
    } catch (saveError: any) {
      Alert.alert('Không thể lưu xe', saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteVehicle = (vehicle: Vehicle) => {
    Alert.alert('Xóa xe', `Bạn muốn xóa ${vehicle.name}?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            setSaving(true);
            await apiClient.deleteVehicle(vehicle.id);
            await loadVehicles();
          } catch (error: any) {
            Alert.alert('Không thể xóa xe', error.message);
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  return (
    <Screen scroll padding refreshing={loading} onRefresh={loadVehicles}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
        <View>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>Xe của tôi</Text>
          <Text style={{ color: colors.textSecondary, marginTop: spacing.xs }}>
            {vehicles.length} xe đang liên kết với tài khoản
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowForm((value) => !value)}
          disabled={saving}
          style={{
            width: 44,
            height: 44,
            borderRadius: borderRadius.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primary,
          }}
        >
          {showForm ? <X size={22} color="white" /> : <Plus size={22} color="white" />}
        </TouchableOpacity>
      </View>

      {showForm && (
        <Card style={{ marginBottom: spacing.lg }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: spacing.md }}>
            {editingId ? 'Cập nhật xe' : 'Thêm xe mới'}
          </Text>

          <TouchableOpacity
            onPress={pickImage}
            disabled={saving}
            activeOpacity={0.82}
            style={{
              height: 172,
              borderRadius: borderRadius.lg,
              backgroundColor: colors.surfaceAlt,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.md,
              overflow: 'hidden',
            }}
          >
            {form.image ? (
              <Image source={{ uri: form.image }} style={{ width: '100%', height: '100%' }} />
            ) : (
              <View style={{ alignItems: 'center', gap: spacing.sm }}>
                <Camera size={28} color={colors.primary} />
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Upload ảnh xe</Text>
              </View>
            )}
          </TouchableOpacity>

          <TextInput label="Tên xe" value={form.name} onChangeText={(name) => setForm((current) => ({ ...current, name }))} disabled={saving} style={{ marginBottom: spacing.md }} />
          <TextInput label="Hãng xe" value={form.brand} onChangeText={(brand) => setForm((current) => ({ ...current, brand }))} disabled={saving} style={{ marginBottom: spacing.md }} />
          <TextInput label="Biển số" value={form.licensePlate} onChangeText={(licensePlate) => setForm((current) => ({ ...current, licensePlate }))} disabled={saving} style={{ marginBottom: spacing.md }} />
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <TextInput label="Màu xe" value={form.color} onChangeText={(color) => setForm((current) => ({ ...current, color }))} disabled={saving} style={{ flex: 1, marginBottom: spacing.md }} />
            <TextInput label="Số ghế" value={form.seats} onChangeText={(seats) => setForm((current) => ({ ...current, seats }))} keyboardType="numeric" disabled={saving} style={{ width: 96, marginBottom: spacing.md }} />
          </View>
          <TextInput label="Giá/km" value={form.pricePerKm} onChangeText={(pricePerKm) => setForm((current) => ({ ...current, pricePerKm }))} keyboardType="numeric" disabled={saving} style={{ marginBottom: spacing.md }} />

          <Text style={{ color: colors.text, fontWeight: '700', marginBottom: spacing.sm }}>Trạng thái</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
            {statuses.map((status) => (
              <TouchableOpacity
                key={status}
                onPress={() => setForm((current) => ({ ...current, status }))}
                disabled={saving}
                style={{
                  flex: 1,
                  paddingVertical: spacing.sm,
                  borderRadius: borderRadius.md,
                  alignItems: 'center',
                  backgroundColor: form.status === status ? colors.primary : colors.surfaceAlt,
                }}
              >
                <Text style={{ color: form.status === status ? 'white' : colors.text, fontSize: fontSize.xs, fontWeight: '700' }}>
                  {status}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput label="Mô tả" value={form.description} onChangeText={(description) => setForm((current) => ({ ...current, description }))} multiline numberOfLines={3} disabled={saving} style={{ marginBottom: spacing.md }} />
          <Button label={editingId ? 'Lưu thay đổi' : 'Thêm xe'} onPress={saveVehicle} loading={saving} disabled={saving} />
        </Card>
      )}

      {loading ? (
        <>
          <CardSkeleton image style={{ marginBottom: spacing.lg }} />
          <CardSkeleton image style={{ marginBottom: spacing.lg }} />
        </>
      ) : vehicles.slice(0, visibleCount).map((vehicle) => (
        <Card key={vehicle.id} style={{ marginBottom: spacing.lg }}>
          {!!vehicle.image && (
            <Image
              source={{ uri: vehicle.image }}
              style={{ width: '100%', height: 168, borderRadius: borderRadius.lg, marginBottom: spacing.md, backgroundColor: colors.surfaceAlt }}
            />
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>{vehicle.name}</Text>
              <Text style={{ color: colors.textSecondary, marginTop: spacing.xs }}>
                {vehicle.brand} - {vehicle.licensePlate}
              </Text>
            </View>
            <Badge label={vehicle.status} variant={vehicle.status === 'Sẵn sàng' ? 'success' : vehicle.status === 'Bảo trì' ? 'warning' : 'info'} />
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
            <Text style={{ color: colors.textSecondary, flex: 1 }}>{vehicle.color || 'Chưa có màu'}</Text>
            <Text style={{ color: colors.textSecondary }}>{vehicle.seats} ghế</Text>
            <Text style={{ color: colors.text, fontWeight: '800' }}>{vehicle.pricePerKm.toLocaleString('vi-VN')}đ/km</Text>
          </View>
          {!!vehicle.description && (
            <Text style={{ color: colors.textSecondary, lineHeight: 20, marginTop: spacing.sm }}>{vehicle.description}</Text>
          )}
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
            <Button label="Sửa" onPress={() => editVehicle(vehicle)} variant="secondary" size="sm" style={{ flex: 1 }} icon={<Edit3 size={16} color={colors.text} />} disabled={saving} />
            <Button label="Xóa" onPress={() => deleteVehicle(vehicle)} variant="danger" size="sm" style={{ flex: 1 }} icon={<Trash2 size={16} color="white" />} disabled={saving} />
          </View>
        </Card>
      ))}

      {!loading && vehicles.length === 0 && (
        <EmptyState
          icon={<Car size={48} color={colors.primary} />}
          title="Chưa có xe"
          description="Thêm xe của bạn để bắt đầu nhận chuyến đi"
        />
      )}
      {!loading && vehicles.length > visibleCount && (
        <Button
          label="Tải thêm xe"
          onPress={() => setVisibleCount((current) => current + 8)}
          variant="outline"
        />
      )}
    </Screen>
  );
}
