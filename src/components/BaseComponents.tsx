import React, { FC, ReactNode, forwardRef } from 'react';
import { ActivityIndicator, View, Text, TouchableOpacity, ViewStyle, TextInput as RNTextInput, Image as RNImage, DimensionValue, TextInputProps as RNTextInputProps } from 'react-native';
import { useTheme } from '@/theme';
import { spacing, borderRadius, shadows, fontForWeight, fontSize } from '@/theme/tokens';

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
      paddingVertical: 7,
      paddingHorizontal: spacing.sm,
    },
    md: {
      paddingVertical: 9,
      paddingHorizontal: spacing.md,
    },
    lg: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
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
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'secondary' ? textColor : 'white'}
        />
      ) : (
        <>
          {icon && icon}
          <Text style={{ color: textColor, ...fontForWeight('700'), fontSize: size === 'lg' ? fontSize.base : fontSize.sm }}>
            {label}
          </Text>
        </>
      )}
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
  rightIcon?: ReactNode;
  style?: ViewStyle;
  multiline?: boolean;
  numberOfLines?: number;
  autoCapitalize?: RNTextInputProps['autoCapitalize'];
  autoCorrect?: boolean;
  autoComplete?: RNTextInputProps['autoComplete'];
  textContentType?: RNTextInputProps['textContentType'];
  returnKeyType?: RNTextInputProps['returnKeyType'];
  blurOnSubmit?: boolean;
  onSubmitEditing?: RNTextInputProps['onSubmitEditing'];
  contextMenuHidden?: boolean;
  preventBulkInput?: boolean;
  onBulkInputBlocked?: () => void;
}

export const TextInput = forwardRef<RNTextInput, TextInputProps>(({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  error,
  disabled = false,
  icon,
  rightIcon,
  style,
  multiline = false,
  numberOfLines,
  autoCapitalize,
  autoCorrect,
  autoComplete,
  textContentType,
  returnKeyType,
  blurOnSubmit,
  onSubmitEditing,
  contextMenuHidden,
  preventBulkInput,
  onBulkInputBlocked,
}, ref) => {
  const { colors } = useTheme();

  return (
    <View style={style}>
      {label && (
        <Text
          style={{
            fontSize: fontSize.sm,
            ...fontForWeight('600'),
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
          ref={ref}
          style={{
            flex: 1,
            paddingVertical: spacing.md,
            fontSize: fontSize.base,
            ...fontForWeight('400'),
            color: colors.text,
            minHeight: multiline ? 96 : undefined,
            textAlignVertical: multiline ? 'top' : 'center',
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          value={value}
          onChangeText={(nextText) => {
            if (preventBulkInput && nextText.length - value.length > 1) {
              onBulkInputBlocked?.();
              return;
            }
            onChangeText(nextText);
          }}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          editable={!disabled}
          selectionColor={colors.primary}
          multiline={multiline}
          numberOfLines={numberOfLines}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          autoComplete={autoComplete}
          textContentType={textContentType}
          returnKeyType={returnKeyType}
          blurOnSubmit={blurOnSubmit}
          onSubmitEditing={onSubmitEditing}
          contextMenuHidden={contextMenuHidden}
        />
        {rightIcon && rightIcon}
      </View>
      {error && (
        <Text
          style={{
          color: colors.error,
          fontSize: fontSize.xs,
          ...fontForWeight('400'),
          marginTop: spacing.xs,
          }}
        >
          {error}
        </Text>
      )}
    </View>
  );
});

TextInput.displayName = 'TextInput';

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
          ...fontForWeight('600'),
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
      <Text style={{ color: 'white', ...fontForWeight('700'), fontSize: fontSize.base }}>
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

export const CardSkeleton: FC<{ rows?: number; image?: boolean; style?: ViewStyle }> = ({
  rows = 3,
  image = false,
  style,
}) => (
  <Card style={style}>
    {image && <Skeleton height={150} borderRadius={borderRadius.lg} style={{ marginBottom: spacing.md }} />}
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md }}>
      <Skeleton width={48} height={48} borderRadius={24} />
      <View style={{ flex: 1, gap: spacing.sm }}>
        <Skeleton width="72%" height={16} />
        <Skeleton width="48%" height={12} />
      </View>
    </View>
    {Array.from({ length: rows }).map((_, index) => (
      <Skeleton
        key={index}
        width={index === rows - 1 ? '58%' : '100%'}
        height={12}
        style={{ marginTop: index === 0 ? 0 : spacing.sm }}
      />
    ))}
  </Card>
);
