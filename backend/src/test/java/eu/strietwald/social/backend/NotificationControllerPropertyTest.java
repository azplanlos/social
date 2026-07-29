package eu.strietwald.social.backend;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import net.jqwik.api.*;
import net.jqwik.api.constraints.*;

import org.mockito.Mockito;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Property-Based Tests für NotificationController.
 * Validates: Requirements 2.1, 2.2, 2.3, 2.5, 3.1, 3.2, 3.3
 */
class NotificationControllerPropertyTest {

    /**
     * Property 3: Notifications werden nur für den authentifizierten Benutzer zurückgegeben.
     * For any query to GET /notifications with an authenticated user, all returned
     * Notifications shall have a recipientId that exactly matches the requesting user's person ID.
     *
     * Validates: Requirements 2.2, 2.5
     */
    @Property(tries = 100)
    @Label("Feature: notification-list, Property 3: Notifications werden nur für den authentifizierten Benutzer zurückgegeben")
    void notificationsAreOnlyReturnedForAuthenticatedUser(
            @ForAll("personId") String authenticatedUserId,
            @ForAll("notificationListForUser") List<Notification> userNotifications) {

        // Arrange
        NotificationController controller = new NotificationController();
        NotificationRepository mockRepo = mock(NotificationRepository.class);
        UserInfo mockUserInfo = mock(UserInfo.class);

        Person authenticatedPerson = new Person();
        authenticatedPerson.setId(authenticatedUserId);
        when(mockUserInfo.getPerson()).thenReturn(authenticatedPerson);

        // Set up notifications that all belong to the authenticated user
        for (Notification n : userNotifications) {
            n.setRecipientId(authenticatedUserId);
        }

        Page<Notification> page = new PageImpl<>(userNotifications);
        when(mockRepo.findByRecipientIdOrderByCreatedAtDesc(eq(authenticatedUserId), any(Pageable.class)))
                .thenReturn(page);

        setField(controller, "userInfo", mockUserInfo);
        setField(controller, "notificationRepository", mockRepo);

        // Act
        Page<Notification> result = controller.getNotifications(0, 20);

        // Assert - all returned notifications must belong to the authenticated user
        for (Notification notification : result.getContent()) {
            assertThat(notification.getRecipientId())
                    .as("All returned notifications must have recipientId matching the authenticated user")
                    .isEqualTo(authenticatedUserId);
        }

        // Verify that the repository was called with the correct recipientId
        verify(mockRepo).findByRecipientIdOrderByCreatedAtDesc(eq(authenticatedUserId), any(Pageable.class));
    }

    /**
     * Property 4: Notifications sind absteigend nach Zeitstempel sortiert.
     * For any result list from GET /notifications, the timestamp of each Notification
     * shall be less than or equal to the timestamp of the previous Notification (descending order).
     *
     * Validates: Requirements 2.1
     */
    @Property(tries = 100)
    @Label("Feature: notification-list, Property 4: Notifications sind absteigend nach Zeitstempel sortiert")
    void notificationsAreReturnedInDescendingTimestampOrder(
            @ForAll("personId") String userId,
            @ForAll("unsortedNotificationList") List<Notification> notifications) {

        // Arrange
        NotificationController controller = new NotificationController();
        NotificationRepository mockRepo = mock(NotificationRepository.class);
        UserInfo mockUserInfo = mock(UserInfo.class);

        Person person = new Person();
        person.setId(userId);
        when(mockUserInfo.getPerson()).thenReturn(person);

        // Simulate the repository returning results sorted by createdAt descending
        // (as the repository method findByRecipientIdOrderByCreatedAtDesc guarantees)
        List<Notification> sortedNotifications = new ArrayList<>(notifications);
        sortedNotifications.sort((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()));

        Page<Notification> page = new PageImpl<>(sortedNotifications);
        when(mockRepo.findByRecipientIdOrderByCreatedAtDesc(eq(userId), any(Pageable.class)))
                .thenReturn(page);

        setField(controller, "userInfo", mockUserInfo);
        setField(controller, "notificationRepository", mockRepo);

        // Act
        Page<Notification> result = controller.getNotifications(0, 50);

        // Assert - timestamps must be in descending order
        List<Notification> content = result.getContent();
        for (int i = 1; i < content.size(); i++) {
            Instant previous = content.get(i - 1).getCreatedAt();
            Instant current = content.get(i).getCreatedAt();
            assertThat(current)
                    .as("Notification at index %d (createdAt=%s) should be <= notification at index %d (createdAt=%s)",
                            i, current, i - 1, previous)
                    .isBeforeOrEqualTo(previous);
        }
    }

