import Toast from 'react-native-toast-message';

type ToastKind = 'success' | 'error' | 'info' | 'warning';

type ToastActionOptions = {
  actionLabel: string;
  onAction: () => void;
  visibilityTime?: number;
};

export function showToast(type: ToastKind, text1: string, text2?: string) {
  Toast.show({
    type,
    text1,
    text2,
    visibilityTime: type === 'error' ? 7000 : 5600,
  });
}

export function showSuccess(text1: string, text2?: string) {
  showToast('success', text1, text2);
}

export function showError(text1: string, text2?: string) {
  showToast('error', text1, text2);
}

export function showInfo(text1: string, text2?: string) {
  showToast('info', text1, text2);
}

export function showWarning(text1: string, text2?: string) {
  showToast('warning', text1, text2);
}

export function showSuccessAction(text1: string, text2: string | undefined, options: ToastActionOptions) {
  Toast.show({
    type: 'success',
    text1,
    text2,
    visibilityTime: options.visibilityTime ?? 8000,
    props: {
      actionLabel: options.actionLabel,
      onAction: options.onAction,
    },
  });
}
