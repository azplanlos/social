package eu.strietwald.social.backend;

import java.util.Date;
import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface StoryRepository extends MongoRepository<Story, String> {

    List<Story> findByExpiresAtAfterOrderByDatumDesc(Date now);

    List<Story> findByAutor_NameAndExpiresAtAfterOrderByDatumDesc(String autorName, Date now);
}
