package eu.strietwald.social.backend;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/notifications")
public class NotificationController {

    @Autowired(required = false)
    private UserInfo userInfo;

    @Autowired
    private NotificationRepository notificationRepository;

    @GetMapping
    public Page<Notification> getNotifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        if (size > 100) {
            size = 100;
        }
        String recipientId = userInfo.getPerson().getId();
        PageRequest pageRequest = PageRequest.of(page, size);
        return notificationRepository.findByRecipientIdOrderByCreatedAtDesc(recipientId, pageRequest);
    }

    @GetMapping("/unread-count")
    public Map<String, Long> getUnreadCount() {
        String recipientId = userInfo.getPerson().getId();
        long count = notificationRepository.countByRecipientIdAndReadFalse(recipientId);
        return Map.of("count", count);
    }

    @PostMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead() {
        String recipientId = userInfo.getPerson().getId();
        notificationRepository.updateByRecipientIdAndReadFalse(recipientId);
        return ResponseEntity.ok().build();
    }
}
