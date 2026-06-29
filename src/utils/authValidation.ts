const COMMON_EMAIL_DOMAIN_FIXES: Record<string, string> = {
  'gmai.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.co': 'gmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmial.com': 'hotmail.com',
  'yaho.com': 'yahoo.com',
  'yahoo.con': 'yahoo.com',
  'outlok.com': 'outlook.com',
  'outlook.con': 'outlook.com',
};

export const getEmailValidationError = (email: string) => {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return 'Vui lòng nhập email.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return 'Email không đúng định dạng.';

  const domain = normalized.split('@')[1];
  const suggestion = COMMON_EMAIL_DOMAIN_FIXES[domain];
  if (suggestion) return `Email có thể bị nhập sai. Bạn muốn dùng ${normalized.replace(`@${domain}`, `@${suggestion}`)}?`;

  return '';
};

export const isValidEmail = (email: string) => !getEmailValidationError(email);

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
  if (
    lower.includes('số điện thoại này đã được đăng ký') ||
    lower.includes('profiles_unique_normalized_phone') ||
    (lower.includes('duplicate key') && lower.includes('phone'))
  ) {
    return 'Số điện thoại này đã được đăng ký. Vui lòng đăng nhập hoặc dùng số khác.';
  }
  if (lower.includes('database error saving new user')) {
    return 'Không thể tạo hồ sơ người dùng. Email hoặc số điện thoại có thể đã được đăng ký.';
  }
  if (
    lower.includes('too many requests') ||
    lower.includes('rate limit') ||
    lower.includes('security purposes') ||
    lower.includes('over_email_send_rate_limit') ||
    lower.includes('email rate limit exceeded')
  ) {
    return 'Bạn thao tác quá nhanh hoặc nhập sai nhiều lần. Vui lòng chờ một lúc rồi thử lại.';
  }
  if (lower.includes('password')) return 'Mật khẩu không hợp lệ. Vui lòng kiểm tra lại.';
  if (lower.includes('auth/operation-not-allowed') || lower.includes('operation-not-allowed')) {
    if (lower.includes('region enabled') || lower.includes('sms unable to be sent')) {
      return 'Firebase chưa cho phép gửi SMS tới vùng/số điện thoại này. Hãy vào Firebase Console > Authentication > Settings/SMS region policy và bật Việt Nam, đồng thời kiểm tra Phone provider đã được bật.';
    }
    return 'Firebase Phone Authentication chưa được bật cho project này. Hãy vào Firebase Console > Authentication > Sign-in method và bật Phone.';
  }
  if (lower.includes('auth/billing-not') || lower.includes('billing_not_enabled') || lower.includes('billing-not')) {
    return 'Firebase đang chặn gửi SMS vì project chưa bật billing/Blaze. Để test miễn phí, hãy dùng số điện thoại test trong Firebase Console hoặc bật OTP test nội bộ của app.';
  }
  if (lower.includes('auth/app-not-authorized')) {
    return 'Firebase chưa cho phép app Android này gửi OTP. Hãy kiểm tra package name, SHA-1/SHA-256, google-services.json và build lại APK.';
  }
  if (lower.includes('auth/missing-client-identifier') || lower.includes('auth/missing-app-credential')) {
    return 'Firebase chưa xác thực được app để gửi SMS. Hãy kiểm tra SHA-1/SHA-256, Play Integrity/SafetyNet và tải lại google-services.json rồi build lại.';
  }
  if (lower.includes('auth/quota-exceeded')) {
    return 'Firebase đã giới hạn gửi SMS tạm thời. Hãy thử số test trong Firebase Console hoặc chờ thêm trước khi gửi lại.';
  }
  if (lower.includes('auth/invalid-phone-number')) {
    return 'Số điện thoại không đúng định dạng Firebase. Hãy nhập dạng Việt Nam như 0912345678 hoặc +84912345678.';
  }
  if (lower.includes('không thể gửi otp firebase') || lower.includes('firebase phone otp send')) {
    return message;
  }
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
