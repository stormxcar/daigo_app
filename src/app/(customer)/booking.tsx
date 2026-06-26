import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { BottomSheetModal, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import {
  Briefcase,
  Calendar,
  Car,
  ChevronDown,
  ChevronUp,
  Clock,
  Heart,
  Home,
  LocateFixed,
  MapPin,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Users,
} from "lucide-react-native";
import { useTheme } from "@/theme";
import { borderRadius, fontSize, spacing } from "@/theme/tokens";
import { Button, Card, TextInput } from "@/components/BaseComponents";
import { AuthRequired } from "@/components/AuthRequired";
import { Screen } from "@/components/ScreenComponents";
import { LocationAccessFallback } from "@/components/LocationAccessFallback";
import { useAuthStore } from "@/stores/authStore";
import { SavedLocation, Vehicle } from "@/types";
import { apiClient } from "@/services/api";
import {
  getDistanceKm,
  LocationSuggestion,
  searchVietnamLocations,
} from "@/services/locations";
import { DrivingRoute, getDrivingRoute } from "@/services/mapRouteService";
import { MapPreview } from "@/components/MapPreview";
import { LazyMount } from "@/components/LazyMount";
import { getCurrentDeviceLocation } from "@/services/deviceLocation";
import { TERMINAL_BOOKING_STATUSES } from "@/constants";
import {
  calculateBookingPrice,
  formatCurrency,
  vietnamDateToIsoDate,
} from "@/utils/helpers";
import { showError, showSuccess, showWarning } from "@/utils/toast";

type SortMode =
  | "price_asc"
  | "price_desc"
  | "seats_desc"
  | "seats_asc"
  | "brand_asc"
  | "name_asc";
type SavedLocationTarget = "pickup" | "dropoff";
type BookingMode = "instant" | "scheduled";

const quickTimes = ["07:00", "09:00", "12:00", "15:00", "18:00", "20:00"];
const sortOptions: { label: string; value: SortMode }[] = [
  { label: "Giá thấp", value: "price_asc" },
  { label: "Giá cao", value: "price_desc" },
  { label: "Nhiều chỗ", value: "seats_desc" },
  { label: "Ít chỗ", value: "seats_asc" },
  { label: "Hãng A-Z", value: "brand_asc" },
  { label: "Tên A-Z", value: "name_asc" },
];

const stringParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;
const numberParam = (value: string | string[] | undefined) => {
  const parsed = Number(stringParam(value));
  return Number.isFinite(parsed) ? parsed : null;
};
const pad2 = (value: number) => String(value).padStart(2, "0");
const toVietnamDateInput = (date: Date) =>
  `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
const toTimeInput = (date: Date) =>
  `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
const getInitialSchedule = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() + 30);
  date.setSeconds(0, 0);
  return date;
};

