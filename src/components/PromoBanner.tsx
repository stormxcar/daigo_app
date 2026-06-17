import React from 'react';
import { FlatList, Image, Text, View, TouchableOpacity } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useTheme } from '@/theme';
import { spacing, borderRadius, fontSize } from '@/theme/tokens';
import { Card } from '@/components/BaseComponents';
import { IllustrationBlock } from '@/components/IllustrationBlocks';
import { Play, Sparkles } from 'lucide-react-native';

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
  const player = useVideoPlayer(uri, (videoPlayer) => {
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
