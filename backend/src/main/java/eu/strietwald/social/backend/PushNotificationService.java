package eu.strietwald.social.backend;

import java.security.GeneralSecurityException;
import java.security.Security;
import java.util.List;
import java.util.concurrent.ExecutionException;

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

    @Value("${vapid.public-key}")
    private String vapidPublicKey;

    @Value("${vapid.private-key}")
    private String vapidPrivateKey;

    @Value("${vapid.subject:mailto:admin@strietwald.eu}")
    private String vapidSubject;

    private PushService pushService;

    @PostConstruct
    public void init() throws GeneralSecurityException {
        Security.addProvider(new BouncyCastleProvider());
        pushService = new PushService(vapidPublicKey, vapidPrivateKey, vapidSubject);
    }

    /**
     * Sends a push notification to all subscriptions of the given persons.
     * Includes titel (title) and bild (image URL) in the payload.
     */
    @Async
    public void sendToPersons(List<Person> persons, String titel, String bildUrl) {
        for (Person person : persons) {
            if (person.getPushSubscriptions() == null || person.getPushSubscriptions().isEmpty()) {
                continue;
            }
            for (PushSubscription sub : person.getPushSubscriptions()) {
                try {
                    String payload = buildPayloadJson(titel, bildUrl);
                    Notification notification = new Notification(
                        sub.getEndpoint(),
                        sub.getP256dh(),
                        sub.getAuth(),
                        payload.getBytes()
                    );
                    pushService.send(notification);
                    logger.debug("Push sent to {} at endpoint {}", person.getName(), sub.getEndpoint());
                } catch (GeneralSecurityException | ExecutionException | InterruptedException e) {
                    logger.error("Failed to send push to {} at endpoint {}: {}", person.getName(), sub.getEndpoint(), e.getMessage());
                } catch (Exception e) {
                    logger.error("Unexpected error sending push to {}: {}", person.getName(), e.getMessage());
                }
            }
        }
    }

    private String buildPayloadJson(String title, String image) {
        StringBuilder sb = new StringBuilder();
        sb.append("{\"title\":\"").append(escapeJson(title != null ? title : "")).append("\"");
        if (image != null && !image.isEmpty()) {
            sb.append(",\"image\":\"").append(escapeJson(image)).append("\"");
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
