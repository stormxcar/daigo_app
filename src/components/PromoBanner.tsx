import React from 'react';
import { FlatList, Image, Text, View, TouchableOpacity } from 'react-native';
import Constants from 'expo-constants';
import { useTheme } from '@/theme';
import { spacing, borderRadius, fontSize } from '@/theme/tokens';
import { Card } from '@/components/BaseComponents';
import { IllustrationBlock } from '@/components/IllustrationBlocks';
import { Play, Sparkles } from 'lucide-react-native';
import { buildCloudinaryVideoPosterUrl } from '@/services/videoOptimizationService';

interface Promotion {
  id: string;
  image?: any;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  title: string;
  description: string;
  cta: string;
  onPress?: () => void;
}

function PromoVideoPreview({ uri }: { uri: string }) {
  const posterUri = buildCloudinaryVideoPosterUrl(uri, { width: 640 });
  if (Constants.appOwnership === 'expo') {
    return (
      <View style={{ width: '100%', height: 120, borderRadius: borderRadius.md, marginBottom: spacing.sm, overflow: 'hidden', backgroundColor: '#0f172a' }}>
        {!!posterUri && <Image source={{ uri: posterUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />}
        <VideoPlayOverlay />
      </View>
    );
  }

  return <NativePromoVideoPreview uri={uri} />;
}

function NativePromoVideoPreview({ uri }: { uri: string }) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { VideoView, useVideoPlayer } = require('expo-video');
  const player = useVideoPlayer(uri, (videoPlayer: any) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
  });

  return (
    <View style={{ width: '100%', height: 120, borderRadius: borderRadius.md, marginBottom: spacing.sm, overflow: 'hidden' }}>
      <VideoView
        player={player}
        style={{ width: '100%', height: '100%' }}
        contentFit="cover"
        nativeControls={false}
        fullscreenOptions={{ enable: false }}
      />
      <VideoPlayOverlay />
    </View>
  );
}

function VideoPlayOverlay() {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15,23,42,0.2)',
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.48)',
        }}
      >
        <Play size={18} color="white" fill="white" />
      </View>
    </View>
  );
}

export const PromoBanner: React.FC<{ promotions: Promotion[] }> = ({ promotions }) => {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: spacing.xl , paddingHorizontal: spacing.md}}>
      <Text style={{ fontSize: fontSize.base, fontWeight: '800', color: colors.text, marginBottom: spacing.md }}>
        Nổi bật hôm nay
      </Text>
      <FlatList
      data={promotions}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ gap: spacing.md }}
      renderItem={({ item }) => (
        <Card style={{ width: 278, padding: spacing.lg, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.primaryLight }}>
          {item.mediaType === 'video' && item.mediaUrl ? (
            <PromoVideoPreview uri={item.mediaUrl} />
          ) : item.image ? (
            <Image source={item.image} style={{ width: '100%', height: 120, borderRadius: borderRadius.md, marginBottom: spacing.sm }} />
          ) : (
            <View style={{ marginBottom: spacing.sm }}>
              <IllustrationBlock height={120} tone="primary" icon={<Sparkles size={24} color="white" />} />
            </View>
          )}
          <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: colors.text }}>{item.title}</Text>
          <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary, marginVertical: spacing.xs }}>{item.description}</Text>
          <TouchableOpacity onPress={item.onPress} style={{ marginTop: spacing.sm }}>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>{item.cta}</Text>
          </TouchableOpacity>
        </Card>
      )}
      />
    </View>
  );
};
