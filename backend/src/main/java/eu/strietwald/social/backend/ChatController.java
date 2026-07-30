package eu.strietwald.social.backend;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/chat")
public class ChatController {

    private static final Logger logger = LoggerFactory.getLogger(ChatController.class);

    @Autowired(required = false)
    private UserInfo userInfo;

    @Autowired
    private ConversationRepository conversationRepository;

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @Autowired
    private PersonRepository personRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private PushNotificationService pushNotificationService;

    /**
     * Alle Konversationen des aktuellen Benutzers laden.
     */
    @GetMapping("/conversations")
    public List<ConversationResponse> getConversations() {
        String currentUser = userInfo.getPerson().getName();
        logger.info("Loading conversations for user: {}", currentUser);
        List<Conversation> conversations = conversationRepository
                .findByParticipantNamesContainingOrderByUpdatedAtDesc(currentUser);

        return conversations.stream().map(conv -> {
            ConversationResponse response = new ConversationResponse();
            response.setId(conv.getId());
            response.setParticipants(conv.getParticipants().stream()
                    .filter(p -> !p.getName().equals(currentUser))
                    .map(p -> {
                        ConversationResponse.Participant participant = new ConversationResponse.Participant();
                        participant.setName(p.getName());
                        participant.setAvatarUrl(p.getAvatarUrl());
                        return participant;
                    })
                    .collect(Collectors.toList()));
            response.setLastMessage(conv.getLastMessage());
            response.setUpdatedAt(conv.getUpdatedAt() != null ? conv.getUpdatedAt().toString() : null);
            long unread = chatMessageRepository.countByConversationIdAndReadFalseAndSenderNameNot(
                    conv.getId(), currentUser);
            response.setUnreadCount(unread);
            return response;
        }).collect(Collectors.toList());
    }

    /**
     * Nachrichten einer Konversation laden.
     */
    @GetMapping("/conversations/{conversationId}/messages")
    public List<ChatMessage> getMessages(@PathVariable String conversationId) {
        String currentUser = userInfo.getPerson().getName();
        // Nachrichten als gelesen markieren
        chatMessageRepository.markAsReadByConversationIdAndSenderNameNot(conversationId, currentUser);
        return chatMessageRepository.findByConversationIdOrderByTimestampAsc(conversationId);
    }

    /**
     * Nachricht in einer bestehenden Konversation senden.
     */
    @PostMapping("/conversations/{conversationId}/messages")
    public ChatMessage sendMessage(@PathVariable String conversationId, @RequestBody Map<String, String> body) {
        String currentUser = userInfo.getPerson().getName();
        String avatarUrl = userInfo.getPerson().getAvatar_url();
        String content = body.get("content");

        ChatMessage message = new ChatMessage();
        message.setConversationId(conversationId);
        message.setSenderName(currentUser);
        message.setSenderAvatarUrl(avatarUrl);
        message.setContent(content);
        message.setTimestamp(Instant.now());
        message.setRead(false);

        ChatMessage saved = chatMessageRepository.save(message);

        // Konversation aktualisieren (lastMessage + updatedAt)
        conversationRepository.findById(conversationId).ifPresent(conv -> {
            conv.setLastMessage(saved);
            conv.setUpdatedAt(Instant.now());
            conversationRepository.save(conv);

            // Benachrichtigungen an alle anderen Teilnehmer senden
            notifyChatParticipants(conv, currentUser, content, conversationId);
        });

        return saved;
    }

    /**
     * Neue Konversation starten.
     */
    @PostMapping("/conversations")
    public ConversationResponse startConversation(@RequestBody Map<String, String> body) {
        String currentUser = userInfo.getPerson().getName();
        String currentAvatarUrl = userInfo.getPerson().getAvatar_url();
        String participantName = body.get("participantName");
        String messageContent = body.get("message");

        // Prüfen ob bereits eine Konversation existiert
        Optional<Conversation> existing = conversationRepository
                .findByBothParticipants(currentUser, participantName);

        Conversation conversation;
        if (existing.isPresent()) {
            conversation = existing.get();
        } else {
            // Teilnehmer-Infos laden
            Person participantPerson = personRepository.findByName(participantName);
            String participantAvatarUrl = participantPerson != null ? participantPerson.getAvatar_url() : null;

            conversation = new Conversation();
            conversation.getParticipantNames().add(currentUser);
            conversation.getParticipantNames().add(participantName);

            Conversation.ConversationParticipant me = new Conversation.ConversationParticipant();
            me.setName(currentUser);
            me.setAvatarUrl(currentAvatarUrl);
            conversation.getParticipants().add(me);

            Conversation.ConversationParticipant other = new Conversation.ConversationParticipant();
            other.setName(participantName);
            other.setAvatarUrl(participantAvatarUrl);
            conversation.getParticipants().add(other);

            conversation.setUpdatedAt(Instant.now());
            conversation = conversationRepository.save(conversation);
        }

        // Erste Nachricht senden
        ChatMessage message = new ChatMessage();
        message.setConversationId(conversation.getId());
        message.setSenderName(currentUser);
        message.setSenderAvatarUrl(currentAvatarUrl);
        message.setContent(messageContent);
        message.setTimestamp(Instant.now());
        message.setRead(false);

        ChatMessage savedMessage = chatMessageRepository.save(message);

        // Konversation aktualisieren
        conversation.setLastMessage(savedMessage);
        conversation.setUpdatedAt(Instant.now());
        conversationRepository.save(conversation);

        // Benachrichtigungen an den anderen Teilnehmer senden
        notifyChatParticipants(conversation, currentUser, messageContent, conversation.getId());

        // Response erstellen
        ConversationResponse response = new ConversationResponse();
        response.setId(conversation.getId());
        response.setParticipants(conversation.getParticipants().stream()
                .filter(p -> !p.getName().equals(currentUser))
                .map(p -> {
                    ConversationResponse.Participant participant = new ConversationResponse.Participant();
                    participant.setName(p.getName());
                    participant.setAvatarUrl(p.getAvatarUrl());
                    return participant;
                })
                .collect(Collectors.toList()));
        response.setLastMessage(savedMessage);
        response.setUpdatedAt(conversation.getUpdatedAt().toString());
        response.setUnreadCount(0);

        return response;
    }

    /**
     * Sendet In-App- und Push-Benachrichtigungen an alle Teilnehmer
     * einer Konversation (außer dem Absender).
     */
    private void notifyChatParticipants(Conversation conversation, String senderName,
                                         String messageContent, String conversationId) {
        for (String participantName : conversation.getParticipantNames()) {
            if (participantName.equals(senderName)) {
                continue;
            }
            Person recipient = personRepository.findByName(participantName);
            if (recipient == null || recipient.getId() == null) {
                continue;
            }
            // In-App Notification
            notificationService.createChatNotification(
                    recipient.getId(), senderName, conversationId, messageContent);
            // Push Notification
            pushNotificationService.sendChatNotification(
                    recipient, senderName, messageContent, conversationId);
        }
    }
}
