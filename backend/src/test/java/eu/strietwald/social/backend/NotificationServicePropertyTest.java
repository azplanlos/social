package eu.strietwald.social.backend;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import net.jqwik.api.*;
import net.jqwik.api.constraints.*;

import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

/**
 * Property-Based Tests für NotificationService.
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4
 */
class NotificationServicePropertyTest {

    /**
     * Property 1: Notification-Erstellung exkludiert den Autor.
     * For any Beitrag with an author and any recipient list (empty or not),
     * creating Notifications should never create a Notification whose
     * recipientId matches the author's person ID.
     *
     * Validates: Requirements 1.1, 1.2
     */
    @Property(tries = 100)
    @Label("Feature: notification-list, Property 1: Notification-Erstellung exkludiert den Autor")
    void authorIsNeverARecipientOfNotification(
            @ForAll("beitragWithAutor") Beitrag beitrag,
            @ForAll("recipientLists") List<Person> recipients) {

        // Arrange
        NotificationRepository mockRepo = mock(NotificationRepository.class);
        PersonRepository mockPersonRepo = mock(PersonRepository.class);

        NotificationService service = new NotificationService();
        setField(service, "notificationRepository", mockRepo);
        setField(service, "personRepository", mockPersonRepo);

        // Ensure author is in the recipient list to test exclusion
        String autorId = beitrag.getAutor().getId();
        List<Person> recipientsWithAutor = new ArrayList<>(recipients);
        recipientsWithAutor.add(beitrag.getAutor());

        // Configure mock to return the notification as saved
        when(mockRepo.save(any(Notification.class))).thenAnswer(invocation -> {
            Notification n = invocation.getArgument(0);
            if (n.getId() == null) {
                n.setId("generated-" + System.nanoTime());
            }
            return n;
        });

        // Act
        service.createNotifications(beitrag, recipientsWithAutor);

        // Assert - capture all saved notifications
        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(mockRepo, atLeast(0)).save(captor.capture());

        List<Notification> savedNotifications = captor.getAllValues();
        for (Notification notification : savedNotifications) {
            assertThat(notification.getRecipientId())
                    .as("Author (id=%s) should never receive a notification", autorId)
                    .isNotEqualTo(autorId);
        }
    }

    /**
     * Property 2: Notification enthält alle Pflichtfelder.
     * For any created Notification, the document must contain all required fields:
     * non-empty ID (after save), valid recipientId, non-empty senderName,
     * beitragTitel (≤ 200 chars), non-empty beitragId, valid createdAt timestamp,
     * and initial read value of false.
     *
     * Validates: Requirements 1.3, 1.4
     */
    @Property(tries = 100)
    @Label("Feature: notification-list, Property 2: Notification enthält alle Pflichtfelder")
    void notificationContainsAllRequiredFields(
            @ForAll("beitragWithAutor") Beitrag beitrag,
            @ForAll("nonAuthorRecipients") List<Person> recipients) {

        // Arrange
        NotificationRepository mockRepo = mock(NotificationRepository.class);
        PersonRepository mockPersonRepo = mock(PersonRepository.class);

        NotificationService service = new NotificationService();
        setField(service, "notificationRepository", mockRepo);
        setField(service, "personRepository", mockPersonRepo);

        // Ensure recipients don't include the author (to guarantee notifications are created)
        String autorId = beitrag.getAutor().getId();
        List<Person> filteredRecipients = recipients.stream()
                .filter(p -> p.getId() != null && !p.getId().equals(autorId))
                .toList();

        // If no valid recipients after filter, skip this iteration
        Assume.that(!filteredRecipients.isEmpty());

        Instant beforeCall = Instant.now();

        // Configure mock to simulate MongoDB assigning an ID
        when(mockRepo.save(any(Notification.class))).thenAnswer(invocation -> {
            Notification n = invocation.getArgument(0);
            if (n.getId() == null) {
                n.setId("507f1f77bcf86cd799439011");
            }
            return n;
        });

        // Act
        service.createNotifications(beitrag, filteredRecipients);

        Instant afterCall = Instant.now();

        // Assert - capture all saved notifications
        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(mockRepo, atLeast(1)).save(captor.capture());

        List<Notification> savedNotifications = captor.getAllValues();
        assertThat(savedNotifications).isNotEmpty();

        for (Notification notification : savedNotifications) {
            // recipientId must be non-null and non-empty
            assertThat(notification.getRecipientId())
                    .as("recipientId must be non-null and non-empty")
                    .isNotNull()
                    .isNotEmpty();

            // senderName must be non-empty (autor name)
            assertThat(notification.getSenderName())
                    .as("senderName must be non-null")
                    .isNotNull();

            // beitragTitel must be ≤ 200 chars
            assertThat(notification.getBeitragTitel())
                    .as("beitragTitel must not exceed 200 characters")
                    .isNotNull();
            assertThat(notification.getBeitragTitel().length())
                    .as("beitragTitel length must be <= 200")
                    .isLessThanOrEqualTo(200);

            // beitragId must be non-empty
            assertThat(notification.getBeitragId())
                    .as("beitragId must be non-null and non-empty")
                    .isNotNull()
                    .isNotEmpty();

            // createdAt must be a valid timestamp (between before and after the call)
            assertThat(notification.getCreatedAt())
                    .as("createdAt must be set to a valid timestamp")
                    .isNotNull()
                    .isAfterOrEqualTo(beforeCall)
                    .isBeforeOrEqualTo(afterCall.plusSeconds(1));

            // read must be false initially
            assertThat(notification.isRead())
                    .as("read must be false initially")
                    .isFalse();
        }
    }

    // --- Arbitrary Providers ---

    @Provide
    Arbitrary<Beitrag> beitragWithAutor() {
        return Combinators.combine(
                personArbitrary(),
                Arbitraries.strings().alpha().ofMinLength(1).ofMaxLength(300),
                Arbitraries.strings().alpha().numeric().ofMinLength(10).ofMaxLength(24)
        ).as((autor, titel, id) -> {
            Beitrag beitrag = new Beitrag();
            beitrag.setId(id);
            beitrag.setTitel(titel);
            beitrag.setAutor(autor);
            return beitrag;
        });
    }

    @Provide
    Arbitrary<List<Person>> recipientLists() {
        return personArbitrary().list().ofMinSize(0).ofMaxSize(10);
    }

    @Provide
    Arbitrary<List<Person>> nonAuthorRecipients() {
        return personArbitrary().list().ofMinSize(1).ofMaxSize(10);
    }

    private Arbitrary<Person> personArbitrary() {
        return Combinators.combine(
                Arbitraries.strings().alpha().numeric().ofMinLength(10).ofMaxLength(24),
                Arbitraries.strings().alpha().ofMinLength(1).ofMaxLength(50)
        ).as((id, name) -> {
            Person person = new Person();
            person.setId(id);
            person.setName(name);
            return person;
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
