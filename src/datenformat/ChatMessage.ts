export interface ChatMessage {
  id: string;
  conversationId: string;
  senderName: string;
  senderAvatarUrl?: string;
  content: string;
  timestamp: string; // ISO date string
  read: boolean;
}

export interface Conversation {
  id: string;
  participants: ConversationParticipant[];
  lastMessage?: ChatMessage;
  unreadCount: number;
  updatedAt: string; // ISO date string
}

export interface ConversationParticipant {
  name: string;
  avatarUrl?: string;
}
