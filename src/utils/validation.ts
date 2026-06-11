import { z } from 'zod';

// Auth Validation Schemas
export const LoginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  rememberMe: z.boolean().optional(),
});

export const RegisterSchema = z
  .object({
    fullName: z.string().min(2, 'Tên phải có ít nhất 2 ký tự'),
    email: z.string().email('Email không hợp lệ'),
    phone: z
      .string()
      .regex(/^0[0-9]{9}$/, 'Số điện thoại không hợp lệ'),
    password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
});

export const OTPSchema = z.object({
  otp: z
    .string()
    .length(6, 'Mã OTP phải là 6 chữ số')
    .regex(/^[0-9]+$/, 'Mã OTP chỉ chứa số'),
});

export const ResetPasswordSchema = z
  .object({
    password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

// Booking Validation Schema
export const BookingSchema = z.object({
  pickupLocation: z.string().min(3, 'Vị trí đón tối thiểu 3 ký tự'),
  dropoffLocation: z.string().min(3, 'Vị trí trả tối thiểu 3 ký tự'),
  date: z.string().refine((date) => {
    const d = new Date(date);
    return d >= new Date() && !isNaN(d.getTime());
  }, 'Ngày đặt phải trong tương lai'),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Thời gian không hợp lệ'),
  passengers: z
    .number()
    .min(1, 'Ít nhất 1 hành khách')
    .max(6, 'Tối đa 6 hành khách'),
  note: z.string().max(500, 'Ghi chú tối đa 500 ký tự').optional(),
});

// Vehicle Validation Schema
export const VehicleSchema = z.object({
  name: z.string().min(2, 'Tên xe tối thiểu 2 ký tự'),
  brand: z.string().min(2, 'Thương hiệu tối thiểu 2 ký tự'),
  licensePlate: z.string().min(5, 'Biển số tối thiểu 5 ký tự'),
  color: z.string().min(2, 'Màu sắc tối thiểu 2 ký tự'),
  seats: z.number().min(1, 'Tối thiểu 1 ghế').max(8, 'Tối đa 8 ghế'),
  pricePerKm: z
    .number()
    .min(5000, 'Giá tối thiểu 5.000 VND/km')
    .max(100000, 'Giá tối đa 100.000 VND/km'),
  description: z.string().max(500, 'Mô tả tối đa 500 ký tự').optional(),
});

// Profile Update Schema
export const ProfileSchema = z.object({
  fullName: z.string().min(2, 'Tên phải có ít nhất 2 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  phone: z
    .string()
    .regex(/^0[0-9]{9}$/, 'Số điện thoại không hợp lệ'),
});

// Change Password Schema
export const ChangePasswordSchema = z
  .object({
    oldPassword: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
    newPassword: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

// Blog Post Schema
export const BlogPostSchema = z.object({
  caption: z
    .string()
    .min(5, 'Bình luận tối thiểu 5 ký tự')
    .max(1000, 'Bình luận tối đa 1000 ký tự'),
  mediaUrls: z.array(z.string().url('URL không hợp lệ')).optional(),
});

// Message Schema
export const MessageSchema = z.object({
  text: z
    .string()
    .min(1, 'Tin nhắn không được trống')
    .max(500, 'Tin nhắn tối đa 500 ký tự'),
});

// Export types
export type LoginFormData = z.infer<typeof LoginSchema>;
export type RegisterFormData = z.infer<typeof RegisterSchema>;
export type ForgotPasswordFormData = z.infer<typeof ForgotPasswordSchema>;
export type OTPFormData = z.infer<typeof OTPSchema>;
export type ResetPasswordFormData = z.infer<typeof ResetPasswordSchema>;
export type BookingFormData = z.infer<typeof BookingSchema>;
export type VehicleFormData = z.infer<typeof VehicleSchema>;
export type ProfileFormData = z.infer<typeof ProfileSchema>;
export type ChangePasswordFormData = z.infer<typeof ChangePasswordSchema>;
export type BlogPostFormData = z.infer<typeof BlogPostSchema>;
export type MessageFormData = z.infer<typeof MessageSchema>;
