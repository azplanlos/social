package eu.strietwald.social.backend;

import java.io.IOException;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.domain.Sort.Direction;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import software.amazon.awssdk.core.async.AsyncRequestBody;
import software.amazon.awssdk.services.s3.S3AsyncClient;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

@RestController
public class BeitraegeController {

    @Autowired(required = false)
    private UserInfo userInfo;
    
    private final BeitragRepository repository;

    @Autowired
    private PersonRepository personRepository;

    @Autowired
    private S3AsyncClient s3;

    @Autowired
    private String s3Bucket;

    @Autowired
    private PushNotificationService pushNotificationService;

    @Autowired
    private NotificationService notificationService;

    Logger logger = LoggerFactory.getLogger(BeitraegeController.class);

    public BeitraegeController(BeitragRepository repository) {
        this.repository = repository;
    }

    @GetMapping("/beitraege")
    public Page<Beitrag> beitraege(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Direction.DESC, "datum"));
        Page<Beitrag> allBeitraege = this.repository.findAllByOrderByDatumDesc(pageRequest);

        String currentUser = userInfo.getPerson().getName();
        List<Beitrag> filtered = allBeitraege.getContent().stream()
                .filter(b -> {
                    // Posts without recipients (empty list) are visible to everyone
                    if (b.getEmpfaenger() == null || b.getEmpfaenger().isEmpty()) {
                        return true;
                    }
                    // Author can always see their own posts
                    if (b.getAutor() != null && currentUser.equals(b.getAutor().getName())) {
                        return true;
                    }
                    // Check if current user is in the recipients list
                    return b.getEmpfaenger().stream()
                            .anyMatch(p -> currentUser.equals(p.getName()));
                })
                .toList();

        return new PageImpl<>(filtered, pageRequest, filtered.size());
    }

    @GetMapping("/users")
    public List<Person> getAllUsers() {
        return personRepository.findAll();
    }

    @PostMapping("/beitrag")
    public void uploadBeitrag(@RequestBody Beitrag beitrag) {
        logger.info("Neuer Beitrag: " + beitrag.toString());
        beitrag.setGefaellt_nicht_num(0);
        beitrag.setGefaellt_num(0);
        beitrag.setAngesehen_num(0);
        beitrag.setAutor(userInfo.getPerson());
        this.repository.save(beitrag);

        // Send push notifications
        String bildUrl = beitrag.getLink();
        String titel = beitrag.getTitel();
        List<Person> recipients;

        if (beitrag.getEmpfaenger() != null && !beitrag.getEmpfaenger().isEmpty()) {
            // Targeted post: notify only specific recipients
            recipients = beitrag.getEmpfaenger().stream()
                    .map(p -> personRepository.findByName(p.getName()))
                    .filter(p -> p != null)
                    .toList();
        } else {
            // Public post: notify all users except the author
            recipients = personRepository.findAll().stream()
                    .filter(p -> !p.getName().equals(userInfo.getPerson().getName()))
                    .toList();
        }

        pushNotificationService.sendToPersons(recipients, userInfo.getPerson().getName(), titel, bildUrl, beitrag.getId());
        notificationService.createNotifications(beitrag, recipients);
    }

    @PostMapping("/foto")
    public String saveFoto(@RequestParam("file") MultipartFile file,
      RedirectAttributes redirectAttributes) {
        logger.info("Uploading file " + file.getOriginalFilename());
        String filename = UUID.randomUUID().toString() + ".jpg";
        PutObjectRequest request = PutObjectRequest.builder().bucket(s3Bucket).key(filename).build();
        AsyncRequestBody body;
        try {
            body = AsyncRequestBody.fromInputStream(file.getInputStream(), file.getSize());
            s3.putObject(request, body);
            return filename;
        } catch (IOException e) {
            // TODO Auto-generated catch block
            e.printStackTrace();
        }
       return null;
    }

    @PostMapping("/beitrag/{id}/like")
    public void like(@PathVariable("id") String id) {
        logger.info("like #" + id);
        Beitrag beitrag = this.repository.findById(id).orElseThrow();
        String currentUser = userInfo.getPerson().getName();
        boolean alreadyLiked = beitrag.getGefaellt().stream()
                .anyMatch(p -> Objects.equals(p.getName(), currentUser));

        if (alreadyLiked) {
            // Unlike: Like entfernen
            beitrag.getGefaellt().removeIf(p -> Objects.equals(p.getName(), currentUser));
            beitrag.setGefaellt_num(beitrag.getGefaellt_num() - 1);
        } else {
            // Like: hinzufügen und ggf. Dislike entfernen
            beitrag.getGefaellt().add(userInfo.getPerson());
            beitrag.setGefaellt_num(beitrag.getGefaellt_num() + 1);
            // Falls vorher disliked, Dislike entfernen
            boolean wasDisliked = beitrag.getGefaelltNicht().stream()
                    .anyMatch(p -> Objects.equals(p.getName(), currentUser));
            if (wasDisliked) {
                beitrag.getGefaelltNicht().removeIf(p -> Objects.equals(p.getName(), currentUser));
                beitrag.setGefaellt_nicht_num(beitrag.getGefaellt_nicht_num() - 1);
            }
        }
        this.repository.save(beitrag);
    }

    @PostMapping("/beitrag/{id}/dislike")
    public void dislike(@PathVariable("id") String id) {
        logger.info("dislike #" + id);
        Beitrag beitrag = this.repository.findById(id).orElseThrow();
        String currentUser = userInfo.getPerson().getName();
        boolean alreadyDisliked = beitrag.getGefaelltNicht().stream()
                .anyMatch(p -> Objects.equals(p.getName(), currentUser));

        if (alreadyDisliked) {
            // Un-Dislike: Dislike entfernen
            beitrag.getGefaelltNicht().removeIf(p -> Objects.equals(p.getName(), currentUser));
            beitrag.setGefaellt_nicht_num(beitrag.getGefaellt_nicht_num() - 1);
        } else {
            // Dislike: hinzufügen und ggf. Like entfernen
            beitrag.getGefaelltNicht().add(userInfo.getPerson());
            beitrag.setGefaellt_nicht_num(beitrag.getGefaellt_nicht_num() + 1);
            // Falls vorher geliked, Like entfernen
            boolean wasLiked = beitrag.getGefaellt().stream()
                    .anyMatch(p -> Objects.equals(p.getName(), currentUser));
            if (wasLiked) {
                beitrag.getGefaellt().removeIf(p -> Objects.equals(p.getName(), currentUser));
                beitrag.setGefaellt_num(beitrag.getGefaellt_num() - 1);
            }
        }
        this.repository.save(beitrag);
    }

    @PostMapping("/beitrag/{id}/gelesen")
    public void gelesen(@PathVariable("id") String id) {
        logger.info("gelesen #" + id + " von " + userInfo.getPerson().getName());
        Beitrag beitrag = this.repository.findById(id).orElseThrow();
        if (beitrag.getAngesehen().stream().noneMatch(p -> Objects.equals(p.getName(), userInfo.getPerson().getName()))) {
            beitrag.setAngesehen_num(beitrag.getAngesehen_num() + 1);
            beitrag.getAngesehen().add(userInfo.getPerson());
            this.repository.save(beitrag);
        } else {
            logger.warn("Beitrag schon gelesen");
        }
    }
}
