package eu.strietwald.social.backend;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.FieldType;
import org.springframework.data.mongodb.core.mapping.MongoId;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;


@Document(collection = "beitraege")
@Getter
@Setter
@ToString
public class Beitrag {
    @MongoId(FieldType.OBJECT_ID)
    private String id;

    @Field
    private String link;

    @Field
    private String titel;
    
    @Field
    private Date datum;

    @Field
    private String beschreibung;
    
    @Field
    private Integer gefaellt_num;

    @Field
    private List<Person> gefaellt = new ArrayList<>();
    
    @Field
    private Integer gefaellt_nicht_num;

    @Field
    private List<Person> gefaelltNicht = new ArrayList<>();
    
    @Field
    private Integer angesehen_num;

    @Field
    private List<Person> angesehen = new ArrayList<>();

    @Field
    private String typ; // "FOTO" oder "VIDEO"

    @Field
    private Person autor;

    @Field
    private List<Person> empfaenger = new ArrayList<>();

    @Field
    private Date ablaufDatum;
}
