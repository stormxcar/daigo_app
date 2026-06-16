import React, { useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Modal,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as ScreenOrientation from 'expo-screen-orientation';
import { ResizeMode, Video, AVPlaybackStatus, VideoFullscreenUpdate } from 'expo-av';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Pause,
  Play,
  Share2,
  Volume2,
  VolumeX,
  X,
  Maximize2,
} from 'lucide-react-native';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, spacing, shadows } from '@/theme/tokens';
import { showError, showInfo, showSuccess } from '@/utils/toast';

interface BlogMediaGridProps {
  urls: string[];
  types: ('image' | 'video')[];
  height?: number;
}

// ─── Custom Video Player ──────────────────────────────────────────────────────
function InlineVideo({ uri, onDownload }: { uri: string; onDownload: () => void }) {
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fadeControls = (visible: boolean) => {
    Animated.timing(controlsOpacity, {
      toValue: visible ? 1 : 0,
      duration: 280,
      useNativeDriver: true,
    }).start(() => setShowControls(visible));
  };

  const scheduleHide = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (isPlaying) fadeControls(false);
    }, 2800);
  };

  const handleTap = () => {
    if (showControls) {
      fadeControls(false);
    } else {
      fadeControls(true);
      scheduleHide();
    }
  };

  const togglePlay = async () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
      scheduleHide();
    }
  };

  const toggleMute = async () => {
    if (!videoRef.current) return;
    const next = !isMuted;
    setIsMuted(next);
    await videoRef.current.setIsMutedAsync(next);
  };

  const openFullscreen = async () => {
    if (!videoRef.current) return;
    try {
      fadeControls(true);
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => undefined);
      await videoRef.current.presentFullscreenPlayer();
    } catch (error: any) {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => undefined);
      showError('Không thể phóng to video', error.message || 'Thiết bị chưa hỗ trợ chế độ toàn màn hình.');
    }
  };

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setIsPlaying(status.isPlaying);
    setProgress(status.positionMillis ?? 0);
    setDuration(status.durationMillis ?? 0);
  };

  const progressPct = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={handleTap}
      style={styles.videoWrapper}
    >
      <Video
        ref={videoRef}
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        resizeMode={ResizeMode.COVER}
        isMuted={isMuted}
        shouldPlay={false}
        isLooping={false}
        onPlaybackStatusUpdate={onPlaybackStatusUpdate}
        onFullscreenUpdate={(event) => {
          if (event.fullscreenUpdate === VideoFullscreenUpdate.PLAYER_DID_DISMISS) {
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => undefined);
          }
        }}
      />

      {/* Gradient overlay */}
      <View style={styles.videoGradientTop} pointerEvents="none" />
      <View style={styles.videoGradientBottom} pointerEvents="none" />

      {/* Controls overlay */}
      <Animated.View style={[styles.videoControls, { opacity: controlsOpacity }]} pointerEvents={showControls ? 'auto' : 'none'}>
        {/* Top row: mute + download */}
        <View style={styles.videoTopRow}>
          <View style={styles.videoBadge}>
            <Play size={9} color="white" fill="white" />
            <Text style={styles.videoBadgeText}>VIDEO</Text>
          </View>
          <View style={styles.videoTopActions}>
            <TouchableOpacity onPress={openFullscreen} style={styles.videoIconBtn} activeOpacity={0.8}>
              <Maximize2 size={15} color="white" />
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleMute} style={styles.videoIconBtn} activeOpacity={0.8}>
              {isMuted
                ? <VolumeX size={15} color="white" />
                : <Volume2 size={15} color="white" />}
            </TouchableOpacity>
            <TouchableOpacity onPress={onDownload} style={styles.videoIconBtn} activeOpacity={0.8}>
              <Download size={15} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Center: play/pause */}
        <TouchableOpacity onPress={togglePlay} activeOpacity={0.85} style={styles.playBtnCenter}>
          <View style={styles.playBtnInner}>
            {isPlaying
              ? <Pause size={22} color="white" fill="white" />
              : <Play size={22} color="white" fill="white" />}
          </View>
        </TouchableOpacity>

        {/* Bottom: progress bar + time */}
        <View style={styles.videoBottomRow}>
          <Text style={styles.videoTime}>{formatTime(progress)}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct}%` as any }]} />
            <View style={[styles.progressThumb, { left: `${progressPct}%` as any }]} />
          </View>
          <Text style={styles.videoTime}>{formatTime(duration)}</Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Main Grid ────────────────────────────────────────────────────────────────
export function BlogMediaGrid({ urls, types, height = 260 }: BlogMediaGridProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const images = useMemo(
    () => urls.map((url, index) => ({ url, type: types[index] ?? 'image' as const })).filter((item) => item.type === 'image'),
    [urls, types]
  );

  if (urls.length === 0) return null;

  const openMedia = (index: number) => {
    if ((types[index] ?? 'image') === 'video') return; // video handled inline
    const imageIndex = images.findIndex((item) => item.url === urls[index]);
    setActiveIndex(Math.max(imageIndex, 0));
  };

  const activeImage = activeIndex !== null ? images[activeIndex] : null;
  const canPrev = activeIndex !== null && activeIndex > 0;
  const canNext = activeIndex !== null && activeIndex < images.length - 1;

  const handleShare = async (url: string) => {
    await Share.share({ message: url, url }).catch(() => undefined);
  };

  const saveRemoteMedia = async (url: string, mediaType: 'image' | 'video') => {
    try {
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        showError(
          mediaType === 'image' ? 'Chưa có quyền lưu ảnh' : 'Chưa có quyền lưu video',
          'Vui lòng cho phép ứng dụng truy cập thư viện media.'
        );
        return;
      }

      showInfo(
        mediaType === 'image' ? 'Đang tải ảnh' : 'Đang tải video',
        mediaType === 'image'
          ? 'Ảnh sẽ được lưu vào thư viện ảnh của thiết bị.'
          : 'Video sẽ được lưu vào thư viện media của thiết bị.'
      );
      const cleanUrl = url.split('?')[0];
      const ext = cleanUrl.split('.').pop()?.toLowerCase() || (mediaType === 'video' ? 'mp4' : 'jpg');
      const validImageExt = ['jpg', 'jpeg', 'png', 'webp'];
      const validVideoExt = ['mp4', 'mov', 'm4v'];
      const safeExt =
        mediaType === 'video'
          ? validVideoExt.includes(ext) ? ext : 'mp4'
          : validImageExt.includes(ext) ? ext : 'jpg';
      const filename = `daigo-${Date.now()}.${safeExt}`;
      const targetUri = `${FileSystem.cacheDirectory}${filename}`;
      const downloaded = await FileSystem.downloadAsync(url, targetUri);
      const asset = await MediaLibrary.createAssetAsync(downloaded.uri);
      const album = await MediaLibrary.getAlbumAsync('Daigo Booking');
      if (album) {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      } else {
        await MediaLibrary.createAlbumAsync('Daigo Booking', asset, false);
      }
      showSuccess(
        mediaType === 'image' ? 'Đã lưu ảnh' : 'Đã lưu video',
        mediaType === 'image'
          ? 'Ảnh đã được lưu vào thư viện ảnh trên thiết bị.'
          : 'Video đã được lưu vào thư viện media trên thiết bị.'
      );
    } catch (error: any) {
      const message = String(error.message || '');
      if (message.includes('Expo Go') || message.includes('media library')) {
        showError(
          'Cần development build',
          'Expo Go trên Android không còn cấp đủ quyền lưu media. Hãy cài APK/dev build mới để kiểm tra lưu ảnh/video thật.'
        );
        return;
      }
      showError(mediaType === 'image' ? 'Không thể tải ảnh' : 'Không thể tải video', message || 'Vui lòng thử lại sau.');
    }
  };

  const handleDownload = async (url: string) => saveRemoteMedia(url, 'image');
  const handleVideoDownload = async (url: string) => saveRemoteMedia(url, 'video');

  const tileStyle = (index: number) => {
    if (urls.length === 1) return { width: '100%' as const, height };
    if (urls.length === 2) return { width: '49%' as const, height };
    if (urls.length === 3) return { width: index === 0 ? '100%' as const : '49%' as const, height: index === 0 ? height * 0.58 : height * 0.4 };
    return { width: '49%' as const, height: height * 0.49 };
  };

  return (
    <>
      <View style={styles.grid}>
        {urls.slice(0, 4).map((url, index) => {
          const isVideo = (types[index] ?? 'image') === 'video';
          const moreCount = urls.length - 4;
          return (
            <TouchableOpacity
              key={`${url}-${index}`}
              activeOpacity={isVideo ? 1 : 0.9}
              onPress={() => !isVideo && openMedia(index)}
              style={[styles.tile, tileStyle(index), { backgroundColor: colors.surfaceAlt }]}
            >
              {isVideo ? (
                <InlineVideo uri={url} onDownload={() => handleVideoDownload(url)} />
              ) : (
                <Image source={{ uri: url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              )}
              {index === 3 && moreCount > 0 && (
                <View style={styles.moreOverlay}>
                  <Text style={styles.moreText}>+{moreCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Fullscreen image modal */}
      <Modal visible={activeIndex !== null} animationType="fade" transparent statusBarTranslucent onRequestClose={() => setActiveIndex(null)}>
        <View style={styles.modal}>
          <TouchableOpacity style={[styles.closeBtn, { top: 42 }]} onPress={() => setActiveIndex(null)}>
            <X size={24} color="white" />
          </TouchableOpacity>

          {activeImage && (
            <>
              <Image source={{ uri: activeImage.url }} style={{ width, height: width * 1.12 }} resizeMode="contain" />
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => handleDownload(activeImage.url)} style={styles.actionBtn}>
                  <Download size={20} color="white" />
                  <Text style={styles.actionText}>Tải ảnh</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleShare(activeImage.url)} style={styles.actionBtn}>
                  <Share2 size={20} color="white" />
                  <Text style={styles.actionText}>Chia sẻ</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {canPrev && (
            <TouchableOpacity style={[styles.navBtn, styles.prevBtn]} onPress={() => setActiveIndex((value) => Math.max((value ?? 1) - 1, 0))}>
              <ChevronLeft size={28} color="white" />
            </TouchableOpacity>
          )}
          {canNext && (
            <TouchableOpacity style={[styles.navBtn, styles.nextBtn]} onPress={() => setActiveIndex((value) => Math.min((value ?? 0) + 1, images.length - 1))}>
              <ChevronRight size={28} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tile: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  // ─ Custom video player ─
  videoWrapper: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  videoGradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 64,
    // Simulated gradient via opacity on black
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  videoGradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 72,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  videoControls: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: spacing.sm,
  },
  videoTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  videoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  videoBadgeText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  videoTopActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  videoIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.52)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  playBtnCenter: {
    alignSelf: 'center',
  },
  playBtnInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  videoTime: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
    minWidth: 32,
    textAlign: 'center',
  },
  progressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2,
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 2,
  },
  progressThumb: {
    position: 'absolute',
    top: -4,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: 'white',
    marginLeft: -5.5,
    ...shadows.sm,
  },
  // ─ More overlay ─
  moreOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.58)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: {
    color: 'white',
    fontSize: 28,
    fontWeight: '900',
  },
  // ─ Fullscreen image modal ─
  modal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    position: 'absolute',
    right: 18,
    zIndex: 5,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtn: {
    position: 'absolute',
    top: '48%',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prevBtn: { left: 12 },
  nextBtn: { right: 12 },
  actions: {
    position: 'absolute',
    bottom: 38,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.16)',
    ...shadows.md,
  },
  actionText: {
    color: 'white',
    fontWeight: '800',
    fontSize: fontSize.sm,
  },
});
