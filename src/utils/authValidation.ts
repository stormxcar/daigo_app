export const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

export const validatePassword = (password: string) => {
  if (password.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự.';
  if (!/[A-Z]/.test(password)) return 'Mật khẩu cần có ít nhất 1 chữ hoa.';
  if (!/[a-z]/.test(password)) return 'Mật khẩu cần có ít nhất 1 chữ thường.';
  if (!/[0-9]/.test(password)) return 'Mật khẩu cần có ít nhất 1 chữ số.';
  return '';
};

export const toVietnameseAuthError = (message?: string) => {
  const lower = (message || '').toLowerCase();

  if (!message) return 'Đã có lỗi xảy ra. Vui lòng thử lại.';
  if (lower.includes('invalid login credentials')) return 'Email hoặc mật khẩu không đúng.';
  if (lower.includes('email not confirmed')) return 'Email chưa được xác thực. Vui lòng kiểm tra hộp thư.';
  if (lower.includes('user already registered') || lower.includes('already registered')) return 'Email này đã được đăng ký.';
  if (lower.includes('password')) return 'Mật khẩu không hợp lệ. Vui lòng kiểm tra lại.';
  if (lower.includes('otp') || lower.includes('token')) return 'Mã OTP không hợp lệ hoặc đã hết hạn.';
  if (lower.includes('network') || lower.includes('fetch')) return 'Kết nối mạng không ổn định. Vui lòng thử lại.';
  if (lower.includes('unsupported provider')) return 'Google chưa được bật trong Supabase Auth Providers.';
  if (lower.includes('permission denied') && lower.includes('profiles')) {
    return 'Tài khoản đăng nhập thành công nhưng app chưa đọc được bảng hồ sơ profiles. Đây là lỗi quyền database Supabase, không phải sai email/mật khẩu.';
  }
  if (lower.includes('permission denied')) {
    return 'Tài khoản đăng nhập thành công nhưng database từ chối quyền truy cập. Vui lòng kiểm tra quyền bảng/RLS trong Supabase.';
  }
  if (lower.includes('error sending recovery email') || lower.includes('error sending confirmation email')) {
    return 'Không thể gửi email xác thực/đặt lại mật khẩu. Vui lòng kiểm tra cấu hình SMTP trong Supabase Auth, đặc biệt SMTP user/password và email gửi đi.';
  }
  if (lower.includes('invalid username')) return 'SMTP username không đúng. Với Resend, SMTP username phải là "resend".';
  if (lower.includes('invalid password') || lower.includes('authentication failed')) return 'SMTP password không đúng. Với Resend, password phải là API key bắt đầu bằng "re_".';
  if (lower.includes('domain is not verified')) {
    return 'Domain gửi email chưa được xác minh trong Resend. Hãy verify domain trong Resend và dùng email gửi thuộc domain đó.';
  }

  return message;
};
