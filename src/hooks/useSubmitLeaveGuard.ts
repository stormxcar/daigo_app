import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from 'expo-router';

export function useSubmitLeaveGuard(enabled: boolean, message: string, title = 'Đang xử lý') {
  const navigation = useNavigation<any>();
  const allowingRemoveRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      allowingRemoveRef.current = false;
      return undefined;
    }

    const unsubscribe = navigation.addListener('beforeRemove', (event: any) => {
      if (allowingRemoveRef.current) return;

      event.preventDefault();
      Alert.alert(title, message, [
        { text: 'Ở lại', style: 'cancel' },
        {
          text: 'Thoát',
          style: 'destructive',
          onPress: () => {
            allowingRemoveRef.current = true;
            navigation.dispatch(event.data.action);
          },
        },
      ]);
    });

    return unsubscribe;
  }, [enabled, message, navigation, title]);
}
