export interface Notification {
  id: string;
  senderName: string;
  beitragTitel: string;
  beitragId: string;
  type?: 'beitrag' | 'chat' | 'story';
  storyId?: string;
  conversationId?: string;
  messagePreview?: string;
  createdAt: string;    // ISO-8601 UTC String vom Backend
  read: boolean;
}
