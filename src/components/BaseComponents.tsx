import React, { FC, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle, TextInput as RNTextInput, Image as RNImage, DimensionValue } from 'react-native';
import { useTheme } from '@/theme';
import { spacing, borderRadius, shadows, fontSize, lineHeight } from '@/theme/tokens';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  style?: ViewStyle;
}

export const Button: FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  style,
}) => {
  const { colors } = useTheme();

  const baseStyle: ViewStyle = {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    gap: spacing.sm,
  };

  const variantStyles = {
    primary: {
      backgroundColor: colors.primary,
    },
    secondary: {
      backgroundColor: colors.surfaceAlt,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: colors.primary,
    },
    danger: {
      backgroundColor: colors.error,
    },
  };

  const sizeStyles = {
    sm: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    md: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    lg: {
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.xl,
    },
  };

  const textColor =
    variant === 'outline' ? colors.primary : variant === 'secondary' ? colors.text : 'white';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={[
        baseStyle,
        variantStyles[variant],
        sizeStyles[size],
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      {icon && icon}
      <Text style={{ color: textColor, fontWeight: '600', fontSize: fontSize.base }}>
        {loading ? 'Loading...' : label}
      </Text>
    </TouchableOpacity>
  );
};

interface TextInputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  error?: string;
  disabled?: boolean;
  icon?: ReactNode;
  style?: ViewStyle;
  multiline?: boolean;
  numberOfLines?: number;
}

export const TextInput: FC<TextInputProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  error,
  disabled = false,
  icon,
  style,
  multiline = false,
  numberOfLines,
}) => {
  const { colors } = useTheme();

  return (
    <View style={style}>
      {label && (
        <Text
          style={{
            fontSize: fontSize.sm,
            fontWeight: '600',
            color: colors.text,
            marginBottom: spacing.sm,
          }}
        >
          {label}
        </Text>
      )}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: error ? colors.error : colors.border,
          borderRadius: borderRadius.md,
          paddingHorizontal: spacing.md,
          backgroundColor: colors.surface,
          gap: spacing.sm,
        }}
      >
        {icon && icon}
        <RNTextInput
          style={{
            flex: 1,
            paddingVertical: spacing.md,
            fontSize: fontSize.base,
            color: colors.text,
            minHeight: multiline ? 96 : undefined,
            textAlignVertical: multiline ? 'top' : 'center',
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          editable={!disabled}
          selectionColor={colors.primary}
          multiline={multiline}
          numberOfLines={numberOfLines}
        />
      </View>
      {error && (
        <Text
          style={{
            color: colors.error,
            fontSize: fontSize.xs,
            marginTop: spacing.xs,
          }}
        >
          {error}
        </Text>
      )}
    </View>
  );
};

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  pressable?: boolean;
}

export const Card: FC<CardProps> = ({ children, onPress, style, pressable = false }) => {
  const { colors } = useTheme();

  const content = (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: borderRadius.lg,
          padding: spacing.lg,
          ...shadows.md,
        },
        style,
      ]}
    >
      {children}
    </View>
  );

  if (pressable && onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

interface BadgeProps {
  label: string;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'primary';
  size?: 'sm' | 'md';
}

export const Badge: FC<BadgeProps> = ({ label, variant = 'primary', size = 'sm' }) => {
  const { colors } = useTheme();

  const variantColors = {
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    info: colors.info,
    primary: colors.primary,
  };

  const sizeStyles = {
    sm: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      fontSize: fontSize.xs,
    },
    md: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      fontSize: fontSize.sm,
    },
  };

  return (
    <View
      style={{
        backgroundColor: variantColors[variant],
        borderRadius: borderRadius.full,
        paddingVertical: sizeStyles[size].paddingVertical,
        paddingHorizontal: sizeStyles[size].paddingHorizontal,
        alignSelf: 'flex-start',
      }}
    >
      <Text
        style={{
          color: 'white',
          fontWeight: '600',
          fontSize: sizeStyles[size].fontSize,
        }}
      >
        {label}
      </Text>
    </View>
  );
};

interface AvatarProps {
  source?: { uri: string };
  initials?: string;
  size?: 'sm' | 'md' | 'lg';
  style?: any;
}

export const Avatar: FC<AvatarProps> = ({ source, initials, size = 'md', style }) => {
  const { colors } = useTheme();

  const sizeStyles = {
    sm: { width: 32, height: 32, borderRadius: 16 },
    md: { width: 48, height: 48, borderRadius: 24 },
    lg: { width: 64, height: 64, borderRadius: 32 },
  };

  if (source) {
    return (
      <RNImage
        source={source}
        style={[sizeStyles[size], { borderRadius: sizeStyles[size].borderRadius }, style]}
      />
    );
  }

  return (
    <View
      style={[
        {
          ...sizeStyles[size],
          backgroundColor: colors.primary,
          justifyContent: 'center',
          alignItems: 'center',
        },
        style,
      ]}
    >
      <Text style={{ color: 'white', fontWeight: '700', fontSize: fontSize.base }}>
        {initials}
      </Text>
    </View>
  );
};

interface SeparatorProps {
  height?: number;
  color?: string;
}

export const Separator: FC<SeparatorProps> = ({ height = 1, color }) => {
  const { colors } = useTheme();

  return (
    <View
      style={{
        height,
        backgroundColor: color || colors.border,
        width: '100%',
      }}
    />
  );
};

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton: FC<SkeletonProps> = ({ width = '100%', height = 12, borderRadius = 8, style }) => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        {
          width,
          height,
          backgroundColor: colors.surfaceAlt,
          borderRadius,
        },
        style,
      ]}
    />
  );
};
