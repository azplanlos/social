package eu.strietwald.social.backend;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

public interface ConversationRepository extends MongoRepository<Conversation, String> {

    List<Conversation> findByParticipantNamesContainingOrderByUpdatedAtDesc(String participantName);

    @Query("{ '$and': [ { 'participantNames': ?0 }, { 'participantNames': ?1 } ] }")
    Optional<Conversation> findByBothParticipants(String name1, String name2);
}
