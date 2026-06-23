import { create } from 'zustand';
import { BlogPost, BlogComment } from '@/types';

interface BlogStore {
  posts: BlogPost[];
  selectedPost: BlogPost | null;
  comments: BlogComment[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setPosts: (posts: BlogPost[]) => void;
  addPost: (post: BlogPost) => void;
  updatePost: (id: string, post: Partial<BlogPost>) => void;
  deletePost: (id: string) => void;
  selectPost: (post: BlogPost | null) => void;
  toggleLike: (postId: string, userId: string) => void;
  setComments: (comments: BlogComment[]) => void;
  addComment: (comment: BlogComment) => void;
  deleteComment: (commentId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useBlogStore = create<BlogStore>((set) => ({
  posts: [],
  selectedPost: null,
  comments: [],
  isLoading: false,
  error: null,

  setPosts: (posts) => set({ posts }),

  addPost: (post) => {
    set((state) => ({
      posts: [post, ...state.posts],
    }));
  },

  updatePost: (id, updates) => {
    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === id
          ? {
              ...p,
              ...updates,
              updatedAt: new Date().toISOString(),
            }
          : p
      ),
      selectedPost:
        state.selectedPost?.id === id
          ? {
              ...state.selectedPost,
              ...updates,
              updatedAt: new Date().toISOString(),
            }
          : state.selectedPost,
    }));
  },

  deletePost: (id) => {
    set((state) => ({
      posts: state.posts.filter((p) => p.id !== id),
      selectedPost:
        state.selectedPost?.id === id ? null : state.selectedPost,
    }));
  },

  selectPost: (post) => set({ selectedPost: post }),

  toggleLike: (postId, _userId) => {
    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId
          ? {
              ...p,
              liked: !p.liked,
              likes: p.liked ? p.likes - 1 : p.likes + 1,
            }
          : p
      ),
      selectedPost:
        state.selectedPost?.id === postId
          ? {
              ...state.selectedPost,
              liked: !state.selectedPost.liked,
              likes: state.selectedPost.liked
                ? state.selectedPost.likes - 1
                : state.selectedPost.likes + 1,
            }
          : state.selectedPost,
    }));
  },

  setComments: (comments) => set({ comments }),

  addComment: (comment) => {
    set((state) => ({
      comments: [...state.comments, comment],
    }));
  },

  deleteComment: (commentId) => {
    set((state) => ({
      comments: state.comments.filter((c) => c.id !== commentId),
    }));
  },

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
