package eu.strietwald.social.backend;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;

@Component
public class TokenFilter extends OncePerRequestFilter {
    private final Logger logger = LoggerFactory.getLogger(TokenFilter.class);

    @Autowired
    private UserInfo userContext;

    @Autowired
    private PersonRepository personRepository;

    @Value("${oidc.username-claim:preferred_username}")
    private String usernameClaim;

    @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri:}")
    private String issuerUri;

    private final RestTemplate restTemplate = new RestTemplate();

    public TokenFilter() {
        logger.info("TokenFilter bean is created");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        logger.info("TokenFilter doFilter");
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (!(auth instanceof JwtAuthenticationToken authentication)) {
            chain.doFilter(request, response);
            return;
        }

        String sub = authentication.getToken().getClaimAsString("sub");
        if (sub == null || sub.isBlank()) {
            sub = authentication.getToken().getSubject();
        }
        if (sub == null || sub.isBlank()) {
            // Keycloak 26+ may not include 'sub' in access tokens by default.
            // Fall back to a stable unique identifier from available claims.
            logger.warn("JWT token has no 'sub' claim. Claims present: {}. Falling back to alternative identifier.", authentication.getToken().getClaims().keySet());
            // Use 'preferred_username' as stable user identifier (unique in Keycloak)
            sub = authentication.getToken().getClaimAsString("preferred_username");
            if (sub == null || sub.isBlank()) {
                sub = authentication.getToken().getClaimAsString("email");
            }
        }
        if (sub == null || sub.isBlank()) {
            logger.error("JWT token has no usable user identifier – returning 401");
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Token missing user identifier");
            return;
        }

        String displayName = authentication.getToken().getClaimAsString(usernameClaim);
        if (displayName == null) {
            displayName = authentication.getToken().getClaimAsString("name");
        }
        if (displayName == null) {
            displayName = authentication.getToken().getClaimAsString("email");
        }

        logger.info("Resolved user sub: {}, displayName from token: {}", sub, displayName);

        Person user = personRepository.findBySub(sub);
        if (user == null) {
            // Fallback: find user that was previously created with sub as name (migration)
            user = personRepository.findByNameAndSubIsNull(sub);
            if (user != null) {
                logger.info("Migrating user with name={} to sub={}", user.getName(), sub);
                // Fetch real display name and update
                String realName = fetchDisplayNameFromUserinfo(authentication.getToken().getTokenValue());
                if (realName != null) {
                    user.setName(realName);
                }
                user.setSub(sub);
                personRepository.save(user);
            }
        }
        if (user == null) {
            // New user – fetch display name from userinfo if not in token
            if (displayName == null && !issuerUri.isEmpty()) {
                displayName = fetchDisplayNameFromUserinfo(authentication.getToken().getTokenValue());
            }
            if (displayName == null) {
                displayName = sub;
            }
            // Try legacy lookup by name
            user = personRepository.findByName(displayName);
            if (user == null) {
                user = new Person();
                user.setName(displayName);
            }
            user.setSub(sub);
            personRepository.save(user);
        }
        userContext.setPerson(user);
        chain.doFilter(request, response);
    }

    private String fetchDisplayNameFromUserinfo(String accessToken) {
        try {
            String userinfoUrl = issuerUri + "/oidc/v1/userinfo";
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);
            ResponseEntity<Map> resp = restTemplate.exchange(
                    userinfoUrl, HttpMethod.GET, new HttpEntity<>(headers), Map.class);
            if (resp.getBody() != null) {
                Object name = resp.getBody().get("name");
                if (name != null) return name.toString();
                Object preferredUsername = resp.getBody().get("preferred_username");
                if (preferredUsername != null) return preferredUsername.toString();
                Object email = resp.getBody().get("email");
                if (email != null) return email.toString();
            }
        } catch (Exception e) {
            logger.warn("Failed to fetch userinfo: {}", e.getMessage());
        }
        return null;
    }
}