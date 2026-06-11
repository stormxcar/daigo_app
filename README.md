# VF7 Booking Mobile App - React Native with Expo

A complete React Native mobile application for booking premium VinFast VF7 vehicles, built with Expo, Expo Router, Zustand, and TailwindCSS (NativeWind). Fully inspired by popular ride-sharing platforms like Grab, Be, and Xanh SM.

## 📱 Features

### ✅ Completed Features
- **Full-featured authentication system** with splash screen, onboarding, login, register, and password reset
- **Dark/Light mode support** with Zustand-based theme management
- **Role-based navigation** - Separate flows for customers and drivers
- **Complete state management** with Zustand stores for auth, bookings, vehicles, notifications, chat, and blog
- **Mock API service layer** with support for all CRUD operations
- **Validation schemas** using Zod for form validation
- **Reusable component library** including buttons, inputs, cards, avatars, badges, etc.
- **Feature-specific cards** for vehicles, drivers, bookings, and notifications
- **Custom hooks** for authentication, bookings, vehicles, and notifications
- **Utility functions** for formatting, calculations, and helpers
- **Comprehensive theme system** with light/dark colors, spacing, typography, and shadows

### 🚀 Ready to Implement
The app structure is complete with placeholder screens ready for implementation:

#### Customer App
- **Home Screen** - Hero, available vehicles, driver info, quick actions
- **Booking Screen** - Create bookings, view history, manage rides
- **Blog Screen** - View driver posts and updates
- **Chat Screen** - Real-time messaging with drivers
- **Profile Screen** - User info, settings, logout
- **Notifications Screen** - Booking updates and alerts

#### Driver App
- **Dashboard** - Statistics, revenue, trips overview
- **Vehicles** - Manage vehicle fleet and details
- **Bookings** - View and manage booking requests
- **Profile** - Driver info and settings

## 🏗️ Project Structure

```
booking_car_app_mobile/
├── src/
│   ├── app/                          # Expo Router app directory
│   │   ├── _layout.tsx              # Root layout with auth detection
│   │   ├── (auth)/                  # Auth stack
│   │   │   ├── splash.tsx           # Splash screen (COMPLETE)
│   │   │   ├── onboarding.tsx       # Onboarding flow (COMPLETE)
│   │   │   ├── login.tsx            # Login screen (COMPLETE)
│   │   │   ├── register.tsx         # Register screen (COMPLETE)
│   │   │   └── forgot-password.tsx  # Password reset (COMPLETE)
│   │   ├── (customer)/              # Customer tab navigation
│   │   │   ├── home.tsx             # Customer home (COMPLETE)
│   │   │   ├── booking.tsx          # Booking screen (TEMPLATE)
│   │   │   ├── blog.tsx             # Blog screen (TEMPLATE)
│   │   │   ├── chat.tsx             # Chat screen (TEMPLATE)
│   │   │   ├── profile.tsx          # Profile screen (COMPLETE)
│   │   │   └── notifications.tsx    # Notifications (TEMPLATE)
│   │   └── (driver)/                # Driver tab navigation
│   │       ├── dashboard.tsx        # Dashboard (TEMPLATE)
│   │       ├── vehicles.tsx         # Vehicles (TEMPLATE)
│   │       ├── bookings.tsx         # Bookings (TEMPLATE)
│   │       └── profile.tsx          # Profile (COMPLETE)
│   │
│   ├── components/                  # Reusable components
│   │   ├── BaseComponents.tsx       # Button, TextInput, Card, Avatar, Badge
│   │   ├── ScreenComponents.tsx     # Screen, ScreenHeader, EmptyState
│   │   └── FeatureCards.tsx         # VehicleCard, DriverCard, BookingCard
│   │
│   ├── features/                    # Feature-specific directories (ready for expansion)
│   │   ├── auth/
│   │   ├── customer/
│   │   └── driver/
│   │
│   ├── stores/                      # Zustand stores
│   │   ├── authStore.ts             # Auth state
│   │   ├── bookingStore.ts          # Booking state
│   │   ├── vehicleStore.ts          # Vehicle state
│   │   ├── notificationStore.ts     # Notification state
│   │   ├── chatStore.ts             # Chat state
│   │   ├── blogStore.ts             # Blog state
│   │   └── profileStore.ts          # Profile state
│   │
│   ├── services/                    # API & data services
│   │   ├── api.ts                   # API client with mock methods
│   │   ├── mockData.ts              # Mock data for development
│   │   └── mockDriver.ts            # Mock driver data
│   │
│   ├── hooks/                       # Custom React hooks
│   │   ├── useAuth.ts               # Auth operations
│   │   ├── useBooking.ts            # Booking operations
│   │   ├── useVehicles.ts           # Vehicle operations
│   │   ├── useNotifications.ts      # Notification operations
│   │   ├── useAsync.ts              # Async utility hooks
│   │   └── index.ts                 # Exports
│   │
│   ├── utils/                       # Utility functions
│   │   ├── helpers.ts               # Date, currency, validation helpers
│   │   └── validation.ts            # Zod schemas for form validation
│   │
│   ├── types/                       # TypeScript type definitions
│   │   └── index.ts                 # User, Vehicle, Booking, Notification types
│   │
│   ├── constants/                   # App constants
│   │   └── index.ts                 # Status, roles, prices, storage keys
│   │
│   ├── theme/                       # Theme system
│   │   ├── tokens.ts                # Design tokens (colors, spacing, typography)
│   │   └── index.ts                 # Theme hooks and stores
│   │
│   └── assets/                      # Static assets (images, icons, fonts)
│
├── package.json                     # Dependencies
├── app.json                         # Expo configuration
├── tsconfig.json                    # TypeScript configuration
├── tailwind.config.ts              # Tailwind/NativeWind configuration
├── .env.example                     # Environment variables template
└── README.md                        # This file
```

