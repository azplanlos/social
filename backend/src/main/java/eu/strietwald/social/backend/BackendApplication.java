package eu.strietwald.social.backend;

import java.util.List;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.data.mongodb.MongoDatabaseFactory;
import org.springframework.data.mongodb.core.MongoClientFactoryBean;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import com.mongodb.MongoCredential;
import com.mongodb.client.MongoClient;

@SpringBootApplication()
public class BackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(BackendApplication.class, args);
	}

	@Bean
    public MongoClientFactoryBean mongo() throws Exception {
        MongoClientFactoryBean mongo = new MongoClientFactoryBean();
		mongo.setHost("localhost");
		mongo.setPort(27018);
		mongo.setCredential(List.of(MongoCredential.createScramSha1Credential("root", "admin", "example".toCharArray())).toArray(new MongoCredential[1]));

        return mongo;
    }

	@Bean
	public MongoDatabaseFactory databaseFactory(MongoClient mongoClient) {
		return MongoDatabaseFactory.create(mongoClient, "social");
	}
}
