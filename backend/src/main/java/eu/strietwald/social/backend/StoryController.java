package eu.strietwald.social.backend;

import java.io.IOException;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class StoryController {

    private final Logger logger = LoggerFactory.getLogger(StoryController.class);

    @Autowired(required = false)
    private UserInfo userInfo;

    @Autowired
    private StoryRepository storyRepository;

    @Autowired
    private PersonRepository personRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private ContactListRepository contactListRepository;

    /**
     * Alle aktiven Stories abrufen (nur die, die der aktuelle User sehen darf).
     */
    @GetMapping("/stories")
    public List<Story> getStories() {
        Date now = new Date();
        List<Story> allStories = storyRepository.findByExpiresAtAfterOrderByDatumDesc(now);
        String currentUser = userInfo.getPerson().getName();

        return allStories.stream()
                .filter(story -> {
                    // Eigene Stories sind immer sichtbar
                    if (story.getAutor() != null && currentUser.equals(story.getAutor().getName())) {
                        return true;
                    }
                    // Stories ohne Zuschauer-Einschränkung sind für alle sichtbar
                    if (story.getZuschauer() == null || story.getZuschauer().isEmpty()) {
                        return true;
                    }
                    // Prüfen ob der aktuelle User in der Zuschauer-Liste ist
                    return story.getZuschauer().stream()
                            .anyMatch(p -> currentUser.equals(p.getName()));
                })
                .toList();
    }

    /**
     * Neue Story erstellen.
     */
    @PostMapping("/story")
    public ResponseEntity<Story> createStory(@RequestBody Story story) {
        logger.info("Neue Story von: " + userInfo.getPerson().getName());

        Person autor = userInfo.getPerson();
        story.setAutor(autor);
        story.setDatum(new Date());

        // Story-Dauer aus den Einstellungen des Autors lesen (Default: 24h)
        int dauerStunden = (autor.getStoryDauerStunden() != null) ? autor.getStoryDauerStunden() : 24;
        Calendar cal = Calendar.getInstance();
        cal.setTime(new Date());
        cal.add(Calendar.HOUR_OF_DAY, dauerStunden);
        story.setExpiresAt(cal.getTime());

        Story saved = storyRepository.save(story);

        // Benachrichtigungen an Kontakte/Zuschauer senden
        List<Person> recipients;
        if (story.getZuschauer() != null && !story.getZuschauer().isEmpty()) {
            // Wenn Zuschauer explizit gesetzt sind, nur diese benachrichtigen
            recipients = story.getZuschauer();
        } else {
            // Sonst alle Kontakte des Autors benachrichtigen
            List<ContactList> contactLists = contactListRepository.findByOwnerName(autor.getName());
            recipients = contactLists.stream()
                    .flatMap(cl -> cl.getMembers().stream())
                    .distinct()
                    .toList();
        }
        notificationService.createStoryNotification(saved, recipients);

        return ResponseEntity.ok(saved);
    }

    /**
     * Leute zur Story hinzufügen (Zuschauer erweitern).
     */
    @PostMapping("/story/{id}/zuschauer")
    public ResponseEntity<Story> addZuschauer(@PathVariable("id") String id, @RequestBody List<Person> neueZuschauer) {
        Story story = storyRepository.findById(id).orElse(null);
        if (story == null) {
            return ResponseEntity.notFound().build();
        }

        // Nur der Autor darf Zuschauer hinzufügen
        String currentUser = userInfo.getPerson().getName();
        if (story.getAutor() == null || !currentUser.equals(story.getAutor().getName())) {
            return ResponseEntity.status(403).build();
        }

        // Neue Zuschauer hinzufügen (Duplikate vermeiden)
        for (Person neuerZuschauer : neueZuschauer) {
            boolean existiert = story.getZuschauer().stream()
                    .anyMatch(p -> p.getName().equals(neuerZuschauer.getName()));
            if (!existiert) {
                story.getZuschauer().add(neuerZuschauer);
            }
        }

        Story updated = storyRepository.save(story);
        return ResponseEntity.ok(updated);
    }

    /**
     * Story als gesehen markieren.
     */
    @PostMapping("/story/{id}/gesehen")
    public ResponseEntity<Void> markGesehen(@PathVariable("id") String id) {
        Story story = storyRepository.findById(id).orElse(null);
        if (story == null) {
            return ResponseEntity.notFound().build();
        }

        String currentUser = userInfo.getPerson().getName();
        boolean alreadySeen = story.getAngesehen().stream()
                .anyMatch(p -> currentUser.equals(p.getName()));

        if (!alreadySeen) {
            story.getAngesehen().add(userInfo.getPerson());
            storyRepository.save(story);
        }

        return ResponseEntity.ok().build();
    }
}