export default function BookingScreen() {
  const { colors } = useTheme();
  const { isAuthenticated, user } = useAuthStore();
  const routeParams = useLocalSearchParams<Record<string, string | string[]>>();
  const savedLocationsSheetRef = useRef<BottomSheetModal>(null);
  const vehicleResultsSheetRef = useRef<BottomSheetModal>(null);
  const modeSlideAnim = useRef(new Animated.Value(0)).current;
  const [pickupLocation, setPickupLocation] = useState("");
  const [dropoffLocation, setDropoffLocation] = useState("");
  const [bookingMode, setBookingMode] = useState<BookingMode>("instant");
  const [scheduleDate, setScheduleDate] = useState(getInitialSchedule);
  const [dateInput, setDateInput] = useState(() =>
    toVietnamDateInput(getInitialSchedule()),
  );
  const [time, setTime] = useState(() => toTimeInput(getInitialSchedule()));
  const [pickerMode, setPickerMode] = useState<"date" | "time" | null>(null);
  const [passengers, setPassengers] = useState("2");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minSeats, setMinSeats] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "Sẵn sàng" | "Đang bận" | "Bảo trì"
  >("all");
  const [note, setNote] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>("price_asc");
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    null,
  );
  const [searched, setSearched] = useState(false);
  const [vehiclesData, setVehiclesData] = useState<Vehicle[]>([]);
  const [bookedVehicleIds, setBookedVehicleIds] = useState<string[]>([]);
  const [scheduledAvailableVehicleIds, setScheduledAvailableVehicleIds] =
    useState<string[] | null>(null);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);
  const [visibleVehicleCount, setVisibleVehicleCount] = useState(8);
  const [pickupSuggestions, setPickupSuggestions] = useState<
    LocationSuggestion[]
  >([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState<
    LocationSuggestion[]
  >([]);
  const [pickupPoint, setPickupPoint] = useState<LocationSuggestion | null>(
    null,
  );
  const [dropoffPoint, setDropoffPoint] = useState<LocationSuggestion | null>(
    null,
  );
  const [locationLoading, setLocationLoading] = useState<
    "pickup" | "dropoff" | null
  >(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [locationAccessBlocked, setLocationAccessBlocked] = useState(false);
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [savedLocationsLoading, setSavedLocationsLoading] = useState(false);
  const [savedLocationsError, setSavedLocationsError] = useState<string | null>(
    null,
  );
  const [savedLocationTarget, setSavedLocationTarget] =
    useState<SavedLocationTarget>("pickup");
  const [savingLocation, setSavingLocation] = useState<
    "pickup" | "dropoff" | null
  >(null);
  const [route, setRoute] = useState<DrivingRoute | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [appliedMapSelectionKey, setAppliedMapSelectionKey] = useState("");
  const [appliedDestinationKey, setAppliedDestinationKey] = useState("");

  const passengerCount = Math.max(Number(passengers) || 1, 1);
  const bookingDate = vietnamDateToIsoDate(dateInput);
  const fallbackDistance = getDistanceKm(pickupPoint, dropoffPoint);
  const routeDistance = route?.distanceMeters
    ? Number((route.distanceMeters / 1000).toFixed(1))
    : fallbackDistance;

  const loadVehicles = () => {
    setIsLoadingVehicles(true);
    apiClient
      .getVehicles()
      .then(setVehiclesData)
      .catch((error) => showError("Không thể tải xe", error.message))
      .finally(() => setIsLoadingVehicles(false));
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  useEffect(() => {
    const destinationAddress = stringParam(routeParams.destinationAddress);
    const destinationName = stringParam(routeParams.destinationName);
    const destinationText = stringParam(routeParams.destinationText);
    const destinationPlaceId = stringParam(routeParams.destinationPlaceId);
    const destinationLat = numberParam(routeParams.destinationLat);
    const destinationLng = numberParam(routeParams.destinationLng);
    const destinationLabel =
      destinationAddress || destinationName || destinationText;
    const destinationKey = [
      destinationPlaceId,
      destinationLabel,
      stringParam(routeParams.destinationLat),
      stringParam(routeParams.destinationLng),
    ].join("|");

    if (!destinationLabel || destinationKey === appliedDestinationKey) return;

    setDropoffLocation(destinationLabel);
    setDropoffSuggestions([]);
    if (destinationLat !== null && destinationLng !== null) {
      setDropoffPoint({
        id: destinationPlaceId || "home-destination",
        label: destinationLabel,
        lat: destinationLat,
        lng: destinationLng,
        provider: "goong",
      });
    } else {
      setDropoffPoint(null);
      showWarning(
        "Cần chọn đúng địa điểm",
        "Vui lòng chọn điểm đến từ danh sách gợi ý để app lấy tọa độ trước khi tìm xe.",
      );
    }

    setRoute(null);
    setSearched(false);
    setSelectedVehicleId(null);
    setAppliedDestinationKey(destinationKey);
  }, [
    routeParams.destinationPlaceId,
    routeParams.destinationName,
    routeParams.destinationAddress,
    routeParams.destinationText,
    routeParams.destinationLat,
    routeParams.destinationLng,
    appliedDestinationKey,
  ]);

  useEffect(() => {
    const target = stringParam(routeParams.mapTarget);
    const mapLat = numberParam(routeParams.mapLat);
    const mapLng = numberParam(routeParams.mapLng);
    const mapAddress = stringParam(routeParams.mapAddress);
    const selectionKey = [
      target,
      stringParam(routeParams.mapLat),
      stringParam(routeParams.mapLng),
      mapAddress,
    ].join("|");

    if (
      !target ||
      !mapAddress ||
      mapLat === null ||
      mapLng === null ||
      selectionKey === appliedMapSelectionKey
    ) {
      return;
    }

    const restoredPickupLat = numberParam(routeParams.pickupLat);
    const restoredPickupLng = numberParam(routeParams.pickupLng);
    const restoredDropoffLat = numberParam(routeParams.dropoffLat);
    const restoredDropoffLng = numberParam(routeParams.dropoffLng);
    const restoredPickupLocation = stringParam(routeParams.pickupLocation);
    const restoredDropoffLocation = stringParam(routeParams.dropoffLocation);
    const restoredDateInput = stringParam(routeParams.dateInput);
    const restoredTime = stringParam(routeParams.time);
    const restoredPassengers = stringParam(routeParams.passengers);
    const restoredNote = stringParam(routeParams.note);
    const restoredBookingMode = stringParam(routeParams.bookingMode);

    if (restoredBookingMode === "scheduled" || restoredBookingMode === "instant") {
      changeBookingMode(restoredBookingMode);
    }

    if (restoredDateInput || restoredTime) {
      const [day, month, year] = (restoredDateInput || dateInput)
        .split("/")
        .map(Number);
      const [hour, minute] = (restoredTime || time).split(":").map(Number);
      if (
        day &&
        month &&
        year &&
        Number.isFinite(hour) &&
        Number.isFinite(minute)
      ) {
        const restoredSchedule = new Date(
          year,
          month - 1,
          day,
          hour,
          minute,
          0,
          0,
        );
        applySchedule(restoredSchedule, { silent: true });
      }
    }
    if (restoredPassengers) setPassengers(restoredPassengers);
    if (restoredNote !== undefined) setNote(restoredNote);

    if (target === "pickup") {
      setPickupPoint({
        id: "map-pickup",
        label: mapAddress,
        lat: mapLat,
        lng: mapLng,
        provider: "goong",
      });
      setPickupLocation(mapAddress);
      setPickupSuggestions([]);

      if (restoredDropoffLocation) setDropoffLocation(restoredDropoffLocation);
      if (
        restoredDropoffLocation &&
        restoredDropoffLat !== null &&
        restoredDropoffLng !== null
      ) {
        setDropoffPoint({
          id: "restored-dropoff",
          label: restoredDropoffLocation,
          lat: restoredDropoffLat,
          lng: restoredDropoffLng,
        });
      }
    }

    if (target === "dropoff") {
      setDropoffPoint({
        id: "map-dropoff",
        label: mapAddress,
        lat: mapLat,
        lng: mapLng,
        provider: "goong",
      });
      setDropoffLocation(mapAddress);
      setDropoffSuggestions([]);

      if (restoredPickupLocation) setPickupLocation(restoredPickupLocation);
      if (
        restoredPickupLocation &&
        restoredPickupLat !== null &&
        restoredPickupLng !== null
      ) {
        setPickupPoint({
          id: "restored-pickup",
          label: restoredPickupLocation,
          lat: restoredPickupLat,
          lng: restoredPickupLng,
        });
      }
    }

    setRoute(null);
    setSearched(false);
    setSelectedVehicleId(null);
    setAppliedMapSelectionKey(selectionKey);
  }, [
    appliedMapSelectionKey,
    dateInput,
    routeParams.dateInput,
    routeParams.dropoffLat,
    routeParams.dropoffLng,
    routeParams.dropoffLocation,
    routeParams.bookingMode,
    routeParams.mapAddress,
    routeParams.mapLat,
    routeParams.mapLng,
    routeParams.mapTarget,
    routeParams.note,
    routeParams.passengers,
    routeParams.pickupLat,
    routeParams.pickupLng,
    routeParams.pickupLocation,
    routeParams.time,
    time,
  ]);

  useEffect(() => {
    if (!user?.id) return;
    setSavedLocationsLoading(true);
    setSavedLocationsError(null);
    apiClient
      .getSavedLocations(user.id)
      .then(setSavedLocations)
      .catch((error) => {
        setSavedLocations([]);
        setSavedLocationsError(
          error.message || "Không thể tải địa điểm đã lưu.",
        );
      })
      .finally(() => setSavedLocationsLoading(false));
  }, [user?.id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (
        pickupLocation.trim().length < 3 ||
        pickupPoint?.label === pickupLocation
      ) {
        setPickupSuggestions([]);
        return;
      }
      setLocationLoading("pickup");
      searchVietnamLocations(pickupLocation)
        .then(setPickupSuggestions)
        .catch(() => setPickupSuggestions([]))
        .finally(() => setLocationLoading(null));
    }, 450);

    return () => clearTimeout(timer);
  }, [pickupLocation, pickupPoint?.label]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (
        dropoffLocation.trim().length < 3 ||
        dropoffPoint?.label === dropoffLocation
      ) {
        setDropoffSuggestions([]);
        return;
      }
      setLocationLoading("dropoff");
      searchVietnamLocations(dropoffLocation)
        .then(setDropoffSuggestions)
        .catch(() => setDropoffSuggestions([]))
        .finally(() => setLocationLoading(null));
    }, 450);

    return () => clearTimeout(timer);
  }, [dropoffLocation, dropoffPoint?.label]);

  const vehicleAvailability = useCallback(
    (vehicle: Vehicle) => {
      if (vehicle.status !== "Sẵn sàng") return false;
      return !bookedVehicleIds.includes(vehicle.id);
    },
    [bookedVehicleIds],
  );

  const vehicles = useMemo(() => {
    const priceLimit = Number(maxPrice) || Infinity;
    const priceMin = Number(minPrice) || 0;
    const seatsMin = Number(minSeats) || passengerCount;

    return vehiclesData
      .filter((vehicle) => vehicle.seats >= passengerCount)
      .filter((vehicle) => vehicle.seats >= seatsMin)
      .filter(
        (vehicle) =>
          vehicle.pricePerKm >= priceMin && vehicle.pricePerKm <= priceLimit,
      )
      .filter(
        (vehicle) => brandFilter === "all" || vehicle.brand === brandFilter,
      )
      .filter(
        (vehicle) => statusFilter === "all" || vehicle.status === statusFilter,
      )
      .filter(
        (vehicle) =>
          bookingMode !== "scheduled" ||
          scheduledAvailableVehicleIds === null ||
          scheduledAvailableVehicleIds.includes(vehicle.id),
      )
      .filter((vehicle) => !onlyAvailable || vehicleAvailability(vehicle))
      .sort((a, b) => {
        if (sortMode === "price_desc") return b.pricePerKm - a.pricePerKm;
        if (sortMode === "seats_desc") return b.seats - a.seats;
        if (sortMode === "seats_asc") return a.seats - b.seats;
        if (sortMode === "brand_asc") return a.brand.localeCompare(b.brand);
        if (sortMode === "name_asc") return a.name.localeCompare(b.name);
        return a.pricePerKm - b.pricePerKm;
      });
  }, [
    vehiclesData,
    passengerCount,
    minSeats,
    minPrice,
    maxPrice,
    brandFilter,
    bookingMode,
    statusFilter,
    onlyAvailable,
    scheduledAvailableVehicleIds,
    sortMode,
    vehicleAvailability,
  ]);

  const brandOptions = useMemo(
    () =>
      Array.from(
        new Set(vehiclesData.map((vehicle) => vehicle.brand).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b)),
    [vehiclesData],
  );

  const vehicleResultsSnapPoints = useMemo(() => ["42%", "78%"], []);

  const estimatePickupMinutes = useCallback(
    (vehicle: Vehicle, index: number) => {
      if (!vehicleAvailability(vehicle)) return null;
      const base = routeDistance ? Math.min(12, Math.max(4, Math.round(routeDistance * 0.45))) : 6;
      return Math.min(25, base + index * 2);
    },
    [routeDistance, vehicleAvailability],
  );
  const activeFilterCount = [
    minPrice,
    maxPrice,
    minSeats,
    brandFilter !== "all" ? brandFilter : "",
    statusFilter !== "all" ? statusFilter : "",
    onlyAvailable ? "available" : "",
    sortMode !== "price_asc" ? sortMode : "",
  ].filter(Boolean).length;

  const applySchedule = (nextDate: Date, options?: { silent?: boolean }) => {
    const normalized = new Date(nextDate);
    normalized.setSeconds(0, 0);
    if (normalized.getTime() < Date.now() - 60 * 1000) {
      if (!options?.silent)
        showError(
          "Thời gian chưa hợp lệ",
          "Vui lòng chọn thời điểm trong tương lai.",
        );
      return false;
    }

    setScheduleDate(normalized);
    setDateInput(toVietnamDateInput(normalized));
    setTime(toTimeInput(normalized));
    setRoute(null);
    setSearched(false);
    setSelectedVehicleId(null);
    return true;
  };

  const changeBookingMode = (mode: BookingMode) => {
    setBookingMode(mode);
    setRoute(null);
    setSearched(false);
    setSelectedVehicleId(null);
    setScheduledAvailableVehicleIds(null);
    Animated.spring(modeSlideAnim, {
      toValue: mode === "instant" ? 0 : 1,
      useNativeDriver: false,
      tension: 140,
      friction: 10,
    }).start();
  };

  const getScheduledWindow = (routeOverride?: DrivingRoute | null) => {
    if (!bookingDate) return null;
    const [year, month, day] = bookingDate.split("-").map(Number);
    const [hour, minute] = time.split(":").map(Number);
    if (![year, month, day, hour, minute].every(Number.isFinite)) return null;

    const pickupAt = new Date(year, month - 1, day, hour, minute, 0, 0);
    const nextRoute = routeOverride ?? route;
    const durationMinutes = nextRoute?.durationSeconds
      ? Math.max(30, Math.ceil(nextRoute.durationSeconds / 60))
      : Math.max(45, Math.round(((routeDistance || 8) / 40) * 60));
    const bufferBeforeMinutes = 15;
    const bufferAfterMinutes = 15;
    const startAt = new Date(pickupAt.getTime() - bufferBeforeMinutes * 60 * 1000);
    const endAt = new Date(pickupAt.getTime() + (durationMinutes + bufferAfterMinutes) * 60 * 1000);
    const responseDeadlineAt = new Date(
      Math.min(
        Date.now() + 30 * 60 * 1000,
        pickupAt.getTime() - 30 * 60 * 1000,
      ),
    );

    return {
      pickupAt,
      startAt,
      endAt,
      responseDeadlineAt,
      durationMinutes,
      bufferBeforeMinutes,
      bufferAfterMinutes,
    };
  };

  const handleScheduleChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    const mode = pickerMode;
    setPickerMode(null);
    if (event.type === "dismissed" || !selectedDate || !mode) return;

    const nextDate = new Date(scheduleDate);
    if (mode === "date") {
      nextDate.setFullYear(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
      );
    } else {
      nextDate.setHours(
        selectedDate.getHours(),
        selectedDate.getMinutes(),
        0,
        0,
      );
    }
    applySchedule(nextDate);
  };

  const handleSearch = async () => {
    if (!pickupPoint || !dropoffPoint || !dateInput || !time || !passengers) {
      showError(
        "Thiếu thông tin",
        "Vui lòng nhập điểm đón, điểm đến, ngày, giờ và số người.",
      );
      return;
    }

    if (!bookingDate) {
      showError("Ngày chưa hợp lệ", "Vui lòng nhập theo định dạng dd/MM/yyyy.");
      return;
    }

    try {
      setRouteLoading(true);
      const goongRoute = await getDrivingRoute(
        { latitude: pickupPoint.lat, longitude: pickupPoint.lng },
        { latitude: dropoffPoint.lat, longitude: dropoffPoint.lng },
      );
      setRoute(goongRoute);
      if (bookingMode === "scheduled") {
        const window = getScheduledWindow(goongRoute);
        if (!window || window.pickupAt.getTime() <= Date.now() + 45 * 60 * 1000) {
          showError("Thời gian đặt trước chưa hợp lệ", "Vui lòng chọn thời điểm cách hiện tại ít nhất 45 phút.");
          return;
        }
        const availableDrivers = await apiClient.findAvailableScheduledDrivers({
          startAt: window.startAt.toISOString(),
          endAt: window.endAt.toISOString(),
          pickupLat: pickupPoint.lat,
          pickupLng: pickupPoint.lng,
        });
        setScheduledAvailableVehicleIds(availableDrivers.map((item) => item.vehicleId));
        setBookedVehicleIds([]);
      } else {
        const bookings = await apiClient.getBookings({
          date: bookingDate,
          time,
        });
        setBookedVehicleIds(
          bookings
            .filter(
              (booking) => booking.date === bookingDate && booking.time === time,
            )
            .filter(
              (booking) =>
                !TERMINAL_BOOKING_STATUSES.includes(booking.status as any),
            )
            .map((booking) => booking.vehicleId),
        );
        setScheduledAvailableVehicleIds(null);
      }
    } catch {
      setRoute(null);
      setBookedVehicleIds([]);
      setScheduledAvailableVehicleIds(null);
      showWarning(
        "Chưa tải được lộ trình Goong",
        "App sẽ tạm dùng khoảng cách ước tính để lọc xe.",
      );
    } finally {
      setRouteLoading(false);
    }

    setSearched(true);
    const suggestedVehicleId = stringParam(routeParams.suggestedVehicleId);
    const suggestedVehicle = suggestedVehicleId
      ? vehicles.find((vehicle) => vehicle.id === suggestedVehicleId)
      : null;
    setSelectedVehicleId(suggestedVehicle?.id ?? vehicles[0]?.id ?? null);
    setVisibleVehicleCount(8);
    requestAnimationFrame(() => vehicleResultsSheetRef.current?.present());
    showSuccess(
      "Đã tìm xe phù hợp",
      `${vehicles.length} xe khớp với thông tin chuyến đi.`,
    );
  };

  const resetBookingForm = () => {
    const nextSchedule = getInitialSchedule();
    setPickupLocation("");
    setDropoffLocation("");
    setPickupPoint(null);
    setDropoffPoint(null);
    setPickupSuggestions([]);
    setDropoffSuggestions([]);
    setScheduleDate(nextSchedule);
    setDateInput(toVietnamDateInput(nextSchedule));
    setTime(toTimeInput(nextSchedule));
    setPassengers("2");
    setBookingMode("instant");
    modeSlideAnim.setValue(0);
    setNote("");
    setMinPrice("");
    setMaxPrice("");
    setMinSeats("");
    setBrandFilter("all");
    setStatusFilter("all");
    setOnlyAvailable(true);
    setSortMode("price_asc");
    setFiltersExpanded(false);
    setRoute(null);
    setBookedVehicleIds([]);
    setScheduledAvailableVehicleIds(null);
    setSelectedVehicleId(null);
    setSearched(false);
    setVisibleVehicleCount(8);
    vehicleResultsSheetRef.current?.dismiss();
    showSuccess("Đã làm mới", "Bạn có thể nhập lại thông tin chuyến đi.");
  };

  const handleUseCurrentLocation = async () => {
    try {
      setGpsLoading(true);
      const location = await getCurrentDeviceLocation();
      const point = {
        id: "current-location",
        label: location.label,
        lat: location.lat,
        lng: location.lng,
      };
      setPickupPoint(point);
      setPickupLocation(point.label);
      setPickupSuggestions([]);
      setLocationAccessBlocked(false);
    } catch (error: any) {
      setLocationAccessBlocked(true);
      showError("Không thể lấy vị trí", error.message);
    } finally {
      setGpsLoading(false);
    }
  };

  const applyManualPickupLocation = (place: { name: string; address: string; placeId: string; latitude?: number; longitude?: number }) => {
    if (typeof place.latitude !== "number" || typeof place.longitude !== "number") {
      showError("Địa điểm thiếu tọa độ", "Vui lòng chọn một gợi ý hợp lệ từ danh sách.");
      return;
    }
    const point = {
      id: place.placeId,
      label: place.address || place.name,
      lat: place.latitude,
      lng: place.longitude,
      provider: "goong" as const,
    };
    setPickupPoint(point);
    setPickupLocation(point.label);
    setPickupSuggestions([]);
    setLocationAccessBlocked(false);
  };

  const applySavedLocation = (
    location: SavedLocation,
    target: "pickup" | "dropoff",
  ) => {
    if (typeof location.lat !== "number" || typeof location.lng !== "number") {
      showError(
        "Địa điểm thiếu tọa độ",
        "Vui lòng tìm lại địa điểm này trên bản đồ trước khi sử dụng.",
      );
      return;
    }
    const point = {
      id: location.id,
      label: location.address,
      lat: location.lat,
      lng: location.lng,
    };
    if (target === "pickup") {
      setPickupPoint(point);
      setPickupLocation(location.address);
      setPickupSuggestions([]);
    } else {
      setDropoffPoint(point);
      setDropoffLocation(location.address);
      setDropoffSuggestions([]);
    }
    setRoute(null);
    setSearched(false);
    setSelectedVehicleId(null);
  };

  const openSavedLocations = (target: SavedLocationTarget) => {
    setSavedLocationTarget(target);
    savedLocationsSheetRef.current?.present();
  };

  const selectSavedLocation = (location: SavedLocation) => {
    applySavedLocation(location, savedLocationTarget);
    savedLocationsSheetRef.current?.dismiss();
  };

  const savedLocationIcon = (type: SavedLocation["type"]) => {
    if (type === "home") return <Home size={20} color={colors.primary} />;
    if (type === "work") return <Briefcase size={20} color={colors.primary} />;
    if (type === "favorite") return <Heart size={20} color={colors.primary} />;
    return <MapPin size={20} color={colors.primary} />;
  };

  const openMapPicker = (target: "pickup" | "dropoff") => {
    const initialPoint = target === "pickup" ? pickupPoint : dropoffPoint;
    const initialLabel = target === "pickup" ? pickupLocation : dropoffLocation;

    router.push({
      pathname: "/(customer)/map-picker" as any,
      params: {
        target,
        initialLat: initialPoint ? String(initialPoint.lat) : "",
        initialLng: initialPoint ? String(initialPoint.lng) : "",
        initialLabel: initialLabel || "",
        pickupLocation,
        dropoffLocation,
        dateInput,
        time,
        bookingMode,
        passengers,
        note,
        pickupLat: pickupPoint ? String(pickupPoint.lat) : "",
        pickupLng: pickupPoint ? String(pickupPoint.lng) : "",
        dropoffLat: dropoffPoint ? String(dropoffPoint.lat) : "",
        dropoffLng: dropoffPoint ? String(dropoffPoint.lng) : "",
      },
    });
  };

  const saveLocation = async (target: "pickup" | "dropoff") => {
    if (!user) return;
    const point = target === "pickup" ? pickupPoint : dropoffPoint;
    const address = target === "pickup" ? pickupLocation : dropoffLocation;
    if (!point || !address.trim()) {
      showError(
        "Chưa có địa điểm",
        "Vui lòng chọn địa điểm hợp lệ trước khi lưu.",
      );
      return;
    }

    try {
      setSavingLocation(target);
      const created = await apiClient.createSavedLocation({
        userId: user.id,
        label: target === "pickup" ? "Điểm đón hay đi" : "Điểm đến hay đi",
        address,
        lat: point.lat,
        lng: point.lng,
        type: "favorite",
      });
      setSavedLocations((current) => [created, ...current]);
      showSuccess(
        "Đã lưu địa điểm",
        "Bạn có thể chọn nhanh địa điểm này ở lần đặt xe sau.",
      );
    } catch (error: any) {
      showError("Không thể lưu địa điểm", error.message);
    } finally {
      setSavingLocation(null);
    }
  };

  const openBookingDetailWithVehicle = (vehicle: Vehicle) => {
    if (!bookingDate) {
      showError("Ngày chưa hợp lệ", "Vui lòng nhập theo định dạng dd/MM/yyyy.");
      return;
    }
    if (!pickupPoint || !dropoffPoint) {
      showError("Thiếu tọa độ", "Vui lòng chọn điểm đón và điểm đến hợp lệ.");
      return;
    }
    const priceQuote = calculateBookingPrice(
      routeDistance || 1,
      vehicle.pricePerKm,
      passengerCount,
      time,
    );
    setSelectedVehicleId(vehicle.id);
    vehicleResultsSheetRef.current?.dismiss();
    const scheduledWindow = bookingMode === "scheduled" ? getScheduledWindow() : null;
    router.push({
      pathname: "/(customer)/booking-detail" as any,
      params: {
        vehicleId: vehicle.id,
        pickupLocation,
        dropoffLocation,
        date: bookingDate,
        time,
        bookingMode,
        scheduledStartAt: scheduledWindow?.startAt.toISOString() ?? "",
        scheduledEndAt: scheduledWindow?.endAt.toISOString() ?? "",
        scheduledResponseDeadlineAt: scheduledWindow?.responseDeadlineAt.toISOString() ?? "",
        estimatedDurationMinutes: String(scheduledWindow?.durationMinutes ?? 90),
        bufferBeforeMinutes: String(scheduledWindow?.bufferBeforeMinutes ?? 15),
        bufferAfterMinutes: String(scheduledWindow?.bufferAfterMinutes ?? 15),
        passengers: String(passengerCount),
        note,
        pickupLat: String(pickupPoint.lat),
        pickupLng: String(pickupPoint.lng),
        dropoffLat: String(dropoffPoint.lat),
        dropoffLng: String(dropoffPoint.lng),
        distance: String(routeDistance),
        estimatedPrice: String(priceQuote.totalPrice),
        routeDuration: route?.duration ?? "",
      },
    });
  };

  if (!isAuthenticated) {
    return (
      <AuthRequired description="Bạn cần đăng nhập để đặt xe và xem lịch sử chuyến đi." />
    );
  }

  if (!user?.phoneVerified) {
    return (
      <AuthRequired
        title="Xác minh số điện thoại"
        description="Bạn cần xác minh SĐT bằng OTP trước khi đặt xe hoặc lưu địa điểm."
        actionLabel="Xác minh SĐT"
        onActionPress={() =>
          router.push({
            pathname: "/(auth)/phone-otp" as any,
            params: { redirectTo: "/(customer)/booking" },
          })
        }
      />
    );
  }

  if (locationAccessBlocked && !pickupPoint) {
    return (
      <LocationAccessFallback
        description="Daigo cần vị trí để lấy điểm đón chính xác và tính lộ trình đặt xe. Nếu bạn chưa muốn bật GPS, hãy nhập vị trí hiện tại để tiếp tục đặt xe."
        onSelectLocation={applyManualPickupLocation}
        onRetryGps={handleUseCurrentLocation}
      />
    );
  }

  return (
    <Screen scroll refreshing={isLoadingVehicles} onRefresh={loadVehicles}>
      <Card style={{ marginBottom: spacing.lg }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: spacing.md,
            marginBottom: spacing.md,
          }}
        >
          <Text
            style={{
              color: colors.text,
              fontSize: 18,
              fontWeight: "700",
            }}
          >
            Tìm chuyến đi
          </Text>
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={resetBookingForm}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.xs,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderRadius: borderRadius.full,
              backgroundColor: colors.surfaceAlt,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <RotateCcw size={15} color={colors.primary} />
            <Text
              style={{
                color: colors.primary,
                fontSize: fontSize.sm,
                fontWeight: "800",
              }}
            >
              Làm mới
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={{
            position: "relative",
            flexDirection: "row",
            padding: 3,
            borderRadius: borderRadius.full,
            backgroundColor: colors.surfaceAlt,
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: spacing.md,
            overflow: "hidden",
          }}
        >
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 3,
              bottom: 3,
              left: modeSlideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "50%"],
              }),
              width: "50%",
              borderRadius: borderRadius.full,
              backgroundColor: colors.primary,
            }}
          />
          {([
            { value: "instant", label: "Đi ngay" },
            { value: "scheduled", label: "Đặt trước" },
          ] as const).map((item) => {
            const selected = bookingMode === item.value;
            return (
              <TouchableOpacity
                key={item.value}
                activeOpacity={0.86}
                onPress={() => changeBookingMode(item.value)}
                style={{
                  flex: 1,
                  alignItems: "center",
                  paddingVertical: spacing.sm,
                  zIndex: 1,
                }}
              >
                <Text
                  style={{
                    color: selected ? "white" : colors.textSecondary,
                    fontWeight: "900",
                    fontSize: fontSize.sm,
                  }}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TextInput
          label="Điểm đón"
          placeholder="Nhập địa chỉ đón"
          value={pickupLocation}
          onChangeText={(text) => {
            setPickupLocation(text);
            setPickupPoint(null);
          }}
          icon={<MapPin size={20} color={colors.primary} />}
          style={{ marginBottom: spacing.md }}
        />
        <Button
          label="Địa điểm đã lưu"
          onPress={() => openSavedLocations("pickup")}
          variant="secondary"
          size="sm"
          icon={<Heart size={16} color={colors.primary} />}
          style={{ marginBottom: spacing.md }}
        />
        <Button
          label="Dùng vị trí hiện tại"
          onPress={handleUseCurrentLocation}
          loading={gpsLoading}
          variant="outline"
          size="sm"
          icon={<LocateFixed size={16} color={colors.primary} />}
          style={{ marginBottom: spacing.sm }}
        />
        <Button
          label="Chọn điểm đón trên bản đồ"
          onPress={() => openMapPicker("pickup")}
          variant="secondary"
          size="sm"
          icon={<MapPin size={16} color={colors.primary} />}
          style={{ marginBottom: spacing.md }}
        />
        {pickupPoint && (
          <Button
            label="Lưu điểm đón này"
            onPress={() => saveLocation("pickup")}
            loading={savingLocation === "pickup"}
            variant="secondary"
            size="sm"
            style={{ marginBottom: spacing.md }}
          />
        )}
        {locationLoading === "pickup" && (
          <ActivityIndicator
            color={colors.primary}
            style={{ marginBottom: spacing.sm }}
          />
        )}
        {pickupSuggestions.map((item) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => {
              setPickupPoint(item);
              setPickupLocation(item.label);
              setPickupSuggestions([]);
            }}
            style={{
              paddingVertical: spacing.sm,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Text
              numberOfLines={2}
              style={{ color: colors.text, fontSize: fontSize.sm }}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
        <TextInput
          label="Điểm đến"
          placeholder="Nhập địa chỉ đến"
          value={dropoffLocation}
          onChangeText={(text) => {
            setDropoffLocation(text);
            setDropoffPoint(null);
          }}
          icon={<MapPin size={20} color={colors.error} />}
          style={{ marginBottom: spacing.md }}
        />
        <Button
          label="Chọn điểm đến trên bản đồ"
          onPress={() => openMapPicker("dropoff")}
          variant="secondary"
          size="sm"
          icon={<MapPin size={16} color={colors.error} />}
          style={{ marginBottom: spacing.md }}
        />
        <Button
          label="Địa điểm đã lưu"
          onPress={() => openSavedLocations("dropoff")}
          variant="secondary"
          size="sm"
          icon={<Heart size={16} color={colors.error} />}
          style={{ marginBottom: spacing.md }}
        />
        {dropoffPoint && (
          <Button
            label="Lưu điểm đến này"
            onPress={() => saveLocation("dropoff")}
            loading={savingLocation === "dropoff"}
            variant="secondary"
            size="sm"
            style={{ marginBottom: spacing.md }}
          />
        )}
        {locationLoading === "dropoff" && (
          <ActivityIndicator
            color={colors.primary}
            style={{ marginBottom: spacing.sm }}
          />
        )}
        {dropoffSuggestions.map((item) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => {
              setDropoffPoint(item);
              setDropoffLocation(item.label);
              setDropoffSuggestions([]);
            }}
            style={{
              paddingVertical: spacing.sm,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Text
              numberOfLines={2}
              style={{ color: colors.text, fontSize: fontSize.sm }}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}

        {pickupPoint && dropoffPoint && (
          <View style={{ marginBottom: spacing.lg }}>
            <LazyMount minHeight={260} label="Đang tải bản đồ chọn điểm...">
              <MapPreview
                pickup={{
                  label: pickupLocation,
                  lat: pickupPoint.lat,
                  lng: pickupPoint.lng,
                }}
                dropoff={{
                  label: dropoffLocation,
                  lat: dropoffPoint.lat,
                  lng: dropoffPoint.lng,
                }}
                selectable
                onPickupChange={(point) => {
                  setPickupPoint({
                    id: "map-pickup",
                    label: point.label,
                    lat: point.lat,
                    lng: point.lng,
                  });
                  setPickupLocation(point.label);
                  setPickupSuggestions([]);
                }}
                onDropoffChange={(point) => {
                  setDropoffPoint({
                    id: "map-dropoff",
                    label: point.label,
                    lat: point.lat,
                    lng: point.lng,
                  });
                  setDropoffLocation(point.label);
                  setDropoffSuggestions([]);
                }}
              />
            </LazyMount>
          </View>
        )}

        {bookingMode === "scheduled" && (
          <>
            <View
              style={{
                flexDirection: "row",
                gap: spacing.md,
                marginBottom: spacing.md,
              }}
            >
              <TouchableOpacity
                activeOpacity={0.82}
                onPress={() => setPickerMode("date")}
                style={{
                  flex: 1,
                  padding: spacing.md,
                  borderRadius: borderRadius.lg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing.sm,
                    marginBottom: spacing.xs,
                  }}
                >
                  <Calendar size={18} color={colors.textSecondary} />
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: fontSize.xs,
                      fontWeight: "700",
                    }}
                  >
                    Ngày
                  </Text>
                </View>
                <Text style={{ color: colors.text, fontWeight: "900" }}>
                  {dateInput}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.82}
                onPress={() => setPickerMode("time")}
                style={{
                  flex: 1,
                  padding: spacing.md,
                  borderRadius: borderRadius.lg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing.sm,
                    marginBottom: spacing.xs,
                  }}
                >
                  <Clock size={18} color={colors.textSecondary} />
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: fontSize.xs,
                      fontWeight: "700",
                    }}
                  >
                    Giờ
                  </Text>
                </View>
                <Text style={{ color: colors.text, fontWeight: "900" }}>
                  {time}
                </Text>
              </TouchableOpacity>
            </View>
            <Text
              style={{
                color: colors.primary,
                fontWeight: "800",
                fontSize: fontSize.sm,
                marginBottom: spacing.md,
              }}
            >
              Bạn đang đặt chuyến lúc {time}, ngày {dateInput}
            </Text>
          </>
        )}
        {bookingMode === "scheduled" && pickerMode && (
          <DateTimePicker
            value={scheduleDate}
            mode={pickerMode}
            display="default"
            minimumDate={new Date()}
            is24Hour
            onChange={handleScheduleChange}
          />
        )}

        <TextInput
          label="Ghi chú cho tài xế"
          placeholder="Ví dụ: đón ở cổng chính, có hành lý, đi cùng trẻ nhỏ..."
          value={note}
          onChangeText={setNote}
          multiline
          numberOfLines={3}
          style={{ marginBottom: spacing.md }}
        />

        <TextInput
          label="Số người"
          placeholder="2"
          value={passengers}
          onChangeText={setPassengers}
          keyboardType="numeric"
          icon={<Users size={18} color={colors.textSecondary} />}
          style={{ marginBottom: spacing.md }}
        />

        <TouchableOpacity
          onPress={() => setFiltersExpanded((value) => !value)}
          activeOpacity={0.84}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            padding: spacing.md,
            borderRadius: borderRadius.lg,
            backgroundColor: colors.surfaceAlt,
            marginBottom: spacing.md,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.sm,
            }}
          >
            <SlidersHorizontal size={18} color={colors.primary} />
            <Text style={{ color: colors.text, fontWeight: "900" }}>
              Bộ lọc và sắp xếp
            </Text>
            {activeFilterCount > 0 && (
              <View
                style={{
                  minWidth: 22,
                  height: 22,
                  borderRadius: borderRadius.full,
                  backgroundColor: colors.primary,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: "white",
                    fontSize: fontSize.xs,
                    fontWeight: "900",
                  }}
                >
                  {activeFilterCount}
                </Text>
              </View>
            )}
          </View>
          {filtersExpanded ? (
            <ChevronUp size={18} color={colors.text} />
          ) : (
            <ChevronDown size={18} color={colors.text} />
          )}
        </TouchableOpacity>

        {filtersExpanded ? (
          <View style={{ marginBottom: spacing.lg }}>
            <View style={{ flexDirection: "row", gap: spacing.md }}>
              <TextInput
                label="Giá từ/km"
                placeholder="10000"
                value={minPrice}
                onChangeText={setMinPrice}
                keyboardType="numeric"
                style={{ flex: 1, marginBottom: spacing.md }}
              />
              <TextInput
                label="Giá đến/km"
                placeholder="20000"
                value={maxPrice}
                onChangeText={setMaxPrice}
                keyboardType="numeric"
                style={{ flex: 1, marginBottom: spacing.md }}
              />
            </View>
            <TextInput
              label="Số ghế tối thiểu"
              placeholder="4"
              value={minSeats}
              onChangeText={setMinSeats}
              keyboardType="numeric"
              style={{ marginBottom: spacing.md }}
            />

            <Text
              style={{
                color: colors.text,
                fontWeight: "800",
                marginBottom: spacing.sm,
              }}
            >
              Trạng thái xe
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: spacing.sm,
                marginBottom: spacing.md,
              }}
            >
              {(["all", "Sẵn sàng", "Đang bận", "Bảo trì"] as const).map(
                (status) => (
                  <TouchableOpacity
                    key={status}
                    onPress={() => setStatusFilter(status)}
                    style={{
                      paddingVertical: spacing.sm,
                      paddingHorizontal: spacing.md,
                      borderRadius: borderRadius.full,
                      backgroundColor:
                        statusFilter === status
                          ? colors.primary
                          : colors.surfaceAlt,
                    }}
                  >
                    <Text
                      style={{
                        color: statusFilter === status ? "white" : colors.text,
                        fontWeight: "700",
                        fontSize: fontSize.sm,
                      }}
                    >
                      {status === "all" ? "Tất cả" : status}
                    </Text>
                  </TouchableOpacity>
                ),
              )}
            </View>

            <Text
              style={{
                color: colors.text,
                fontWeight: "800",
                marginBottom: spacing.sm,
              }}
            >
              Hãng xe
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: spacing.sm,
                marginBottom: spacing.md,
              }}
            >
              {["all", ...brandOptions].map((brand) => (
                <TouchableOpacity
                  key={brand}
                  onPress={() => setBrandFilter(brand)}
                  style={{
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.md,
                    borderRadius: borderRadius.full,
                    backgroundColor:
                      brandFilter === brand
                        ? colors.primary
                        : colors.surfaceAlt,
                  }}
                >
                  <Text
                    style={{
                      color: brandFilter === brand ? "white" : colors.text,
                      fontWeight: "700",
                      fontSize: fontSize.sm,
                    }}
                  >
                    {brand === "all" ? "Tất cả hãng" : brand}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text
              style={{
                color: colors.text,
                fontWeight: "800",
                marginBottom: spacing.sm,
              }}
            >
              Sắp xếp
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: spacing.sm,
                marginBottom: spacing.md,
              }}
            >
              {sortOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => setSortMode(option.value)}
                  style={{
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.md,
                    borderRadius: borderRadius.full,
                    backgroundColor:
                      sortMode === option.value
                        ? colors.primary
                        : colors.surfaceAlt,
                  }}
                >
                  <Text
                    style={{
                      color: sortMode === option.value ? "white" : colors.text,
                      fontWeight: "700",
                      fontSize: fontSize.sm,
                    }}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <TouchableOpacity
                onPress={() => setOnlyAvailable((value) => !value)}
                style={{
                  flex: 1,
                  paddingVertical: spacing.md,
                  paddingHorizontal: spacing.md,
                  borderRadius: borderRadius.lg,
                  alignItems: "center",
                  backgroundColor: onlyAvailable
                    ? colors.primary
                    : colors.surfaceAlt,
                }}
              >
                <Text
                  style={{
                    color: onlyAvailable ? "white" : colors.text,
                    fontWeight: "800",
                  }}
                >
                  Xe trống đúng giờ
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setMinPrice("");
                  setMaxPrice("");
                  setMinSeats("");
                  setBrandFilter("all");
                  setStatusFilter("all");
                  setOnlyAvailable(true);
                  setSortMode("price_asc");
                }}
                style={{
                  paddingVertical: spacing.md,
                  paddingHorizontal: spacing.md,
                  borderRadius: borderRadius.lg,
                  alignItems: "center",
                  backgroundColor: colors.surfaceAlt,
                }}
              >
                <Text style={{ color: colors.text, fontWeight: "800" }}>
                  Đặt lại
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: spacing.sm,
              marginBottom: spacing.lg,
            }}
          >
            <TouchableOpacity
              onPress={() => setOnlyAvailable((value) => !value)}
              style={{
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.md,
                borderRadius: borderRadius.full,
                backgroundColor: onlyAvailable
                  ? colors.primary
                  : colors.surfaceAlt,
              }}
            >
              <Text
                style={{
                  color: onlyAvailable ? "white" : colors.text,
                  fontWeight: "600",
                }}
              >
                Xe trống đúng giờ
              </Text>
            </TouchableOpacity>
            {sortOptions.slice(0, 3).map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => setSortMode(option.value)}
                style={{
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.md,
                  borderRadius: borderRadius.full,
                  backgroundColor:
                    sortMode === option.value
                      ? colors.primary
                      : colors.surfaceAlt,
                }}
              >
                <Text
                  style={{
                    color: sortMode === option.value ? "white" : colors.text,
                    fontWeight: "600",
                  }}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Button
          label={routeLoading ? "Đang tải lộ trình Goong" : "Tìm xe phù hợp"}
          onPress={handleSearch}
          loading={isLoadingVehicles || routeLoading}
          icon={<Search size={20} color="white" />}
        />
      </Card>

      {searched && (
        <TouchableOpacity
          activeOpacity={0.86}
          onPress={() => vehicleResultsSheetRef.current?.present()}
          style={{
            marginBottom: spacing.xl,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: colors.border,
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.md,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.surfaceAlt,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Car size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: "900" }}>
              {vehicles.length} xe phù hợp
            </Text>
            <Text
              numberOfLines={1}
              style={{
                color: colors.textSecondary,
                fontSize: fontSize.sm,
                marginTop: spacing.xs,
              }}
            >
              {dateInput} lúc {time}
              {routeDistance ? ` - ${routeDistance} km` : ""}
            </Text>
          </View>
          <Text style={{ color: colors.primary, fontWeight: "900" }}>
            Xem
          </Text>
        </TouchableOpacity>
      )}

      <BottomSheetModal
        ref={vehicleResultsSheetRef}
        snapPoints={vehicleResultsSnapPoints}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
      >
        <BottomSheetScrollView
          contentContainerStyle={{
            paddingTop: spacing.md,
            paddingBottom: spacing.xl,
          }}
        >
          <View
            style={{
              paddingHorizontal: spacing.lg,
              paddingBottom: spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Text
              style={{
                color: colors.text,
                fontSize: 20,
                fontWeight: "900",
              }}
            >
              Xe phù hợp
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: fontSize.sm,
                marginTop: spacing.xs,
                lineHeight: 20,
              }}
            >
              {vehicles.length} xe khớp ngày {dateInput}, giờ {time}
              {routeDistance ? `, lộ trình khoảng ${routeDistance} km` : ""}
              {route?.duration ? `, ${route.duration}` : ""}.
            </Text>
          </View>

          {vehicles.length === 0 ? (
            <View
              style={{
                padding: spacing.lg,
                alignItems: "center",
                gap: spacing.sm,
              }}
            >
              <Car size={28} color={colors.textSecondary} />
              <Text style={{ color: colors.text, fontWeight: "900" }}>
                Chưa có xe phù hợp
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  textAlign: "center",
                  lineHeight: 21,
                }}
              >
                Hãy đổi thời gian, số người hoặc bộ lọc để tìm thêm lựa chọn.
              </Text>
            </View>
          ) : (
            vehicles.slice(0, visibleVehicleCount).map((vehicle, index) => {
              const selected = selectedVehicleId === vehicle.id;
              const pickupMinutes = estimatePickupMinutes(vehicle, index);
              const priceQuote = calculateBookingPrice(
                routeDistance || 1,
                vehicle.pricePerKm,
                passengerCount,
                time,
              );

              return (
                <TouchableOpacity
                  key={vehicle.id}
                  activeOpacity={0.86}
                  onPress={() => openBookingDetailWithVehicle(vehicle)}
                  style={{
                    paddingHorizontal: spacing.lg,
                    paddingVertical: spacing.md,
                    backgroundColor: colors.surface,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                    borderLeftWidth: selected ? 4 : 0,
                    borderLeftColor: colors.primary,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: spacing.md,
                    }}
                  >
                    {vehicle.image ? (
                      <Image
                        source={{ uri: vehicle.image }}
                        style={{
                          width: 66,
                          height: 52,
                          borderRadius: borderRadius.md,
                          backgroundColor: colors.surfaceAlt,
                        }}
                      />
                    ) : (
                      <View
                        style={{
                          width: 66,
                          height: 52,
                          borderRadius: borderRadius.md,
                          backgroundColor: colors.surfaceAlt,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Car size={26} color={colors.primary} />
                      </View>
                    )}

                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        numberOfLines={1}
                        style={{
                          color: colors.text,
                          fontSize: 16,
                          fontWeight: "900",
                        }}
                      >
                        {vehicle.name}
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: spacing.sm,
                          marginTop: spacing.xs,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Users size={13} color={colors.textSecondary} />
                          <Text
                            style={{
                              color: colors.textSecondary,
                              fontSize: fontSize.xs,
                              fontWeight: "700",
                            }}
                          >
                            {vehicle.seats} chỗ
                          </Text>
                        </View>
                        <Text
                          numberOfLines={1}
                          style={{
                            flex: 1,
                            color: pickupMinutes ? colors.success : colors.warning,
                            fontSize: fontSize.xs,
                            fontWeight: "800",
                          }}
                        >
                          {pickupMinutes
                            ? `Có thể đón trong ${pickupMinutes} phút`
                            : "Không trống giờ này"}
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={{
                        color: colors.primary,
                        fontSize: 15,
                        fontWeight: "900",
                      }}
                    >
                      {formatCurrency(priceQuote.totalPrice)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          {vehicles.length > visibleVehicleCount && (
            <View style={{ padding: spacing.lg }}>
              <Button
                label="Tải thêm xe"
                onPress={() => setVisibleVehicleCount((current) => current + 8)}
                variant="outline"
              />
            </View>
          )}
        </BottomSheetScrollView>
      </BottomSheetModal>

      <BottomSheetModal
        ref={savedLocationsSheetRef}
        snapPoints={["48%", "76%"]}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
      >
        <BottomSheetScrollView
          contentContainerStyle={{
            padding: spacing.lg,
            paddingBottom: spacing.xl,
          }}
        >
          <Text
            style={{
              color: colors.text,
              fontSize: 20,
              fontWeight: "900",
              marginBottom: spacing.xs,
            }}
          >
            Địa điểm đã lưu
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              lineHeight: 21,
              marginBottom: spacing.lg,
            }}
          >
            Chọn một địa điểm để điền vào{" "}
            {savedLocationTarget === "pickup" ? "điểm đón" : "điểm đến"}.
          </Text>

          {!user?.id ? (
            <View
              style={{
                padding: spacing.lg,
                borderRadius: borderRadius.lg,
                backgroundColor: colors.surfaceAlt,
              }}
            >
              <Text
                style={{
                  color: colors.text,
                  fontWeight: "900",
                  marginBottom: spacing.xs,
                }}
              >
                Bạn cần đăng nhập
              </Text>
              <Text style={{ color: colors.textSecondary }}>
                Đăng nhập để xem địa điểm đã lưu của bạn.
              </Text>
            </View>
          ) : savedLocationsLoading ? (
            <View
              style={{
                padding: spacing.lg,
                borderRadius: borderRadius.lg,
                backgroundColor: colors.surfaceAlt,
                flexDirection: "row",
                gap: spacing.md,
                alignItems: "center",
              }}
            >
              <ActivityIndicator color={colors.primary} />
              <Text style={{ color: colors.textSecondary }}>
                Đang tải địa điểm đã lưu...
              </Text>
            </View>
          ) : savedLocationsError ? (
            <View
              style={{
                padding: spacing.lg,
                borderRadius: borderRadius.lg,
                backgroundColor: colors.surfaceAlt,
              }}
            >
              <Text
                style={{
                  color: colors.error,
                  fontWeight: "900",
                  marginBottom: spacing.xs,
                }}
              >
                Không thể tải địa điểm
              </Text>
              <Text style={{ color: colors.textSecondary }}>
                {savedLocationsError}
              </Text>
            </View>
          ) : savedLocations.length === 0 ? (
            <View
              style={{
                padding: spacing.lg,
                borderRadius: borderRadius.lg,
                backgroundColor: colors.surfaceAlt,
              }}
            >
              <Text
                style={{
                  color: colors.text,
                  fontWeight: "900",
                  marginBottom: spacing.xs,
                }}
              >
                Chưa có địa điểm đã lưu
              </Text>
              <Text style={{ color: colors.textSecondary, lineHeight: 21 }}>
                Sau khi chọn điểm đón hoặc điểm đến, bạn có thể lưu lại để dùng
                nhanh ở lần sau.
              </Text>
            </View>
          ) : (
            <View style={{ gap: spacing.md }}>
              {savedLocations.map((location) => (
                <TouchableOpacity
                  key={location.id}
                  activeOpacity={0.82}
                  onPress={() => selectSavedLocation(location)}
                  style={{
                    flexDirection: "row",
                    gap: spacing.md,
                    padding: spacing.md,
                    borderRadius: borderRadius.lg,
                    backgroundColor: colors.surfaceAlt,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 21,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: colors.surface,
                    }}
                  >
                    {savedLocationIcon(location.type)}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: "900" }}>
                      {location.label}
                    </Text>
                    <Text
                      numberOfLines={2}
                      style={{
                        color: colors.textSecondary,
                        fontSize: fontSize.sm,
                        marginTop: spacing.xs,
                      }}
                    >
                      {location.address}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </BottomSheetScrollView>
      </BottomSheetModal>
    </Screen>
  );
}
