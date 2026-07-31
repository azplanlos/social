package eu.strietwald.social.backend;

import java.util.ArrayList;
import java.util.List;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "person")
public class Person {

    @Id
    private String id;
    
    @Field
    @Indexed(unique = true)
    private String name;

    @Field
    @Indexed(unique = true, sparse = true)
    private String sub;

    @Field
    private String avatar_url;

    @Field
    private List<PushSubscription> pushSubscriptions = new ArrayList<>();

    @Field
    private Integer storyDauerStunden;

    public Integer getStoryDauerStunden() {
        return storyDauerStunden != null ? storyDauerStunden : 24;
    }
}
