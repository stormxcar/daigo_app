import React from 'react';
import { FlatList, Image, ImageBackground, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme';
import { spacing, fontSize, borderRadius } from '@/theme/tokens';
import { IllustrationBlock } from '@/components/IllustrationBlocks';
import { Play, Sparkles } from 'lucide-react-native';
import { buildCloudinaryVideoPosterUrl, buildOptimizedCloudinaryImageUrl } from '@/services/videoOptimizationService';

interface Promotion {
  id: string;
  image?: any;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  title: string;
  description: string;
  cta?: string;
  onPress?: () => void;
}

function PromoVideoBackground({ uri }: { uri: string }) {
  const posterUri = buildCloudinaryVideoPosterUrl(uri, { width: 640 });
  return (
    <View style={StyleSheet.absoluteFill}>
      {!!posterUri && <Image source={{ uri: posterUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />}
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
        backgroundColor: 'rgba(15,23,42,0.12)',
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
      removeClippedSubviews
      initialNumToRender={3}
      maxToRenderPerBatch={4}
      windowSize={5}
      renderItem={({ item }) => (
        <TouchableOpacity
          activeOpacity={0.86}
          onPress={item.onPress}
          style={{
            width: 278,
            height: 222,
            overflow: 'hidden',
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceAlt,
            borderRadius: borderRadius['xl']
          }}
        >
          {item.mediaType === 'video' && item.mediaUrl ? (
            <PromoVideoBackground uri={item.mediaUrl} />
          ) : item.image ? (
            <ImageBackground
              source={
                typeof item.image?.uri === 'string'
                  ? { uri: buildOptimizedCloudinaryImageUrl(item.image.uri, { width: 720 }) }
                  : item.image
              }
              resizeMode="cover"
              style={{ width: '100%', height: '100%' }}
            />
          ) : (
            <View style={StyleSheet.absoluteFill}>
              <IllustrationBlock height={120} tone="primary" icon={<Sparkles size={24} color="white" />} />
            </View>
          )}
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.22)' }]} />
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              padding: spacing.lg,
              paddingTop: spacing['2xl'],
              backgroundColor: 'rgba(0,0,0,0.5)',
            }}
          >
            <Text numberOfLines={2} style={{ fontSize: fontSize.base, fontWeight: '900', color: 'white', lineHeight: 22 }}>
              {item.title}
            </Text>
            <Text numberOfLines={2} style={{ fontSize: fontSize.sm, color: 'rgba(255,255,255,0.86)', marginTop: spacing.xs, lineHeight: 19 }}>
              {item.description}
            </Text>
          </View>
        </TouchableOpacity>
      )}
      />
    </View>
  );
};
