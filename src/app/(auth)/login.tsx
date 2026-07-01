import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  View,
  Text,
  TextInput as RNTextInput,
  TouchableOpacity,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { router, useLocalSearchParams } from "expo-router";
import { useTheme } from "@/theme";
import { fontForWeight, spacing, borderRadius, fontSize } from '@/theme/tokens';
import { Screen } from "@/components/ScreenComponents";
import { Button, TextInput } from "@/components/BaseComponents";
import { SubmitOverlay } from "@/components/SubmitOverlay";
import { useAuth } from "@/hooks/useAuth";
import { useSubmitLeaveGuard } from "@/hooks/useSubmitLeaveGuard";
import {
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  Lock,
  Mail,
  RotateCcw,
  Square,
} from "lucide-react-native";
import { getEmailValidationError, isValidEmail, toVietnameseAuthError } from "@/utils/authValidation";
import { DAIGO_LOGO_URL, APP_TAGLINE } from "@/constants/branding";
import { getAuthRedirectUri } from "@/utils/authRedirect";
import { showError as showErrorToast, showSuccess } from "@/utils/toast";

const REMEMBER_EMAIL_KEY = "booking_daigo_remember_email";
const REMEMBER_PASSWORD_KEY = "booking_daigo_remember_password";
const LOGIN_RATE_LIMIT_SECONDS = 60;

const isRateLimitAuthError = (error: any) => {
  const message = String(error?.message ?? "").toLowerCase();
  const status = error?.status || error?.code;
  return (
    status === 429 ||
    message.includes("too many requests") ||
    message.includes("rate limit") ||
    message.includes("security purposes") ||
    message.includes("over_email_send_rate_limit") ||
    message.includes("email rate limit exceeded")
  );
};

