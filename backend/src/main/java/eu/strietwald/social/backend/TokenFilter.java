package eu.strietwald.social.backend;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class TokenFilter extends OncePerRequestFilter {
    private final Logger logger = LoggerFactory.getLogger(TokenFilter.class);

    @Autowired
    private UserInfo userContext;

    @Autowired
    private PersonRepository personRepository;

    @Value("${oidc.username-claim:preferred_username}")
    private String usernameClaim;

    public TokenFilter() {
        logger.info("TokenFilter bean is created");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        logger.info("TokenFilter doFilter");
        JwtAuthenticationToken authentication = (JwtAuthenticationToken) SecurityContextHolder.getContext().getAuthentication();

        // Try configured claim, fallback to sub
        String username = authentication.getToken().getClaimAsString(usernameClaim);
        if (username == null) {
            username = authentication.getToken().getClaimAsString("email");
        }
        if (username == null) {
            username = authentication.getToken().getClaimAsString("sub");
        }

        logger.info("Resolved username: {}", username);

        Person user = personRepository.findByName(username);
        if (user == null) {
            user = new Person();
            user.setName(username);
            personRepository.save(user);
        }
        userContext.setPerson(user);
        chain.doFilter(request, response);
    }
}