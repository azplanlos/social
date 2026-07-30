package eu.strietwald.social.backend;

import java.util.Date;
import java.util.List;
import java.util.Objects;

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
public class KommentarController {

    @Autowired(required = false)
    private UserInfo userInfo;

    @Autowired
    private KommentarRepository kommentarRepository;

    @Autowired
    private BeitragRepository beitragRepository;

    Logger logger = LoggerFactory.getLogger(KommentarController.class);

    @GetMapping("/beitrag/{beitragId}/kommentare")
    public List<Kommentar> getKommentare(@PathVariable String beitragId) {
        return kommentarRepository.findByBeitragIdOrderByDatumAsc(beitragId);
    }

    @PostMapping("/beitrag/{beitragId}/kommentar")
    public ResponseEntity<?> createKommentar(@PathVariable String beitragId, @RequestBody KommentarRequest request) {
        if (request.getText() == null || request.getText().trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        // Eigene Beiträge dürfen nicht kommentiert werden
        Beitrag beitrag = beitragRepository.findById(beitragId).orElseThrow();
        String currentUser = userInfo.getPerson().getName();
        if (beitrag.getAutor() != null && currentUser.equals(beitrag.getAutor().getName())) {
            return ResponseEntity.status(403).build();
        }

        Kommentar kommentar = new Kommentar();
        kommentar.setText(request.getText());
        kommentar.setElternKommentarId(request.getElternKommentarId());
        kommentar.setBeitragId(beitragId);
        kommentar.setAutor(userInfo.getPerson());
        kommentar.setDatum(new Date());

        Kommentar saved = kommentarRepository.save(kommentar);
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/kommentar/{id}/like")
    public void likeKommentar(@PathVariable String id) {
        logger.info("like Kommentar #" + id);
        Kommentar kommentar = kommentarRepository.findById(id).orElseThrow();
        String currentUser = userInfo.getPerson().getName();
        boolean alreadyLiked = kommentar.getLikes().stream()
                .anyMatch(p -> Objects.equals(p.getName(), currentUser));

        if (alreadyLiked) {
            kommentar.getLikes().removeIf(p -> Objects.equals(p.getName(), currentUser));
            kommentar.setLikes_num(kommentar.getLikes_num() - 1);
        } else {
            kommentar.getLikes().add(userInfo.getPerson());
            kommentar.setLikes_num(kommentar.getLikes_num() + 1);
        }
        kommentarRepository.save(kommentar);
    }
}
