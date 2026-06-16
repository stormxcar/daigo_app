import React, { useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ArrowUpDown, Search, SlidersHorizontal, X } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, shadows, spacing } from '@/theme/tokens';

export interface FilterChip {
  key: string;
  label: string;
}

export interface SortOption {
  key: string;
  label: string;
}

interface SearchFilterBarProps {
  searchValue: string;
  onSearchChange: (text: string) => void;
  placeholder?: string;
  filters?: FilterChip[];
  activeFilter?: string;
  onFilterChange?: (key: string) => void;
  sortOptions?: SortOption[];
  activeSort?: string;
  onSortChange?: (key: string) => void;
  resultCount?: number;
  resultLabel?: string;
}

export function SearchFilterBar({
  searchValue,
  onSearchChange,
  placeholder = 'Tìm kiếm...',
  filters = [],
  activeFilter = 'all',
  onFilterChange,
  sortOptions = [],
  activeSort,
  onSortChange,
  resultCount,
  resultLabel,
}: SearchFilterBarProps) {
  const { colors } = useTheme();
  const [showSort, setShowSort] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const focusAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    Animated.spring(focusAnim, { toValue: 1, useNativeDriver: false, tension: 80 }).start();
  };

  const handleBlur = () => {
    Animated.spring(focusAnim, { toValue: 0, useNativeDriver: false, tension: 80 }).start();
  };

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.primary],
  });

  const activeSortLabel = sortOptions.find((opt) => opt.key === activeSort)?.label;

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <Animated.View
        style={[
          styles.searchBox,
          {
            backgroundColor: colors.surface,
            borderColor,
            ...shadows.sm,
          },
        ]}
      >
        <Search size={17} color={searchValue ? colors.primary : colors.textTertiary} />
        <TextInput
          ref={inputRef}
          value={searchValue}
          onChangeText={onSearchChange}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          onFocus={handleFocus}
          onBlur={handleBlur}
          returnKeyType="search"
          style={[styles.input, { color: colors.text }]}
        />
        {searchValue.length > 0 && (
          <TouchableOpacity onPress={() => onSearchChange('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Filters Row */}
      {(filters.length > 0 || sortOptions.length > 0) && (
        <View style={styles.controlsRow}>
          {/* Filter Chips */}
          {filters.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipScroll}
              style={{ flex: 1 }}
            >
              {filters.map((chip) => {
                const isActive = activeFilter === chip.key;
                return (
                  <TouchableOpacity
                    key={chip.key}
                    onPress={() => onFilterChange?.(chip.key)}
                    activeOpacity={0.75}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isActive ? colors.primary : colors.surface,
                        borderColor: isActive ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: isActive ? 'white' : colors.textSecondary },
                      ]}
                    >
                      {chip.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Sort Button */}
          {sortOptions.length > 0 && (
            <View style={{ position: 'relative' }}>
              <TouchableOpacity
                onPress={() => setShowSort((v) => !v)}
                activeOpacity={0.8}
                style={[
                  styles.sortBtn,
                  {
                    backgroundColor: activeSort ? colors.primary : colors.surface,
                    borderColor: activeSort ? colors.primary : colors.border,
                  },
                ]}
              >
                <ArrowUpDown size={14} color={activeSort ? 'white' : colors.textSecondary} />
                <Text
                  style={[
                    styles.sortBtnText,
                    { color: activeSort ? 'white' : colors.textSecondary },
                  ]}
                  numberOfLines={1}
                >
                  {activeSortLabel ?? 'Sắp xếp'}
                </Text>
              </TouchableOpacity>

              {/* Sort Dropdown */}
              {showSort && (
                <View
                  style={[
                    styles.dropdown,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      ...shadows.lg,
                    },
                  ]}
                >
                  {sortOptions.map((opt) => (
                    <TouchableOpacity
                      key={opt.key}
                      onPress={() => {
                        onSortChange?.(opt.key === activeSort ? '' : opt.key);
                        setShowSort(false);
                      }}
                      style={[
                        styles.dropdownItem,
                        opt.key === activeSort && { backgroundColor: colors.surfaceAlt },
                      ]}
                    >
                      <SlidersHorizontal size={14} color={opt.key === activeSort ? colors.primary : colors.textSecondary} />
                      <Text
                        style={[
                          styles.dropdownText,
                          { color: opt.key === activeSort ? colors.primary : colors.text, fontWeight: opt.key === activeSort ? '700' : '500' },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* Result count */}
      {resultCount !== undefined && (
        <Text style={[styles.resultCount, { color: colors.textTertiary }]}>
          {resultCount} {resultLabel ?? 'kết quả'}
          {searchValue ? ` cho "${searchValue}"` : ''}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    height: 46,
  },
  input: {
    flex: 1,
    fontSize: fontSize.base,
    paddingVertical: 0,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  chipScroll: {
    gap: spacing.sm,
    paddingRight: spacing.xs,
  },
  chip: {
    borderWidth: 1.5,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  chipText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1.5,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    maxWidth: 130,
  },
  sortBtnText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    flexShrink: 1,
  },
  dropdown: {
    position: 'absolute',
    right: 0,
    top: 38,
    minWidth: 180,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    zIndex: 100,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  dropdownText: {
    fontSize: fontSize.sm,
  },
  resultCount: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    marginTop: -spacing.xs,
  },
});
