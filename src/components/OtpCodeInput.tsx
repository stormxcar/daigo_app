import React, { useMemo, useRef } from 'react';
import { NativeSyntheticEvent, Text, TextInput, TextInputKeyPressEventData, View } from 'react-native';
import { useTheme } from '@/theme';
import { fontForWeight, borderRadius, fontSize, spacing } from '@/theme/tokens';

interface OtpCodeInputProps {
  value: string;
  onChangeText: (value: string) => void;
  length?: number;
  disabled?: boolean;
  label?: string;
  error?: string;
}

export function OtpCodeInput({
  value,
  onChangeText,
  length = 6,
  disabled = false,
  label = 'Mã OTP',
  error,
}: OtpCodeInputProps) {
  const { colors } = useTheme();
  const inputs = useRef<(TextInput | null)[]>([]);
  const digits = useMemo(() => value.replace(/\D/g, '').slice(0, length).split(''), [length, value]);

  const updateDigit = (text: string, index: number) => {
    const clean = text.replace(/\D/g, '');
    if (clean.length > 1) {
      const nextValue = clean.slice(0, length);
      onChangeText(nextValue);
      inputs.current[Math.min(nextValue.length, length - 1)]?.focus();
      return;
    }

    const nextDigits = Array.from({ length }, (_, digitIndex) => digits[digitIndex] ?? '');
    nextDigits[index] = clean;
    const nextValue = nextDigits.join('').slice(0, length);
    onChangeText(nextValue);

    if (clean && index < length - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (event: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) => {
    if (event.nativeEvent.key !== 'Backspace') return;
    if (digits[index]) return;
    if (index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text style={{ color: colors.text, fontSize: fontSize.sm, ...fontForWeight('800'), marginBottom: spacing.sm }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' }}>
        {Array.from({ length }).map((_, index) => {
          const active = digits.length === index || !!digits[index];
          return (
            <TextInput
              key={index}
              ref={(ref) => {
                inputs.current[index] = ref;
              }}
              value={digits[index] ?? ''}
              onChangeText={(text) => updateDigit(text, index)}
              onKeyPress={(event) => handleKeyPress(event, index)}
              editable={!disabled}
              keyboardType="number-pad"
              maxLength={index === 0 ? length : 1}
              selectTextOnFocus
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              style={{
                flex: 1,
                minWidth: 42,
                height: 54,
                borderRadius: borderRadius.md,
                borderWidth: 1.5,
                borderColor: active ? colors.primary : colors.border,
                backgroundColor: disabled ? colors.surfaceAlt : colors.surface,
                color: colors.text,
                fontSize: 22,
                ...fontForWeight('900'),
                textAlign: 'center',
              }}
            />
          );
        })}
      </View>
      {!!error && (
        <Text style={{ color: colors.error, fontSize: fontSize.xs, marginTop: spacing.sm }}>
          {error}
        </Text>
      )}
    </View>
  );
}
