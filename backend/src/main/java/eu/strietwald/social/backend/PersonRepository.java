package eu.strietwald.social.backend;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface PersonRepository extends MongoRepository<Person, String> {
    
    public Person findByName(String name);
    
    public Person findBySub(String sub);

    public Person findByNameAndSubIsNull(String name);
}
