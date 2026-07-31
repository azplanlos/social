package eu.strietwald.social.backend;

import java.time.Instant;

import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.FieldType;
import org.springframework.data.mongodb.core.mapping.MongoId;

import lombok.Getter;
import lombok.Setter;

@Document(collection = "chat_messages")
@Getter
@Setter
public class ChatMessage {

    @MongoId(FieldType.OBJECT_ID)
    private String id;

    @Field
    @Indexed
    private String conversationId;

    @Field
    private String senderName;

    @Field
    private String senderAvatarUrl;

    @Field
    private String content;

    @Field
    @Indexed
    private Instant timestamp;

    @Field
    private boolean read;

    @Field
    private String fileUrl;

    @Field
    private String fileName;

    @Field
    private String fileType;

    @Field
    private Long fileSize;

    @Field
    private Long duration; // Dauer in Sekunden (für Sprachnachrichten)
}
