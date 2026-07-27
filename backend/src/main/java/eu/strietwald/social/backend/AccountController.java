package eu.strietwald.social.backend;

import java.io.IOException;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import software.amazon.awssdk.core.async.AsyncRequestBody;
import software.amazon.awssdk.services.s3.S3AsyncClient;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

@RestController
public class AccountController {

    private final Logger logger = LoggerFactory.getLogger(AccountController.class);

    @Autowired
    private UserInfo userInfo;

    @Autowired
    private PersonRepository personRepository;

    @Autowired
    private MongoTemplate mongoTemplate;

    @Autowired
    private S3AsyncClient s3;

    @Autowired
    private String s3Bucket;

    @GetMapping("/account")
    public Person account() {
        return userInfo.getPerson();
    }

    @PostMapping("/account/avatar")
    public Person uploadAvatar(@RequestParam("file") MultipartFile file) {
        logger.info("Avatar upload for user: " + userInfo.getPerson().getName());
        String filename = "avatar_" + UUID.randomUUID().toString() + ".jpg";
        PutObjectRequest request = PutObjectRequest.builder().bucket(s3Bucket).key(filename).build();
        try {
            AsyncRequestBody body = AsyncRequestBody.fromInputStream(file.getInputStream(), file.getSize());
            s3.putObject(request, body);
            Person person = userInfo.getPerson();
            person.setAvatar_url(filename);
            personRepository.save(person);

            // Update all embedded Person references in Beitraege
            updatePersonInBeitraege(person);

            return person;
        } catch (IOException e) {
            logger.error("Avatar upload failed", e);
            throw new RuntimeException("Avatar upload failed", e);
        }
    }

    private void updatePersonInBeitraege(Person person) {
        String name = person.getName();

        // Update autor
        mongoTemplate.updateMulti(
            Query.query(Criteria.where("autor.name").is(name)),
            new Update().set("autor.avatar_url", person.getAvatar_url()),
            Beitrag.class
        );

        // Update in gefaellt list
        mongoTemplate.updateMulti(
            Query.query(Criteria.where("gefaellt.name").is(name)),
            new Update().set("gefaellt.$.avatar_url", person.getAvatar_url()),
            Beitrag.class
        );

        // Update in gefaelltNicht list
        mongoTemplate.updateMulti(
            Query.query(Criteria.where("gefaelltNicht.name").is(name)),
            new Update().set("gefaelltNicht.$.avatar_url", person.getAvatar_url()),
            Beitrag.class
        );

        // Update in angesehen list
        mongoTemplate.updateMulti(
            Query.query(Criteria.where("angesehen.name").is(name)),
            new Update().set("angesehen.$.avatar_url", person.getAvatar_url()),
            Beitrag.class
        );

        logger.info("Updated embedded Person references in Beitraege for user: " + name);
    }
}
