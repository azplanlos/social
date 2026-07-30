package eu.strietwald.social.backend;

import java.util.Date;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import software.amazon.awssdk.services.s3.S3AsyncClient;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;

@Service
public class BeitragCleanupService {

    private static final Logger logger = LoggerFactory.getLogger(BeitragCleanupService.class);

    @Autowired
    private BeitragRepository beitragRepository;

    @Autowired
    private KommentarRepository kommentarRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private S3AsyncClient s3;

    @Autowired
    private String s3Bucket;

    /**
     * Läuft alle 60 Sekunden und löscht abgelaufene Beiträge
     * inkl. zugehöriger Kommentare, Notifications und S3-Bilder.
     */
    @Scheduled(fixedRate = 60000)
    public void loescheAbgelaufeneBeitraege() {
        List<Beitrag> abgelaufene = beitragRepository.findByAblaufDatumNotNullAndAblaufDatumBefore(new Date());

        if (abgelaufene.isEmpty()) {
            return;
        }

        logger.info("Lösche {} abgelaufene Beiträge", abgelaufene.size());

        for (Beitrag beitrag : abgelaufene) {
            try {
                // S3-Bild löschen
                if (beitrag.getLink() != null && !beitrag.getLink().isBlank()) {
                    DeleteObjectRequest deleteRequest = DeleteObjectRequest.builder()
                            .bucket(s3Bucket)
                            .key(beitrag.getLink())
                            .build();
                    s3.deleteObject(deleteRequest);
                    logger.info("S3-Bild gelöscht: {}", beitrag.getLink());
                }

                // Kommentare löschen
                kommentarRepository.deleteByBeitragId(beitrag.getId());
                logger.info("Kommentare gelöscht für Beitrag: {}", beitrag.getId());

                // Notifications löschen die auf diesen Beitrag verweisen
                notificationRepository.deleteByBeitragId(beitrag.getId());
                logger.info("Notifications gelöscht für Beitrag: {}", beitrag.getId());

                // Beitrag löschen
                beitragRepository.delete(beitrag);
                logger.info("Beitrag gelöscht: {} (Titel: {})", beitrag.getId(), beitrag.getTitel());

            } catch (Exception e) {
                logger.error("Fehler beim Löschen von Beitrag {}: {}", beitrag.getId(), e.getMessage(), e);
            }
        }
    }
}
