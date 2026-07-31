package eu.strietwald.social.backend;

import java.util.Date;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface BeitragRepository extends MongoRepository<Beitrag, String> {
    Page<Beitrag> findAllByOrderByDatumDesc(Pageable pageable);

    List<Beitrag> findByAblaufDatumNotNullAndAblaufDatumBefore(Date datum);

    List<Beitrag> findByAutorNameOrderByDatumDesc(String name);
}