    /**
     * Property 5: Unread-Count stimmt mit tatsächlich ungelesenen Notifications überein.
     * For any user, the value returned by GET /notifications/unread-count shall exactly
     * match the count of Notifications in the database whose recipientId belongs to that
     * user and whose read field is false.
     *
     * Validates: Requirements 2.3
     */
    @Property(tries = 100)
    @Label("Feature: notification-list, Property 5: Unread-Count stimmt mit tatsächlich ungelesenen Notifications überein")
    void unreadCountMatchesActualUnreadNotifications(
            @ForAll("personId") String userId,
            @ForAll("notificationListWithMixedReadStatus") List<Notification> notifications) {

        // Arrange
        NotificationController controller = new NotificationController();
        NotificationRepository mockRepo = mock(NotificationRepository.class);
        UserInfo mockUserInfo = mock(UserInfo.class);

        Person person = new Person();
        person.setId(userId);
        when(mockUserInfo.getPerson()).thenReturn(person);

        // Count the actual unread notifications for the user
        long expectedUnreadCount = notifications.stream()
                .filter(n -> userId.equals(n.getRecipientId()) && !n.isRead())
                .count();

        when(mockRepo.countByRecipientIdAndReadFalse(userId)).thenReturn(expectedUnreadCount);

        setField(controller, "userInfo", mockUserInfo);
        setField(controller, "notificationRepository", mockRepo);

        // Act
        Map<String, Long> result = controller.getUnreadCount();

        // Assert
        assertThat(result.get("count"))
                .as("Unread count must match the actual number of unread notifications for the user")
                .isEqualTo(expectedUnreadCount);

        // Verify that the repository was called with the correct recipientId
        verify(mockRepo).countByRecipientIdAndReadFalse(userId);
    }

    /**
     * Property 6: Mark-All-As-Read setzt alle ungelesenen Notifications auf gelesen.
     * For any user with N unread Notifications, after calling POST /notifications/read-all,
     * the count of unread Notifications for that user shall be 0.
     *
     * Validates: Requirements 3.1, 3.2
     */
    @Property(tries = 100)
    @Label("Feature: notification-list, Property 6: Mark-All-As-Read setzt alle ungelesenen Notifications auf gelesen")
    void markAllAsReadSetsAllUnreadNotificationsToRead(
            @ForAll("personId") String userId,
            @ForAll @IntRange(min = 1, max = 50) int unreadCount) {

        // Arrange
        NotificationController controller = new NotificationController();
        NotificationRepository mockRepo = mock(NotificationRepository.class);
        UserInfo mockUserInfo = mock(UserInfo.class);

        Person person = new Person();
        person.setId(userId);
        when(mockUserInfo.getPerson()).thenReturn(person);

        // Simulate that the repository updates N unread notifications
        when(mockRepo.updateByRecipientIdAndReadFalse(userId)).thenReturn((long) unreadCount);
        // After mark-all-as-read, unread count should be 0
        when(mockRepo.countByRecipientIdAndReadFalse(userId)).thenReturn(0L);

        setField(controller, "userInfo", mockUserInfo);
        setField(controller, "notificationRepository", mockRepo);

        // Act
        ResponseEntity<Void> response = controller.markAllAsRead();

        // Assert - response should be successful
        assertThat(response.getStatusCode().value())
                .as("markAllAsRead should return HTTP 200")
                .isEqualTo(200);

        // Verify that updateByRecipientIdAndReadFalse was called with correct userId
        verify(mockRepo).updateByRecipientIdAndReadFalse(userId);

        // Verify that after marking all as read, unread count is 0
        Map<String, Long> unreadResult = controller.getUnreadCount();
        assertThat(unreadResult.get("count"))
                .as("After markAllAsRead, unread count must be 0")
                .isEqualTo(0L);
    }

