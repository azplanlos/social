package eu.strietwald.social.backend;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class StatisticsController {

    @Autowired
    private BeitragRepository beitragRepository;

    @Autowired
    private PersonRepository personRepository;

    @Autowired(required = false)
    private UserInfo userInfo;

    @GetMapping("/statistiken")
    public Map<String, Object> getStatistics() {
        List<Beitrag> alleBeitraege = beitragRepository.findAll();
        List<Person> allePersonen = personRepository.findAll();

        Map<String, Object> stats = new HashMap<>();

        // Gesamtzahlen
        stats.put("totalBeitraege", alleBeitraege.size());
        stats.put("totalUsers", allePersonen.size());
        stats.put("totalLikes", alleBeitraege.stream().mapToInt(b -> b.getGefaellt_num() != null ? b.getGefaellt_num() : 0).sum());
        stats.put("totalDislikes", alleBeitraege.stream().mapToInt(b -> b.getGefaellt_nicht_num() != null ? b.getGefaellt_nicht_num() : 0).sum());
        stats.put("totalViews", alleBeitraege.stream().mapToInt(b -> b.getAngesehen_num() != null ? b.getAngesehen_num() : 0).sum());

        // Beitraege pro Tag (letzte 30 Tage)
        LocalDate now = LocalDate.now();
        List<Map<String, Object>> beitraegeProTag = new ArrayList<>();
        for (int i = 29; i >= 0; i--) {
            LocalDate day = now.minusDays(i);
            long count = alleBeitraege.stream()
                    .filter(b -> b.getDatum() != null)
                    .filter(b -> {
                        LocalDate beitragDate = b.getDatum().toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
                        return beitragDate.equals(day);
                    })
                    .count();
            Map<String, Object> entry = new HashMap<>();
            entry.put("datum", day.toString());
            entry.put("anzahl", count);
            beitraegeProTag.add(entry);
        }
        stats.put("beitraegeProTag", beitraegeProTag);

        // Top 5 Beitraege nach Likes
        List<Map<String, Object>> topBeitraege = alleBeitraege.stream()
                .sorted(Comparator.comparingInt((Beitrag b) -> b.getGefaellt_num() != null ? b.getGefaellt_num() : 0).reversed())
                .limit(5)
                .map(b -> {
                    Map<String, Object> entry = new HashMap<>();
                    entry.put("titel", b.getTitel() != null ? b.getTitel() : "Ohne Titel");
                    entry.put("likes", b.getGefaellt_num() != null ? b.getGefaellt_num() : 0);
                    entry.put("dislikes", b.getGefaellt_nicht_num() != null ? b.getGefaellt_nicht_num() : 0);
                    entry.put("views", b.getAngesehen_num() != null ? b.getAngesehen_num() : 0);
                    return entry;
                })
                .collect(Collectors.toList());
        stats.put("topBeitraege", topBeitraege);

        // Aktivste Nutzer (nach Anzahl Beitraege)
        Map<String, Long> beitraegeProUser = alleBeitraege.stream()
                .filter(b -> b.getAutor() != null && b.getAutor().getName() != null)
                .collect(Collectors.groupingBy(b -> b.getAutor().getName(), Collectors.counting()));

        List<Map<String, Object>> aktivsteNutzer = beitraegeProUser.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(10)
                .map(e -> {
                    Map<String, Object> entry = new HashMap<>();
                    entry.put("name", e.getKey());
                    entry.put("beitraege", e.getValue());
                    return entry;
                })
                .collect(Collectors.toList());
        stats.put("aktivsteNutzer", aktivsteNutzer);

        // Engagement-Rate pro Tag (Likes + Dislikes + Views letzte 30 Tage)
        List<Map<String, Object>> engagementProTag = new ArrayList<>();
        for (int i = 29; i >= 0; i--) {
            LocalDate day = now.minusDays(i);
            List<Beitrag> tagesBeitraege = alleBeitraege.stream()
                    .filter(b -> b.getDatum() != null)
                    .filter(b -> {
                        LocalDate beitragDate = b.getDatum().toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
                        return beitragDate.equals(day);
                    })
                    .toList();
            int likes = tagesBeitraege.stream().mapToInt(b -> b.getGefaellt_num() != null ? b.getGefaellt_num() : 0).sum();
            int dislikes = tagesBeitraege.stream().mapToInt(b -> b.getGefaellt_nicht_num() != null ? b.getGefaellt_nicht_num() : 0).sum();
            int views = tagesBeitraege.stream().mapToInt(b -> b.getAngesehen_num() != null ? b.getAngesehen_num() : 0).sum();

            Map<String, Object> entry = new HashMap<>();
            entry.put("datum", day.toString());
            entry.put("likes", likes);
            entry.put("dislikes", dislikes);
            entry.put("views", views);
            engagementProTag.add(entry);
        }
        stats.put("engagementProTag", engagementProTag);

        return stats;
    }
}
