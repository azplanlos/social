package eu.strietwald.social.backend;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.data.mongodb.repository.Update;

public interface ChatMessageRepository extends MongoRepository<ChatMessage, String> {

    List<ChatMessage> findByConversationIdOrderByTimestampAsc(String conversationId);

    long countByConversationIdAndReadFalseAndSenderNameNot(String conversationId, String senderName);

    @Query("{ 'conversationId': ?0, 'read': false, 'senderName': { '$ne': ?1 } }")
    @Update("{ '$set': { 'read': true } }")
    void markAsReadByConversationIdAndSenderNameNot(String conversationId, String senderName);
}