export default function LoginScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ next?: string; intent?: string }>();
  const { login, loginWithGoogle, isLoading, error } = useAuth();
  const isDriverIntent = params.next === "driver-onboarding" || params.intent === "driver";
  const nextRoute = isDriverIntent ? "/(auth)/driver-register" : undefined;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberLogin, setRememberLogin] = useState(false);
  const [localError, setLocalError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState("");
  const [loginCooldownUntil, setLoginCooldownUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const emailRef = useRef<RNTextInput>(null);
  const passwordRef = useRef<RNTextInput>(null);
  const loginCooldownSeconds = Math.max(
    0,
    Math.ceil((loginCooldownUntil - now) / 1000),
  );
  const isLoginBlocked = loginCooldownSeconds > 0;
  const isAuthenticating = isLoading || googleLoading;

  useSubmitLeaveGuard(
    isAuthenticating,
    "Daigo đang xác thực tài khoản. Thoát lúc này có thể khiến trạng thái đăng nhập chưa cập nhật kịp.",
  );

  useEffect(() => {
    const loadRememberedLogin = async () => {
      const rememberedEmail =
        await SecureStore.getItemAsync(REMEMBER_EMAIL_KEY);
      const rememberedPassword = await SecureStore.getItemAsync(
        REMEMBER_PASSWORD_KEY,
      );
      if (rememberedEmail && rememberedPassword) {
        setEmail(rememberedEmail);
        setPassword(rememberedPassword);
        setRememberLogin(true);
      }
    };

    loadRememberedLogin();
  }, []);

  useEffect(() => {
    if (!loginCooldownUntil) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [loginCooldownUntil]);

  const showError = (message: string) => {
    setLocalError(message);
    showErrorToast("Không thể đăng nhập", message);
  };

  const validateLogin = () => {
    const nextErrors: typeof fieldErrors = {};
    const normalizedEmail = email.trim();
    const emailError = getEmailValidationError(normalizedEmail);
    if (emailError) nextErrors.email = emailError;
    if (!password) nextErrors.password = "Vui lòng nhập mật khẩu.";
    setFieldErrors(nextErrors);
    setLocalError("");
    if (nextErrors.email) emailRef.current?.focus();
    else if (nextErrors.password) passwordRef.current?.focus();
    return Object.keys(nextErrors).length === 0;
  };

  const handleLogin = async () => {
    if (isLoginBlocked) {
      showError(`Supabase đang tạm giới hạn đăng nhập. Vui lòng thử lại sau ${loginCooldownSeconds} giây.`);
      return;
    }
    if (!validateLogin()) return;
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const response = await login({ email: normalizedEmail, password });
      if (rememberLogin) {
        await SecureStore.setItemAsync(REMEMBER_EMAIL_KEY, normalizedEmail);
        await SecureStore.setItemAsync(REMEMBER_PASSWORD_KEY, password);
      } else {
        await SecureStore.deleteItemAsync(REMEMBER_EMAIL_KEY);
        await SecureStore.deleteItemAsync(REMEMBER_PASSWORD_KEY);
      }
      router.replace(
        (nextRoute ??
          (response.user.role === "customer"
            ? "/(customer)/home"
            : "/(driver)/dashboard")) as any,
      );
      showSuccess(
        "Đăng nhập thành công",
        `Xin chào ${response.user.fullName}.`,
      );
    } catch (err: any) {
      if (isRateLimitAuthError(err)) {
        setLoginCooldownUntil(Date.now() + LOGIN_RATE_LIMIT_SECONDS * 1000);
        setNow(Date.now());
      }
      showError(toVietnameseAuthError(err.message));
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      setGoogleError("");
      setLocalError("");
      const response = await loginWithGoogle(getAuthRedirectUri());
      router.replace(
        (nextRoute ??
          (response.user.role === "customer"
            ? "/(customer)/home"
            : "/(driver)/dashboard")) as any,
      );
      showSuccess(
        "Đăng nhập Google thành công",
        `Xin chào ${response.user.fullName}.`,
      );
    } catch (err: any) {
      if (__DEV__) {
        console.warn("Google login failed", {
          message: err?.message,
          name: err?.name,
          code: err?.code,
          status: err?.status,
          details: err,
        });
      }
      const message = toVietnameseAuthError(err?.message);
      setGoogleError(message);
      showError(message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <Screen scroll padding>
      <SubmitOverlay
        visible={isAuthenticating}
        message={googleLoading ? "Đang đăng nhập Google..." : "Đang đăng nhập..."}
        description="Vui lòng chờ trong giây lát để Daigo hoàn tất xác thực."
      />
      <View
        style={{
          alignItems: "center",
          paddingTop: spacing.xl,
          paddingBottom: spacing.xl,
          // marginBottom: spacing.lg,
        }}
      >
        <Image
          source={{
            uri: "https://res.cloudinary.com/dzwjgfd7t/image/upload/v1782178208/booking_daigo/logo_text_no_bg-removebg-preview_dsu4n1.png",
          }}
          style={{
            width: 160,
            height: 72,
            resizeMode: "contain",
            marginBottom: spacing.md,
          }}
        />
        {/* <Text
          style={{
            fontSize: fontSize.sm,
            color: colors.textSecondary,
            ...fontForWeight('500'),
            letterSpacing: 0.5,
          }}
        >
          {APP_TAGLINE}
        </Text> */}
      </View>

      {/* Title */}
      <Text
        style={{
          fontSize: 26,
          ...fontForWeight("800"),
          color: colors.text,
          marginBottom: spacing.xs,
        }}
      >
        Đăng nhập
      </Text>
      <Text
        style={{
          fontSize: fontSize.sm,
          color: colors.textSecondary,
          marginBottom: spacing.xl,
        }}
      >
        Chào mừng trở lại!
      </Text>

      {(error || localError) && (
        <View
          style={{
            backgroundColor: colors.error,
            padding: spacing.md,
            borderRadius: borderRadius.md,
            marginBottom: spacing.lg,
          }}
        >
          <Text style={{ color: "white", fontSize: fontSize.sm }}>
            {error || localError}
          </Text>
        </View>
      )}

      <View style={{ marginBottom: spacing.lg }}>
        <TextInput
          label="Email"
          placeholder="Nhập email của bạn"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setLocalError("");
            setFieldErrors((current) => ({
              ...current,
              email:
                text.trim() && isValidEmail(text) ? undefined : current.email,
            }));
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => passwordRef.current?.focus()}
          disabled={isLoading}
          error={fieldErrors.email}
          ref={emailRef}
          icon={<Mail size={20} color={colors.textSecondary} />}
          style={{ marginBottom: spacing.lg }}
        />

        <TextInput
          label="Mật khẩu"
          placeholder="Nhập mật khẩu"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setLocalError("");
            setFieldErrors((current) => ({
              ...current,
              password: text ? undefined : current.password,
            }));
          }}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="password"
          textContentType="password"
          returnKeyType="done"
          onSubmitEditing={handleLogin}
          disabled={isLoading}
          error={fieldErrors.password}
          ref={passwordRef}
          icon={<Lock size={20} color={colors.textSecondary} />}
          rightIcon={
            <TouchableOpacity
              onPress={() => setShowPassword((value) => !value)}
              disabled={isLoading}
            >
              {showPassword ? (
                <EyeOff size={20} color={colors.textSecondary} />
              ) : (
                <Eye size={20} color={colors.textSecondary} />
              )}
            </TouchableOpacity>
          }
        />
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: spacing.xl,
        }}
      >
        <TouchableOpacity
          onPress={() => setRememberLogin((value) => !value)}
          disabled={isLoading}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
          }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: borderRadius.sm,
              borderWidth: 1,
              borderColor: rememberLogin ? colors.primary : colors.border,
              backgroundColor: rememberLogin ? colors.primary : colors.surface,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {rememberLogin ? (
              <Check size={16} color="white" />
            ) : (
              <Square size={14} color="transparent" />
            )}
          </View>
          <Text
            style={{
              color: colors.text,
              fontSize: fontSize.sm,
              ...fontForWeight("600"),
            }}
          >
            Ghi nhớ đăng nhập
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/(auth)/forgot-password")}
          disabled={isLoading}
        >
          <Text
            style={{
              color: colors.primary,
              fontSize: fontSize.sm,
              ...fontForWeight("600"),
            }}
          >
            Quên mật khẩu?
          </Text>
        </TouchableOpacity>
      </View>

      <Button
        label={isLoginBlocked ? `Thử lại sau ${loginCooldownSeconds}s` : "Đăng nhập"}
        onPress={handleLogin}
        loading={isLoading}
        disabled={isLoading || isLoginBlocked}
        style={{ marginBottom: spacing.lg }}
      />

      {isLoginBlocked && (
        <View
          style={{
            padding: spacing.md,
            borderRadius: borderRadius.md,
            backgroundColor: colors.surfaceAlt,
            borderWidth: 1,
            borderColor: colors.warning,
            marginBottom: spacing.md,
          }}
        >
          <Text style={{ color: colors.text, ...fontForWeight("800")}}>
            Tạm khóa đăng nhập
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: fontSize.sm,
              marginTop: spacing.xs,
              lineHeight: 20,
            }}
          >
            Bạn đã thử đăng nhập quá nhiều lần. Hãy chờ {loginCooldownSeconds} giây rồi thử lại để tránh bị Supabase giới hạn lâu hơn.
          </Text>
        </View>
      )}

      <Button
        label="Đăng nhập với Google"
        onPress={handleGoogleLogin}
        variant="outline"
        loading={googleLoading}
        disabled={isLoading || googleLoading}
        style={{ marginBottom: spacing.md }}
      />

      {googleLoading && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
            padding: spacing.md,
            borderRadius: borderRadius.md,
            backgroundColor: colors.surfaceAlt,
            marginBottom: spacing.md,
          }}
        >
          <ActivityIndicator size="small" color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, ...fontForWeight("800")}}>
              Đang đăng nhập Google
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: fontSize.sm,
                marginTop: spacing.xs,
              }}
            >
              Sau khi chọn tài khoản, ứng dụng sẽ tự quay lại trang chủ.
            </Text>
          </View>
        </View>
      )}

      {!!googleError && !googleLoading && (
        <View
          style={{
            padding: spacing.md,
            borderRadius: borderRadius.md,
            backgroundColor: colors.surfaceAlt,
            borderWidth: 1,
            borderColor: colors.error,
            marginBottom: spacing.md,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              gap: spacing.sm,
            }}
          >
            <AlertCircle size={20} color={colors.error} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, ...fontForWeight("900")}}>
                Google chưa hoàn tất đăng nhập
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  lineHeight: 20,
                  marginTop: spacing.xs,
                }}
              >
                {googleError}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={handleGoogleLogin}
            disabled={isLoading || googleLoading}
            style={{
              marginTop: spacing.md,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: spacing.sm,
              paddingVertical: spacing.md,
              borderRadius: borderRadius.md,
              backgroundColor: colors.primary,
            }}
          >
            <RotateCcw size={16} color="white" />
            <Text style={{ color: "white", ...fontForWeight("800")}}>
              Thử lại Google
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View
        style={{
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          gap: spacing.sm,
        }}
      >
        <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
          Chưa có tài khoản?
        </Text>
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/(auth)/register" as any,
              params: isDriverIntent ? { next: "driver-onboarding", intent: "driver" } : undefined,
            })
          }
          disabled={isLoading}
        >
          <Text
            style={{
              color: colors.primary,
              fontSize: fontSize.sm,
              ...fontForWeight("700"),
            }}
          >
            Đăng ký
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={{ alignItems: "center", marginTop: spacing.lg, gap: spacing.sm }}
      >
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/(auth)/register" as any,
              params: { next: "driver-onboarding", intent: "driver" },
            })
          }
          disabled={isLoading || googleLoading}
        >
          <Text
            style={{
              color: colors.primary,
              fontSize: fontSize.sm,
              ...fontForWeight("800"),
            }}
          >
            Bạn muốn làm tài xế
          </Text>
        </TouchableOpacity>
        <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
          Đã có tài khoản tài xế? Dùng Email hoặc Google ở trên
        </Text>
      </View>

      <View style={{ height: spacing["4xl"] }} />
    </Screen>
  );
}
