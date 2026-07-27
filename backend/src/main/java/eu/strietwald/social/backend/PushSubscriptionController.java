package eu.strietwald.social.backend;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PushSubscriptionController {

    private static final Logger logger = LoggerFactory.getLogger(PushSubscriptionController.class);

    @Autowired
    private UserInfo userInfo;

    @Autowired
    private PersonRepository personRepository;

    @Value("${vapid.public-key}")
    private String vapidPublicKey;

    /**
     * Returns the VAPID public key so the frontend can subscribe to push.
     */
    @GetMapping("/push/vapid-key")
    public ResponseEntity<VapidKeyResponse> getVapidKey() {
        return ResponseEntity.ok(new VapidKeyResponse(vapidPublicKey));
    }

    /**
     * Registers a push subscription for the current user's device.
     * If the endpoint already exists, it won't be added again.
     */
    @PostMapping("/push/subscribe")
    public ResponseEntity<Void> subscribe(@RequestBody PushSubscription subscription) {
        Person person = userInfo.getPerson();
        logger.info("Push subscribe for user: {} endpoint: {}", person.getName(), subscription.getEndpoint());

        // Avoid duplicate subscriptions for the same endpoint
        boolean exists = person.getPushSubscriptions().stream()
                .anyMatch(s -> s.getEndpoint().equals(subscription.getEndpoint()));

        if (!exists) {
            person.getPushSubscriptions().add(subscription);
            personRepository.save(person);
        }

        return ResponseEntity.ok().build();
    }

    /**
     * Removes a push subscription by endpoint for the current user.
     */
    @DeleteMapping("/push/unsubscribe")
    public ResponseEntity<Void> unsubscribe(@RequestBody UnsubscribeRequest request) {
        Person person = userInfo.getPerson();
        logger.info("Push unsubscribe for user: {} endpoint: {}", person.getName(), request.endpoint());

        person.getPushSubscriptions().removeIf(s -> s.getEndpoint().equals(request.endpoint()));
        personRepository.save(person);

        return ResponseEntity.ok().build();
    }

    public record VapidKeyResponse(String publicKey) {}

    public record UnsubscribeRequest(String endpoint) {}
}