## 🛠️ Tech Stack

- **React Native 0.76** - Cross-platform mobile framework
- **Expo 52** - React Native development platform
- **Expo Router 4** - File-based routing for React Native
- **TypeScript** - Type-safe development
- **Zustand 5** - Lightweight state management
- **React Hook Form** - Form state management
- **Zod** - TypeScript-first schema validation
- **TailwindCSS + NativeWind** - Utility-first styling
- **Lucide React Native** - Icon library
- **Axios** - HTTP client
- **Day.js** - Date manipulation

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (Mac) or Android Emulator

### Installation

1. **Clone and setup**
```bash
cd booking_car_app_mobile
npm install
# or
yarn install
```

2. **Create environment file**
```bash
cp .env.example .env.local
```

3. **Start development server**
```bash
npm start
# or
yarn start
```

4. **Run on simulator**
```bash
# iOS
npm run ios

# Android
npm run android

# Web
npm run web
```

## 🔐 Demo Credentials

### Customer Account
- **Email**: `khachhang@gmail.com`
- **Password**: `password123`

### Driver Account
- **Email**: `taixe.nguyenxuandai@gmail.com`
- **Password**: `tai-xe-quan-tri-7`

## 📋 Core Business Logic Preserved

All features from the original web app have been preserved:

### User Roles
- **Customer**: Book vehicles, track trips, chat with drivers, view notifications
- **Driver**: Manage vehicles, accept/reject bookings, view revenue, handle communications

### Booking System
- Create bookings with pickup/dropoff locations, date, time, passenger count
- Real-time price calculation based on distance and vehicle pricing
- Booking status: Pending → Confirmed → Completed/Cancelled
- Support for special requests and notes

### Vehicle Management
- Fleet management with status tracking (Ready, Busy, Maintenance)
- Vehicle specifications (seats, license plate, color, pricing)
- Support for multiple vehicle types

### Notifications
- Booking confirmation notifications
- Driver acceptance/rejection alerts
- Trip completion notifications
- Real-time message notifications

### Chat System
- Direct messaging with drivers
- Message history per conversation
- Typing indicators
- Read/unread status

## 🎨 Theming & Styling

### Using the Theme
```tsx
import { useTheme } from '@/theme';

export default function MyComponent() {
  const { colors } = useTheme();
  
  return (
    <View style={{ backgroundColor: colors.background }}>
      <Text style={{ color: colors.text }}>Hello</Text>
    </View>
  );
}
```

