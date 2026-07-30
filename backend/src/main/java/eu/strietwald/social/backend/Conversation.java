package eu.strietwald.social.backend;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.FieldType;
import org.springframework.data.mongodb.core.mapping.MongoId;

import lombok.Getter;
import lombok.Setter;

@Document(collection = "conversations")
@Getter
@Setter
public class Conversation {

    @MongoId(FieldType.OBJECT_ID)
    private String id;

    @Field
    @Indexed
    private List<String> participantNames = new ArrayList<>();

    @Field
    private List<ConversationParticipant> participants = new ArrayList<>();

    @Field
    private ChatMessage lastMessage;

    @Field
    private Instant updatedAt;

    @Getter
    @Setter
    public static class ConversationParticipant {
        private String name;
        private String avatarUrl;
    }
}