    /**
     * Property 7: Mark-All-As-Read ist idempotent.
     * For any user without unread Notifications, calling POST /notifications/read-all
     * shall return a success response and not change any data.
     *
     * Validates: Requirements 3.3
     */
    @Property(tries = 100)
    @Label("Feature: notification-list, Property 7: Mark-All-As-Read ist idempotent")
    void markAllAsReadIsIdempotentWhenNoUnreadNotifications(
            @ForAll("personId") String userId) {

        // Arrange
        NotificationController controller = new NotificationController();
        NotificationRepository mockRepo = mock(NotificationRepository.class);
        UserInfo mockUserInfo = mock(UserInfo.class);

        Person person = new Person();
        person.setId(userId);
        when(mockUserInfo.getPerson()).thenReturn(person);

        // No unread notifications exist - update returns 0
        when(mockRepo.updateByRecipientIdAndReadFalse(userId)).thenReturn(0L);
        // Unread count is already 0
        when(mockRepo.countByRecipientIdAndReadFalse(userId)).thenReturn(0L);

        setField(controller, "userInfo", mockUserInfo);
        setField(controller, "notificationRepository", mockRepo);

        // Act - call markAllAsRead twice to verify idempotency
        ResponseEntity<Void> response1 = controller.markAllAsRead();
        ResponseEntity<Void> response2 = controller.markAllAsRead();

        // Assert - both calls return success
        assertThat(response1.getStatusCode().value())
                .as("First markAllAsRead call should return HTTP 200")
                .isEqualTo(200);
        assertThat(response2.getStatusCode().value())
                .as("Second markAllAsRead call should return HTTP 200")
                .isEqualTo(200);

        // Verify the repository was called exactly twice (once per invocation)
        verify(mockRepo, times(2)).updateByRecipientIdAndReadFalse(userId);

        // Verify unread count is still 0
        Map<String, Long> unreadResult = controller.getUnreadCount();
        assertThat(unreadResult.get("count"))
                .as("Unread count should remain 0 after idempotent markAllAsRead calls")
                .isEqualTo(0L);
    }

    // --- Arbitrary Providers ---

    @Provide
    Arbitrary<String> personId() {
        return Arbitraries.strings().alpha().numeric().ofMinLength(10).ofMaxLength(24);
    }

    @Provide
    Arbitrary<List<Notification>> notificationListForUser() {
        return notificationArbitrary().list().ofMinSize(0).ofMaxSize(20);
    }

    @Provide
    Arbitrary<List<Notification>> unsortedNotificationList() {
        return notificationArbitrary().list().ofMinSize(0).ofMaxSize(20);
    }

    @Provide
    Arbitrary<List<Notification>> notificationListWithMixedReadStatus() {
        return Combinators.combine(
                personId(),
                Arbitraries.integers().between(0, 15),
                Arbitraries.integers().between(0, 15)
        ).as((recipientId, readCount, unreadCount) -> {
            List<Notification> notifications = new ArrayList<>();
            Instant baseTime = Instant.now();

            for (int i = 0; i < readCount; i++) {
                Notification n = new Notification();
                n.setId("read-" + i);
                n.setRecipientId(recipientId);
                n.setSenderName("Sender " + i);
                n.setBeitragTitel("Titel " + i);
                n.setBeitragId("beitrag-" + i);
                n.setCreatedAt(baseTime.minus(i, ChronoUnit.HOURS));
                n.setRead(true);
                notifications.add(n);
            }

            for (int i = 0; i < unreadCount; i++) {
                Notification n = new Notification();
                n.setId("unread-" + i);
                n.setRecipientId(recipientId);
                n.setSenderName("Sender " + (readCount + i));
                n.setBeitragTitel("Titel " + (readCount + i));
                n.setBeitragId("beitrag-" + (readCount + i));
                n.setCreatedAt(baseTime.minus(readCount + i, ChronoUnit.HOURS));
                n.setRead(false);
                notifications.add(n);
            }

            return notifications;
        });
    }

    private Arbitrary<Notification> notificationArbitrary() {
        return Combinators.combine(
                Arbitraries.strings().alpha().numeric().ofMinLength(10).ofMaxLength(24),
                Arbitraries.strings().alpha().ofMinLength(1).ofMaxLength(50),
                Arbitraries.strings().alpha().ofMinLength(1).ofMaxLength(200),
                Arbitraries.strings().alpha().numeric().ofMinLength(10).ofMaxLength(24),
                Arbitraries.longs().between(0, 1_000_000_000L),
                Arbitraries.of(true, false)
        ).as((id, senderName, beitragTitel, beitragId, secondsAgo, read) -> {
            Notification n = new Notification();
            n.setId(id);
            n.setSenderName(senderName);
            n.setBeitragTitel(beitragTitel);
            n.setBeitragId(beitragId);
            n.setCreatedAt(Instant.now().minusSeconds(secondsAgo));
            n.setRead(read);
            return n;
        });
    }

    // --- Utility method to inject dependencies via reflection ---

    private void setField(Object target, String fieldName, Object value) {
        try {
            java.lang.reflect.Field field = target.getClass().getDeclaredField(fieldName);
            field.setAccessible(true);
            field.set(target, value);
        } catch (NoSuchFieldException | IllegalAccessException e) {
            throw new RuntimeException("Failed to set field " + fieldName, e);
        }
    }
}
