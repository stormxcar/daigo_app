import { useCallback, useMemo, useRef, useState } from 'react';
import { ViewToken } from 'react-native';
import { BlogPost } from '@/types';

export function useVideoFeedPlayback(posts: BlogPost[]) {
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 68,
    minimumViewTime: 180,
  }).current;

  const videoPostIds = useMemo(
    () => posts.filter((post) => post.mediaTypes?.includes('video')).map((post) => post.id),
    [posts]
  );

  const activeVideoIndex = activePostId ? videoPostIds.indexOf(activePostId) : -1;
  const preloadPostId = activeVideoIndex >= 0 ? videoPostIds[activeVideoIndex + 1] ?? null : videoPostIds[0] ?? null;

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const centeredVideo = viewableItems
      .filter((item) => item.isViewable)
      .map((item) => item.item as BlogPost)
      .find((post) => post.mediaTypes?.includes('video'));
    setActivePostId(centeredVideo?.id ?? null);
  }).current;

  const isVideoActive = useCallback((postId: string) => activePostId === postId, [activePostId]);
  const shouldPreloadVideo = useCallback((postId: string) => preloadPostId === postId, [preloadPostId]);

  return {
    activePostId,
    preloadPostId,
    isVideoActive,
    shouldPreloadVideo,
    viewabilityConfig,
    onViewableItemsChanged,
  };
}
