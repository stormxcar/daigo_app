import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View, ViewStyle } from 'react-native';
import { LocateFixed, MapPin, Search, X } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, shadows, spacing } from '@/theme/tokens';
import { LocationSuggestion, searchVietnamLocations } from '@/services/locations';

export type DestinationPlace = {
  name: string;
  address: string;
  placeId: string;
  latitude?: number;
  longitude?: number;
};

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onSelectPlace: (place: DestinationPlace) => void;
  onSubmitText?: (text: string) => void;
  placeholder?: string;
  title?: string;
  helperText?: string;
  currentLocation?: { lat: number; lng: number } | null;
  autoFocus?: boolean;
  containerStyle?: ViewStyle;
};

const splitLocationLabel = (label: string) => {
  const [name, ...rest] = label.split(',').map((item) => item.trim()).filter(Boolean);
  return {
    name: name || label,
    address: rest.join(', ') || label,
  };
};

const toDestinationPlace = (suggestion: LocationSuggestion): DestinationPlace => {
  const label = splitLocationLabel(suggestion.label);
  return {
    name: label.name,
    address: suggestion.label,
    placeId: suggestion.id,
    latitude: suggestion.lat,
    longitude: suggestion.lng,
  };
};

export function DestinationSearchInput({
  value,
  onChangeText,
  onSelectPlace,
  onSubmitText,
  placeholder = 'Bạn muốn đi đâu ?',
  title = 'Bạn muốn đi đâu?',
  helperText: helperTextOverride,
  currentLocation,
  autoFocus = false,
  containerStyle,
}: Props) {
  const { colors } = useTheme();
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const trimmedValue = value.trim();
  const showDropdown = focused && trimmedValue.length >= 2;

  useEffect(() => {
    const timer = setTimeout(() => {
      if (trimmedValue.length < 2) {
        setSuggestions([]);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      searchVietnamLocations(trimmedValue)
        .then(setSuggestions)
        .catch((searchError) => {
          setSuggestions([]);
          setError(searchError.message || 'Không thể tải gợi ý địa điểm.');
        })
        .finally(() => setLoading(false));
    }, 420);

    return () => clearTimeout(timer);
  }, [trimmedValue]);

  const helperText = useMemo(() => {
    if (helperTextOverride) return helperTextOverride;
    if (currentLocation) return 'Gợi ý điểm đến tại Việt Nam';
    return 'Nhập điểm đến để bắt đầu chuyến đi';
  }, [currentLocation, helperTextOverride]);

  const handleSelect = (suggestion: LocationSuggestion) => {
    setFocused(false);
    setSuggestions([]);
    onSelectPlace(toDestinationPlace(suggestion));
  };

  const handleSubmit = () => {
    if (!trimmedValue) return;
    if (suggestions[0]) {
      handleSelect(suggestions[0]);
      return;
    }
    setFocused(false);
    onSubmitText?.(trimmedValue);
  };

  return (
    <View style={[{ zIndex: 20 }, containerStyle]}>
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: borderRadius.xl,
          padding: spacing.md,
          borderWidth: 1,
          borderColor: focused ? colors.primary : colors.border,
          ...shadows.md,
        }}
      >
        <Text style={{ color: colors.text, fontSize: fontSize.base, fontWeight: '900', marginBottom: spacing.xs }}>
          {title}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginBottom: spacing.md }}>
          {helperText}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            backgroundColor: colors.background,
            borderRadius: borderRadius.lg,
            paddingHorizontal: spacing.md,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Search size={20} color={colors.primary} />
          <TextInput
            value={value}
            onChangeText={(text) => {
              onChangeText(text);
              setFocused(true);
            }}
            onFocus={() => setFocused(true)}
            onSubmitEditing={handleSubmit}
            returnKeyType="search"
            autoFocus={autoFocus}
            placeholder={placeholder}
            placeholderTextColor={colors.textTertiary}
            selectionColor={colors.primary}
            style={{
              flex: 1,
              minHeight: 48,
              color: colors.text,
              fontSize: fontSize.base,
              fontWeight: '700',
            }}
          />
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : value ? (
            <TouchableOpacity
              onPress={() => {
                onChangeText('');
                setSuggestions([]);
                setError(null);
              }}
              hitSlop={8}
            >
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : (
            <LocateFixed size={18} color={colors.textTertiary} />
          )}
        </View>
      </View>

      {showDropdown && (
        <View
          style={{
            marginTop: spacing.sm,
            borderRadius: borderRadius.lg,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            overflow: 'hidden',
            ...shadows.md,
          }}
        >
          {error ? (
            <Text style={{ color: colors.error, padding: spacing.md, fontSize: fontSize.sm }}>
              {error}
            </Text>
          ) : loading ? (
            <View style={{ padding: spacing.md, flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>Đang tìm địa điểm...</Text>
            </View>
          ) : suggestions.length > 0 ? (
            suggestions.slice(0, 6).map((item) => {
              const label = splitLocationLabel(item.label);
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.82}
                  style={{
                    flexDirection: 'row',
                    gap: spacing.md,
                    padding: spacing.md,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  }}
                >
                  <MapPin size={18} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ color: colors.text, fontWeight: '900' }}>
                      {label.name}
                    </Text>
                    <Text numberOfLines={2} style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginTop: spacing.xs }}>
                      {label.address}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <Text style={{ color: colors.textSecondary, padding: spacing.md, fontSize: fontSize.sm }}>
              Không tìm thấy địa điểm phù hợp.
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
