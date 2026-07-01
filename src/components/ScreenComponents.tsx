import React, { FC, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { fontForWeight, spacing } from '@/theme/tokens';

interface ScreenProps {
  children: ReactNode;
  style?: ViewStyle;
  scroll?: boolean;
  padding?: boolean;
  paddingHorizontal?: boolean;
  paddingVertical?: boolean;
  safeArea?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export const Screen: FC<ScreenProps> = ({
  children,
  style,
  scroll = false,
  padding = false,
  paddingHorizontal = padding,
  paddingVertical = padding,
  safeArea = false,
  refreshing = false,
  onRefresh,
}) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomOverlayPadding = 120 + insets.bottom;

  const containerStyle = {
    flex: 1,
    backgroundColor: colors.background,
    ...(paddingHorizontal && { paddingHorizontal: spacing.lg }),
    ...(paddingVertical && { paddingVertical: spacing.lg }),
    ...(safeArea && {
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
    }),
  };

  const content = scroll ? (
    <ScrollView
      style={containerStyle}
      contentContainerStyle={[
        { flexGrow: 1, paddingBottom: bottomOverlayPadding },
        style,
      ]}
      scrollEnabled={true}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[containerStyle, style]}>
      {children}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      {content}
    </KeyboardAvoidingView>
  );
};

interface HeaderProps {
  title: string;
  subtitle?: string;
  style?: ViewStyle;
}

export const ScreenHeader: FC<HeaderProps> = ({ title, subtitle, style }) => {
  const { colors } = useTheme();

  return (
    <View style={[{ paddingHorizontal: spacing.md }, style]}>
      <Text
        style={{
          fontSize: 28,
          ...fontForWeight('700'),
          color: colors.text,
          marginBottom: subtitle ? spacing.xs : 0,
        }}
      >
        {title}
      </Text>
      {subtitle && (
        <Text
          style={{
            fontSize: 14,
            color: colors.textSecondary,
            marginBottom: spacing.lg,
          }}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
};

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export const EmptyState: FC<EmptyStateProps> = ({ icon, title, description, action }) => {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
      }}
    >
      {icon && (
        <View style={{ marginBottom: spacing.lg }}>
          {icon}
        </View>
      )}
      <Text
        style={{
          fontSize: 18,
          ...fontForWeight('600'),
          color: colors.text,
          marginBottom: spacing.sm,
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
      {description && (
        <Text
          style={{
            fontSize: 14,
            color: colors.textSecondary,
            marginBottom: action ? spacing.lg : 0,
            textAlign: 'center',
          }}
        >
          {description}
        </Text>
      )}
    </View>
  );
};

interface LoadingStateProps {
  message?: string;
}

export const LoadingState: FC<LoadingStateProps> = ({ message = 'Đang tải...' }) => {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text style={{ color: colors.textSecondary, marginTop: spacing.lg }}>
        {message}
      </Text>
    </View>
  );
};
