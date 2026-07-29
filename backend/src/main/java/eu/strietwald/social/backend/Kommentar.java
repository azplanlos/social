package eu.strietwald.social.backend;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.FieldType;
import org.springframework.data.mongodb.core.mapping.MongoId;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;


@Document(collection = "kommentare")
@Getter
@Setter
@ToString
public class Kommentar {
    @MongoId(FieldType.OBJECT_ID)
    private String id;

    @Field
    @Indexed
    private String beitragId;

    @Field
    private String elternKommentarId;

    @Field
    private String text;

    @Field
    private Person autor;

    @Field
    private Date datum;

    @Field
    private List<Person> likes = new ArrayList<>();

    @Field
    private Integer likes_num = 0;
}
