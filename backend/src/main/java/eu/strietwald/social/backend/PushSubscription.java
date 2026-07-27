package eu.strietwald.social.backend;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PushSubscription {

    private String endpoint;
    private String p256dh;
    private String auth;
}
