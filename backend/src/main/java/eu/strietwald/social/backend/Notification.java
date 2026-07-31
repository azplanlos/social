package eu.strietwald.social.backend;

import java.time.Instant;

import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.FieldType;
import org.springframework.data.mongodb.core.mapping.MongoId;

import lombok.Getter;
import lombok.Setter;

@Document(collection = "notifications")
@Getter
@Setter
public class Notification {

    @MongoId(FieldType.OBJECT_ID)
    private String id;

    @Field
    @Indexed
    private String recipientId;

    @Field
    private String senderName;

    @Field
    private String beitragTitel;

    @Field
    private String beitragId;

    /** "beitrag" (default/legacy), "chat", or "story" */
    @Field
    private String type;

    /** Nur für type="story": die zugehörige Story-ID */
    @Field
    private String storyId;

    /** Nur für type="chat": die zugehörige Konversations-ID */
    @Field
    private String conversationId;

    /** Nur für type="chat": Vorschau der Nachricht */
    @Field
    private String messagePreview;

    @Field
    @Indexed
    private Instant createdAt;

    @Field
    private boolean read;
}
