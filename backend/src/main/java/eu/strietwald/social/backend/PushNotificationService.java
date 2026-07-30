package eu.strietwald.social.backend;

import java.security.GeneralSecurityException;
import java.security.Security;
import java.util.List;

import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;

@Service
public class PushNotificationService {

    private static final Logger logger = LoggerFactory.getLogger(PushNotificationService.class);

    @Value("${vapid.public-key:}")
    private String vapidPublicKey;

    @Value("${vapid.private-key:}")
    private String vapidPrivateKey;

    @Value("${vapid.subject:mailto:admin@strietwald.eu}")
    private String vapidSubject;

    private PushService pushService;
    private boolean enabled = false;

    @PostConstruct
    public void init() {
        if (vapidPublicKey == null || vapidPublicKey.isBlank()
                || vapidPrivateKey == null || vapidPrivateKey.isBlank()) {
            logger.warn("VAPID keys not configured — push notifications are disabled.");
            return;
        }
        try {
            Security.addProvider(new BouncyCastleProvider());
            pushService = new PushService(vapidPublicKey, vapidPrivateKey, vapidSubject);
            enabled = true;
            logger.info("Push notification service initialized successfully.");
        } catch (GeneralSecurityException e) {
            logger.error("Failed to initialize push service: {}", e.getMessage());
        }
    }

    public boolean isEnabled() {
        return enabled;
    }

    /**
     * Sends a chat push notification to all subscriptions of the given person.
     * Message format: "senderName: messagePreview"
     */
    @Async
    public void sendChatNotification(Person recipient, String senderName, String messagePreview, String conversationId) {
        if (!enabled) {
            return;
        }
        if (recipient.getPushSubscriptions() == null || recipient.getPushSubscriptions().isEmpty()) {
            return;
        }
        String body = senderName + ": " + (messagePreview != null ? messagePreview : "");
        String payload = buildChatPayloadJson("Neue Nachricht", body, conversationId);

        for (PushSubscription sub : recipient.getPushSubscriptions()) {
            try {
                Notification notification = new Notification(
                    sub.getEndpoint(),
                    sub.getP256dh(),
                    sub.getAuth(),
                    payload.getBytes(),
                    86400 // TTL: 24 hours
                );

                org.apache.http.HttpResponse apacheResponse = pushService.send(notification);
                int statusCode = apacheResponse.getStatusLine().getStatusCode();

                if (statusCode == 201 || statusCode == 200) {
                    logger.debug("Chat push sent to {} at endpoint {}", recipient.getName(), sub.getEndpoint());
                } else if (statusCode == 410 || statusCode == 404) {
                    logger.info("Push subscription expired for {}, endpoint gone ({}): {}",
                            recipient.getName(), statusCode, sub.getEndpoint());
                } else {
                    String responseBody = apacheResponse.getEntity() != null
                            ? new String(apacheResponse.getEntity().getContent().readAllBytes())
                            : "";
                    logger.warn("Chat push to {} returned status {}: {}", recipient.getName(), statusCode, responseBody);
                }
            } catch (Exception e) {
                logger.error("Failed to send chat push to {} at endpoint {}: {}", recipient.getName(), sub.getEndpoint(), e.getMessage());
            }
        }
    }

    private String buildChatPayloadJson(String title, String body, String conversationId) {
        StringBuilder sb = new StringBuilder();
        sb.append("{\"title\":\"").append(escapeJson(title)).append("\"");
        sb.append(",\"body\":\"").append(escapeJson(body)).append("\"");
        if (conversationId != null && !conversationId.isEmpty()) {
            sb.append(",\"conversationId\":\"").append(escapeJson(conversationId)).append("\"");
        }
        sb.append(",\"type\":\"chat\"");
        sb.append("}");
        return sb.toString();
    }

    /**
     * Sends a push notification to all subscriptions of the given persons.
     * Message format: "autorName hat einen neuen Beitrag gepostet: titel"
     */
    @Async
    public void sendToPersons(List<Person> persons, String autorName, String titel, String bildUrl, String beitragId) {
        if (!enabled) {
            return;
        }
        for (Person person : persons) {
            if (person.getPushSubscriptions() == null || person.getPushSubscriptions().isEmpty()) {
                continue;
            }
            for (PushSubscription sub : person.getPushSubscriptions()) {
                sendSingleNotification(sub, person.getName(), autorName, titel, bildUrl, beitragId);
            }
        }
    }

    private void sendSingleNotification(PushSubscription sub, String recipientName,
            String autorName, String titel, String bildUrl, String beitragId) {
        try {
            String body = autorName + " hat einen neuen Beitrag gepostet: " + (titel != null ? titel : "");
            String payload = buildPayloadJson("Neuer Beitrag", body, bildUrl, beitragId);

            Notification notification = new Notification(
                sub.getEndpoint(),
                sub.getP256dh(),
                sub.getAuth(),
                payload.getBytes(),
                86400 // TTL: 24 hours
            );

            // Use the library to prepare the HTTP request (handles encryption + VAPID signing)
            // then extract headers and send via Java HttpClient for better FCM compatibility
            org.apache.http.HttpResponse apacheResponse = pushService.send(notification);
            int statusCode = apacheResponse.getStatusLine().getStatusCode();

            if (statusCode == 201 || statusCode == 200) {
                logger.debug("Push sent to {} at endpoint {}", recipientName, sub.getEndpoint());
            } else if (statusCode == 410 || statusCode == 404) {
                logger.info("Push subscription expired for {}, endpoint gone ({}): {}",
                        recipientName, statusCode, sub.getEndpoint());
            } else {
                String responseBody = apacheResponse.getEntity() != null
                        ? new String(apacheResponse.getEntity().getContent().readAllBytes())
                        : "";
                logger.warn("Push to {} returned status {}: {}", recipientName, statusCode, responseBody);
            }
        } catch (Exception e) {
            logger.error("Failed to send push to {} at endpoint {}: {}", recipientName, sub.getEndpoint(), e.getMessage());
        }
    }

    private String buildPayloadJson(String title, String body, String image, String beitragId) {
        StringBuilder sb = new StringBuilder();
        sb.append("{\"title\":\"").append(escapeJson(title)).append("\"");
        sb.append(",\"body\":\"").append(escapeJson(body)).append("\"");
        if (image != null && !image.isEmpty()) {
            sb.append(",\"image\":\"").append(escapeJson(image)).append("\"");
        }
        if (beitragId != null && !beitragId.isEmpty()) {
            sb.append(",\"beitragId\":\"").append(escapeJson(beitragId)).append("\"");
        }
        sb.append("}");
        return sb.toString();
    }

    private String escapeJson(String value) {
        return value.replace("\\", "\\\\")
                    .replace("\"", "\\\"")
                    .replace("\n", "\\n")
                    .replace("\r", "\\r")
                    .replace("\t", "\\t");
    }
}
