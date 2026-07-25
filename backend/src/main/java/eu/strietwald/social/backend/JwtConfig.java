package eu.strietwald.social.backend;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

@Configuration
public class JwtConfig {

    @Value("${spring.security.oauth2.resourceserver.jwt.jwk-set-uri}")
    private String jwkSetUri;

    @Bean
    public JwtDecoder jwtDecoder() {
        // Use JWK Set URI directly without strict issuer validation.
        // This allows tokens issued by Keycloak accessed via any host/IP
        // (localhost, LAN IP, etc.) to be accepted in development.
        return NimbusJwtDecoder.withJwkSetUri(jwkSetUri).build();
    }
}
