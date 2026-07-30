package eu.strietwald.social.backend;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface KommentarRepository extends MongoRepository<Kommentar, String> {
    List<Kommentar> findByBeitragIdOrderByDatumAsc(String beitragId);
}