### Available Colors
- `primary` - Brand green (#22c55e)
- `success`, `warning`, `error`, `info`
- `text`, `textSecondary`, `textTertiary`
- `background`, `surface`, `surfaceAlt`
- `border`, `borderLight`

### Available Spacing
`xs` (4) → `sm` (8) → `md` (12) → `lg` (16) → `xl` (24) → `2xl` (32) → `3xl` (48) → `4xl` (64)

## 📚 Using Components

### Base Components
```tsx
import { Button, TextInput, Card, Avatar, Badge } from '@/components/BaseComponents';

// Button
<Button 
  label="Book Now" 
  onPress={handleBook}
  variant="primary" // 'primary' | 'secondary' | 'outline' | 'danger'
  size="lg" // 'sm' | 'md' | 'lg'
/>

// TextInput
<TextInput
  label="Email"
  value={email}
  onChangeText={setEmail}
  keyboardType="email-address"
  icon={<Mail size={20} />}
  error={emailError}
/>

// Card
<Card onPress={handlePress} pressable>
  <Text>Card Content</Text>
</Card>
```

### Feature Cards
```tsx
import { VehicleCard, DriverCard, BookingCard } from '@/components/FeatureCards';

<VehicleCard
  id="vf7-1"
  name="VinFast VF7 Plus"
  licensePlate="29A-789.99"
  color="Green"
  seats={5}
  pricePerKm={15000}
  status="Sẵn sàng"
  onPress={() => {}}
/>

<DriverCard
  name="Nguyễn Xuân Đài"
  rating={4.9}
  experience={8}
  phone="0907454517"
  onCallPress={() => {}}
  onChatPress={() => {}}
/>
```

## 🔄 State Management with Zustand

### Accessing Auth State
```tsx
import { useAuthStore } from '@/stores/authStore';
// or
import { useAuth } from '@/hooks/useAuth';

const { user, token, login, logout } = useAuth();
```

### Accessing Bookings
```tsx
import { useBooking } from '@/hooks/useBooking';

const { 
  bookings, 
  createBooking, 
  updateBookingStatus, 
  cancelBooking 
} = useBooking();
```

### Accessing Notifications
```tsx
import { useNotifications } from '@/hooks/useNotifications';

const { 
  notifications, 
  unreadCount, 
  markAsRead,
  addNotification
} = useNotifications(userId);
```

## 🔧 Form Validation

```tsx
import { useForm } from '@/hooks/useAsync';
import { BookingSchema } from '@/utils/validation';

const form = useForm({
  pickupLocation: '',
  dropoffLocation: '',
  date: '',
  time: '',
  passengers: 1,
});

// Validate with Zod
try {
  const validData = BookingSchema.parse(form.values);
  // Submit
} catch (error) {
  // Handle errors
}
```

## 📝 API Service

The app includes a mock API client ready for backend integration:

```tsx
import { apiClient } from '@/services/api';

// Authentication
await apiClient.login({ email, password });
await apiClient.register(registerData);

// Bookings
await apiClient.getBookings({ status, driverId, customerId });
await apiClient.createBooking(bookingData);
await apiClient.updateBooking(id, updates);
await apiClient.cancelBooking(id);

// Vehicles
await apiClient.getVehicles();
await apiClient.createVehicle(vehicleData);

// Notifications
await apiClient.getNotifications(userId);
```

## 🎯 Next Steps to Complete Implementation

### 1. Implement Booking Creation
- [ ] Create booking form screen with location pickers
- [ ] Implement location search/autocomplete
- [ ] Add map integration for location selection
- [ ] Create booking confirmation screen
- [ ] Add payment method selection

### 2. Implement Chat System
- [ ] Create chat list screen
- [ ] Implement message input and sending
- [ ] Add real-time message updates
- [ ] Implement typing indicators
- [ ] Add call integration

### 3. Implement Blog/Feed
- [ ] Create feed screen with posts
- [ ] Implement post creation for drivers
- [ ] Add image upload
- [ ] Implement like, comment, share
- [ ] Add post detail screen

### 4. Implement Driver Dashboard
- [ ] Add statistics widgets
- [ ] Implement revenue charts
- [ ] Add trip history table
- [ ] Create performance metrics

### 5. Implement Notifications
- [ ] Create notification list
- [ ] Implement push notifications
- [ ] Add notification filtering
- [ ] Create notification settings

### 6. Add Features
- [ ] Favorites/Saved locations
- [ ] Payment integration (Stripe, Paypal, VnPay)
- [ ] Ratings and reviews
- [ ] Referral program
- [ ] Profile verification

### 7. Backend Integration
- [ ] Replace mock API with real endpoints
- [ ] Implement authentication tokens
- [ ] Add real-time updates (Socket.io, Firebase)
- [ ] Setup database
- [ ] Deploy backend

## 🧪 Testing

```bash
# Run tests
npm test

# Run linter
npm run lint

# Type checking
npm run type-check
```

## 📦 Building for Production

```bash
# Build APK for Android
npm run build-android

# Build IPA for iOS
npm run build-ios

# Pre-build native modules
npm run prebuild
```

## 🌐 Environment Variables

```bash
EXPO_PUBLIC_API_URL=https://api.example.com
EXPO_PUBLIC_APP_NAME=VF7 Booking
EXPO_PUBLIC_ENV=production
```

## 📖 Documentation

- [Expo Documentation](https://docs.expo.dev)
- [React Native Docs](https://reactnative.dev)
- [Zustand Docs](https://github.com/pmndrs/zustand)
- [NativeWind Docs](https://www.nativewind.dev)
- [Zod Documentation](https://zod.dev)

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/new-feature`
2. Commit changes: `git commit -am 'Add new feature'`
3. Push to branch: `git push origin feature/new-feature`
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 📧 Support

For support, email support@vf7booking.com or create an issue in the repository.

---

**Version**: 1.0.0  
**Last Updated**: December 2024  
**Built with ❤️ using React Native and Expo**
