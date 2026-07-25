package eu.strietwald.social.backend;

import java.util.ArrayList;
import java.util.List;

import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.FieldType;
import org.springframework.data.mongodb.core.mapping.MongoId;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Document(collection = "contactlists")
@Getter
@Setter
@ToString
public class ContactList {

    @MongoId(FieldType.OBJECT_ID)
    private String id;

    @Field
    private String name;

    @Field
    private Person owner;

    @Field
    private List<Person> members = new ArrayList<>();
}
