package eu.strietwald.social.backend;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.FieldType;
import org.springframework.data.mongodb.core.mapping.MongoId;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Document(collection = "stories")
@Getter
@Setter
@NoArgsConstructor
public class Story {

    @MongoId(FieldType.OBJECT_ID)
    private String id;

    @Field
    private String link;

    @Field
    private String titel;

    @Field
    private Date datum;

    @Field
    private Date expiresAt;

    @Field
    private Person autor;

    @Field
    private List<Person> zuschauer = new ArrayList<>();

    @Field
    private List<Person> angesehen = new ArrayList<>();
}
