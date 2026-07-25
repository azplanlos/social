package eu.strietwald.social.backend;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class ContactListController {

    private final Logger logger = LoggerFactory.getLogger(ContactListController.class);

    @Autowired
    private UserInfo userInfo;

    @Autowired
    private ContactListRepository contactListRepository;

    @GetMapping("/contactlists")
    public List<ContactList> getContactLists() {
        return contactListRepository.findByOwnerName(userInfo.getPerson().getName());
    }

    @PostMapping("/contactlists")
    public ContactList createContactList(@RequestBody ContactList contactList) {
        logger.info("Neue Kontaktliste: " + contactList.getName());
        contactList.setId(null);
        contactList.setOwner(userInfo.getPerson());
        return contactListRepository.save(contactList);
    }

    @PutMapping("/contactlists/{id}")
    public ContactList updateContactList(@PathVariable("id") String id, @RequestBody ContactList contactList) {
        ContactList existing = contactListRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (!existing.getOwner().getName().equals(userInfo.getPerson().getName())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }

        existing.setName(contactList.getName());
        existing.setMembers(contactList.getMembers());
        return contactListRepository.save(existing);
    }

    @DeleteMapping("/contactlists/{id}")
    public void deleteContactList(@PathVariable("id") String id) {
        ContactList existing = contactListRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (!existing.getOwner().getName().equals(userInfo.getPerson().getName())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }

        contactListRepository.deleteById(id);
    }
}
