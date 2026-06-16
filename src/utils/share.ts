import { Share } from 'react-native';
import { BlogPost } from '@/types';

export async function shareBlogPostNative(post: BlogPost) {
  const firstMedia = post.mediaUrls[0];
  const message = [
    post.caption,
    firstMedia ? `\n${firstMedia}` : '',
  ].join('').trim();

  return Share.share({
    title: 'Chia sẻ bài viết Daigo Booking',
    message,
    url: firstMedia,
  });
}
