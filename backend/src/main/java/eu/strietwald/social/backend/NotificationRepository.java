package eu.strietwald.social.backend;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.data.mongodb.repository.Update;

public interface NotificationRepository extends MongoRepository<Notification, String> {

    Page<Notification> findByRecipientIdOrderByCreatedAtDesc(String recipientId, Pageable pageable);

    long countByRecipientIdAndReadFalse(String recipientId);

    @Query("{ 'recipientId': ?0, 'read': false }")
    @Update("{ '$set': { 'read': true } }")
    long updateByRecipientIdAndReadFalse(String recipientId);

    void deleteByBeitragId(String beitragId);
}
