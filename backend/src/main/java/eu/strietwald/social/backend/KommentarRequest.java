package eu.strietwald.social.backend;

import lombok.Getter;
import lombok.Setter;


@Getter
@Setter
public class KommentarRequest {
    private String text;
    private String elternKommentarId;
}
