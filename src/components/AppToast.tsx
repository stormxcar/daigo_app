import React from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';
import Toast, { BaseToastProps, ToastConfig } from 'react-native-toast-message';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react-native';
import { borderRadius, fontForWeight, fontSize, shadows, spacing } from '@/theme/tokens';

const toastMeta = {
  success: {
    color: '#10b981',
    backgroundColor: '#ecfdf5',
    icon: <CheckCircle2 size={22} color="#10b981" />,
  },
  error: {
    color: '#ef4444',
    backgroundColor: '#fef2f2',
    icon: <XCircle size={22} color="#ef4444" />,
  },
  info: {
    color: '#2563eb',
    backgroundColor: '#eff6ff',
    icon: <Info size={22} color="#2563eb" />,
  },
  warning: {
    color: '#f59e0b',
    backgroundColor: '#fffbeb',
    icon: <AlertTriangle size={22} color="#f59e0b" />,
  },
};

function RichToast({ text1, text2, type = 'info', props }: BaseToastProps & { type?: keyof typeof toastMeta; props?: { actionLabel?: string; onAction?: () => void } }) {
  const meta = toastMeta[type] ?? toastMeta.info;
  const actionLabel = props?.actionLabel;
  const onAction = props?.onAction;

  return (
    <Animated.View
      style={{
        width: '92%',
        maxWidth: 560,
        borderLeftWidth: 5,
        borderLeftColor: meta.color,
        backgroundColor: meta.backgroundColor,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        flexDirection: 'row',
        gap: spacing.md,
        alignItems: 'flex-start',
        ...shadows.lg,
      }}
    >
      <View style={{ marginTop: 1 }}>{meta.icon}</View>
      <View style={{ flex: 1 }}>
        {!!text1 && (
          <Text
            numberOfLines={0}
            style={{ color: '#0f172a', fontSize: fontSize.base, ...fontForWeight('900'), lineHeight: 22, flexShrink: 1 }}
          >
            {text1}
          </Text>
        )}
        {!!text2 && (
          <Text
            numberOfLines={0}
            style={{ color: '#334155', fontSize: fontSize.sm, lineHeight: 20, marginTop: spacing.xs, flexShrink: 1 }}
          >
            {text2}
          </Text>
        )}
        {!!actionLabel && !!onAction && (
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => {
              Toast.hide();
              onAction();
            }}
            style={{
              alignSelf: 'flex-start',
              marginTop: spacing.sm,
              paddingHorizontal: spacing.md,
              paddingVertical: 7,
              borderRadius: borderRadius.full,
              backgroundColor: meta.color,
            }}
          >
            <Text style={{ color: 'white', fontSize: fontSize.xs, ...fontForWeight('900') }}>{actionLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const toastConfig: ToastConfig = {
  success: (props) => <RichToast {...props} type="success" />,
  error: (props) => <RichToast {...props} type="error" />,
  info: (props) => <RichToast {...props} type="info" />,
  warning: (props) => <RichToast {...props} type="warning" />,
};

export function AppToast() {
  return <Toast config={toastConfig} topOffset={54} visibilityTime={5600} />;
}


