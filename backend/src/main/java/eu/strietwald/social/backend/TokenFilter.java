package eu.strietwald.social.backend;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.security.oauth2.server.resource.autoconfigure.OAuth2ResourceServerProperties.Jwt;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Date;

@Component
public class TokenFilter extends OncePerRequestFilter {
    private final Logger logger = LoggerFactory.getLogger(TokenFilter.class);

    @Autowired
    private UserInfo userContext;

    @Autowired
    private PersonRepository personRepository;

    public TokenFilter() {
        logger.info("TokenFilter bean is created");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        logger.info("TokenFilter doFilter");
        JwtAuthenticationToken authentication = (JwtAuthenticationToken) SecurityContextHolder.getContext().getAuthentication();
        logger.info(authentication.getToken().getClaimAsString("preferred_username"));
        Person user = personRepository.findByName(authentication.getToken().getClaimAsString("preferred_username"));
        if (user == null) {
            user = new Person();
            user.setName(authentication.getToken().getClaimAsString("preferred_username"));
            personRepository.save(user);
        }
        userContext.setPerson(user);
        chain.doFilter(request, response);
    }
}