import { create } from 'zustand';
import { ChatConversation, Message } from '@/types';

interface ChatStore {
  conversations: ChatConversation[];
  selectedConversation: ChatConversation | null;
  isLoading: boolean;
  error: string | null;
  typingUserId: string | null;

  // Actions
  setConversations: (conversations: ChatConversation[]) => void;
  selectConversation: (conversation: ChatConversation | null) => void;
  addMessage: (conversationId: string, message: Message) => void;
  removeMessage: (conversationId: string, messageId: string) => void;
  sendMessage: (
    conversationId: string,
    text: string,
    senderId: string
  ) => void;
  markConversationAsRead: (conversationId: string) => void;
  setTypingUser: (userId: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  getConversationById: (id: string) => ChatConversation | undefined;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: [],
  selectedConversation: null,
  isLoading: false,
  error: null,
  typingUserId: null,

  setConversations: (conversations) => set({ conversations }),

  selectConversation: (conversation) => set({ selectedConversation: conversation }),

  addMessage: (conversationId, message) => {
    const preview = message.mediaType === 'image' ? 'Đã gửi một ảnh' : message.text;
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === conversationId
          ? {
              ...conv,
              messages: [...conv.messages, message],
              lastMessage: preview,
              lastMessageTime: message.timestamp,
            }
          : conv
      ),
      selectedConversation:
        state.selectedConversation?.id === conversationId
          ? {
              ...state.selectedConversation,
              messages: [...state.selectedConversation.messages, message],
              lastMessage: preview,
              lastMessageTime: message.timestamp,
            }
          : state.selectedConversation,
    }));
  },

  removeMessage: (conversationId, messageId) => {
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === conversationId
          ? {
              ...conv,
              messages: conv.messages.filter((message) => message.id !== messageId),
            }
          : conv
      ),
      selectedConversation:
        state.selectedConversation?.id === conversationId
          ? {
              ...state.selectedConversation,
              messages: state.selectedConversation.messages.filter((message) => message.id !== messageId),
            }
          : state.selectedConversation,
    }));
  },

  sendMessage: (conversationId, text, senderId) => {
    const message: Message = {
      id: 'msg_' + Math.random().toString(36).substr(2, 9),
      sender: senderId === 'user' ? 'user' : 'driver',
      senderName: senderId === 'user' ? 'You' : 'Driver',
      text,
      timestamp: new Date().toISOString(),
      read: false,
    };

    get().addMessage(conversationId, message);
  },

  markConversationAsRead: (conversationId) => {
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === conversationId
          ? {
              ...conv,
              unreadCount: 0,
              messages: conv.messages.map((msg) => ({
                ...msg,
                read: true,
              })),
            }
          : conv
      ),
      selectedConversation:
        state.selectedConversation?.id === conversationId
          ? {
              ...state.selectedConversation,
              unreadCount: 0,
              messages: state.selectedConversation.messages.map((msg) => ({
                ...msg,
                read: true,
              })),
            }
          : state.selectedConversation,
    }));
  },

  setTypingUser: (userId) => set({ typingUserId: userId }),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  getConversationById: (id) => {
    return get().conversations.find((conv) => conv.id === id);
  },
}));
