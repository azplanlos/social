package eu.strietwald.social.backend;

import java.time.Instant;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class NotificationService {

    private static final Logger logger = LoggerFactory.getLogger(NotificationService.class);

    private static final int MAX_BEITRAG_TITEL_LENGTH = 200;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private PersonRepository personRepository;

    /**
     * Erstellt Notifications für alle Empfänger eines neuen Beitrags.
     * Der Autor selbst erhält keine Notification.
     */
    @Async
    public void createNotifications(Beitrag beitrag, List<Person> recipients) {
        Person autor = beitrag.getAutor();
        String autorId = autor != null ? autor.getId() : null;
        String senderName = autor != null ? autor.getName() : "";
        String beitragTitel = truncate(beitrag.getTitel(), MAX_BEITRAG_TITEL_LENGTH);
        String beitragId = beitrag.getId();

        for (Person recipient : recipients) {
            // Autor aus Empfänger-Liste ausschließen
            if (recipient.getId() != null && recipient.getId().equals(autorId)) {
                continue;
            }

            try {
                Notification notification = new Notification();
                notification.setRecipientId(recipient.getId());
                notification.setSenderName(senderName);
                notification.setBeitragTitel(beitragTitel);
                notification.setBeitragId(beitragId);
                notification.setType("beitrag");
                notification.setCreatedAt(Instant.now());
                notification.setRead(false);

                notificationRepository.save(notification);
            } catch (Exception e) {
                logger.warn("Failed to create notification for recipient {}: {}",
                        recipient.getId(), e.getMessage());
            }
        }
    }

    /**
     * Erstellt eine Chat-Notification für den Empfänger einer neuen Nachricht.
     * Der Absender selbst erhält keine Notification.
     */
    @Async
    public void createChatNotification(String recipientId, String senderName,
                                       String conversationId, String messageContent) {
        try {
            Notification notification = new Notification();
            notification.setRecipientId(recipientId);
            notification.setSenderName(senderName);
            notification.setType("chat");
            notification.setConversationId(conversationId);
            notification.setMessagePreview(truncate(messageContent, MAX_BEITRAG_TITEL_LENGTH));
            notification.setCreatedAt(Instant.now());
            notification.setRead(false);

            notificationRepository.save(notification);
        } catch (Exception e) {
            logger.warn("Failed to create chat notification for recipient {}: {}",
                    recipientId, e.getMessage());
        }
    }

    private String truncate(String text, int maxLength) {
        if (text == null) {
            return "";
        }
        if (text.length() <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength);
    }
}
