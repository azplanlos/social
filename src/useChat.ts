import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { ChatMessage, Conversation } from './datenformat/ChatMessage';

interface UseChatReturn {
  conversations: Conversation[];
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  activeConversation: Conversation | null;
  setActiveConversation: (conv: Conversation | null) => void;
  fetchConversations: () => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string, file?: File) => Promise<void>;
  startConversation: (participantName: string, initialMessage: string) => Promise<void>;
  totalUnreadCount: number;
}

export function useChat(token: string | null): UseChatReturn {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);

  const authHeaders = useCallback(() => ({
    'X-Requested-With': 'XMLHttpRequest',
    Authorization: 'Bearer ' + token,
  }), [token]);

  const fetchConversations = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await axios.get<Conversation[]>('/chat/conversations', {
        headers: authHeaders(),
        withCredentials: true,
      });
      setConversations(response.data);
      setError(null);
    } catch (err: any) {
      const detail = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Unbekannter Fehler';
      console.error('Chat-Fehler:', err?.response?.status, err?.response?.data);
      setError('Fehler beim Laden der Konversationen: ' + detail);
    } finally {
      setLoading(false);
    }
  }, [token, authHeaders]);

  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await axios.get<ChatMessage[]>(`/chat/conversations/${conversationId}/messages`, {
        headers: authHeaders(),
        withCredentials: true,
      });
      setMessages(response.data);
      setError(null);
    } catch (err) {
      setError('Fehler beim Laden der Nachrichten');
    } finally {
      setLoading(false);
    }
  }, [token, authHeaders]);

  const sendMessage = useCallback(async (conversationId: string, content: string, file?: File) => {
    if (!token) return;
    try {
      let response: { data: ChatMessage };
      if (file) {
        // Multipart-Upload mit Dateianhang
        const formData = new FormData();
        formData.append('file', file);
        formData.append('content', content);
        response = await axios.post<ChatMessage>(
          `/chat/conversations/${conversationId}/messages/file`,
          formData,
          {
            headers: {
              ...authHeaders(),
              'Content-Type': 'multipart/form-data',
            },
            withCredentials: true,
          }
        );
      } else {
        response = await axios.post<ChatMessage>(
          `/chat/conversations/${conversationId}/messages`,
          { content },
          { headers: authHeaders(), withCredentials: true }
        );
      }
      setMessages(prev => [...prev, response.data]);
      // Konversationsliste aktualisieren
      fetchConversations();
      setError(null);
    } catch (err) {
      setError('Fehler beim Senden der Nachricht');
    }
  }, [token, authHeaders, fetchConversations]);

  const startConversation = useCallback(async (participantName: string, initialMessage: string) => {
    if (!token) return;
    try {
      const response = await axios.post<Conversation>(
        '/chat/conversations',
        { participantName, message: initialMessage },
        { headers: authHeaders(), withCredentials: true }
      );
      setActiveConversation(response.data);
      await fetchConversations();
      await fetchMessages(response.data.id);
      setError(null);
    } catch (err) {
      setError('Fehler beim Starten der Konversation');
    }
  }, [token, authHeaders, fetchConversations, fetchMessages]);

  // Hintergrund-Polling ohne Loading-Indikator
  const pollConversations = useCallback(async () => {
    if (!token) return;
    try {
      const response = await axios.get<Conversation[]>('/chat/conversations', {
        headers: authHeaders(),
        withCredentials: true,
      });
      setConversations(response.data);
    } catch {
      // Polling-Fehler still ignorieren
    }
  }, [token, authHeaders]);

  const pollMessages = useCallback(async (conversationId: string) => {
    if (!token) return;
    try {
      const response = await axios.get<ChatMessage[]>(`/chat/conversations/${conversationId}/messages`, {
        headers: authHeaders(),
        withCredentials: true,
      });
      setMessages(response.data);
    } catch {
      // Polling-Fehler still ignorieren
    }
  }, [token, authHeaders]);

  const activeConversationRef = useRef<Conversation | null>(null);
  activeConversationRef.current = activeConversation;

  const totalUnreadCount = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  // Konversationen laden wenn Token verfügbar
  useEffect(() => {
    if (token) {
      fetchConversations();
    }
  }, [token, fetchConversations]);

  // Polling: Konversationsliste alle 5 Sekunden aktualisieren
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      pollConversations();
    }, 5000);
    return () => clearInterval(interval);
  }, [token, pollConversations]);

  // Polling: Nachrichten der aktiven Konversation alle 3 Sekunden aktualisieren
  useEffect(() => {
    if (!token || !activeConversation) return;
    const conversationId = activeConversation.id;
    const interval = setInterval(() => {
      pollMessages(conversationId);
    }, 3000);
    return () => clearInterval(interval);
  }, [token, activeConversation, pollMessages]);

  return {
    conversations,
    messages,
    loading,
    error,
    activeConversation,
    setActiveConversation,
    fetchConversations,
    fetchMessages,
    sendMessage,
    startConversation,
    totalUnreadCount,
  };
}
