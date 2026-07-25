package eu.strietwald.social.backend;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface ContactListRepository extends MongoRepository<ContactList, String> {

    List<ContactList> findByOwnerName(String ownerName);
}
