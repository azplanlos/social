package eu.strietwald.social.backend;

import java.util.List;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ConversationResponse {

    private String id;
    private List<Participant> participants;
    private ChatMessage lastMessage;
    private long unreadCount;
    private String updatedAt;

    @Getter
    @Setter
    public static class Participant {
        private String name;
        private String avatarUrl;
    }
}
