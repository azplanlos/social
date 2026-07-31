export interface ChatMessage {
  id: string;
  conversationId: string;
  senderName: string;
  senderAvatarUrl?: string;
  content: string;
  timestamp: string; // ISO date string
  read: boolean;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  duration?: number; // Dauer in Sekunden (für Sprachnachrichten)
  // Weitergeleiteter Beitrag
  forwardedBeitragId?: string;
  forwardedBeitragTitel?: string;
  forwardedBeitragLink?: string;
  forwardedBeitragAutor?: string;
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
