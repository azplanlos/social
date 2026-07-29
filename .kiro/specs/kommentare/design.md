# Design Document: Kommentare

## Overview

Die Kommentarfunktion erweitert die Social-Media-App um die Möglichkeit, Textkommentare unter Beiträgen zu verfassen, auf Kommentare zu antworten (Threading) und Kommentare zu liken. Das System folgt den bestehenden Architekturmustern: Spring Boot Backend mit MongoDB, React-Frontend mit MUI und Glasmorphismus-Design.

Die Kommentare werden als eigene MongoDB-Collection gespeichert und über eine REST-API bereitgestellt. Die Verschachtelung (Threading) wird über ein `elternKommentarId`-Feld realisiert (Adjacency List Pattern).

## Architecture

```mermaid
graph TD
    subgraph Frontend [React Frontend]
        BC[BeitragCard] --> KB[KommentarBereich]
        KB --> KC[KommentarCard]
        KB --> KE[KommentarEingabe]
        KC --> KE2[KommentarEingabe - Reply]
        KC --> KC2[KommentarCard - nested]
    end

    subgraph Backend [Spring Boot Backend]
        KCtrl[KommentarController] --> KRepo[KommentarRepository]
        KCtrl --> UI[UserInfo]
        KRepo --> DB[(MongoDB: kommentare)]
    end

    KB -->|GET /beitrag/{id}/kommentare| KCtrl
    KE -->|POST /beitrag/{id}/kommentar| KCtrl
    KC -->|POST /kommentar/{id}/like| KCtrl
```

### Datenfluss

1. **Kommentare laden**: `BeitragCard` öffnet `KommentarBereich` → GET-Request → Backend liefert flache Liste → Frontend baut Baum auf
2. **Kommentar erstellen**: `KommentarEingabe` → POST-Request mit `{text, elternKommentarId?}` → Backend speichert → Frontend refetcht
3. **Like togglen**: `KommentarCard` → POST-Request → Backend togglet Like → Frontend refetcht

### Entscheidung: Flache Liste vs. Baum

Die Kommentare werden im Backend als **flache Liste** gespeichert und zurückgegeben, sortiert nach `datum` aufsteigend. Das Frontend baut den Baum (Threading) clientseitig auf. Begründung:
- Einfachere Queries im Backend
- Flexiblere Darstellungsoptionen im Frontend
- Konsistent mit dem einfachen CRUD-Muster des Projekts

## Components and Interfaces

### Backend

#### Kommentar.java (Entity)

```java
@Document(collection = "kommentare")
@Getter @Setter @ToString
public class Kommentar {
    @MongoId(FieldType.OBJECT_ID)
    private String id;

    @Field
    @Indexed
    private String beitragId;

    @Field
    private String elternKommentarId;  // null für Top-Level

    @Field
    private String text;

    @Field
    private Person autor;

    @Field
    private Date datum;

    @Field
    private List<Person> likes = new ArrayList<>();

    @Field
    private Integer likes_num = 0;
}
```

#### KommentarRepository.java

```java
public interface KommentarRepository extends MongoRepository<Kommentar, String> {
    List<Kommentar> findByBeitragIdOrderByDatumAsc(String beitragId);
}
```

#### KommentarController.java

```java
@RestController
public class KommentarController {
    @Autowired private UserInfo userInfo;
    @Autowired private KommentarRepository kommentarRepository;

    @GetMapping("/beitrag/{beitragId}/kommentare")
    public List<Kommentar> getKommentare(@PathVariable String beitragId);

    @PostMapping("/beitrag/{beitragId}/kommentar")
    public Kommentar createKommentar(@PathVariable String beitragId, @RequestBody KommentarRequest request);

    @PostMapping("/kommentar/{id}/like")
    public void likeKommentar(@PathVariable String id);
}
```

#### KommentarRequest.java (DTO)

```java
@Getter @Setter
public class KommentarRequest {
    private String text;
    private String elternKommentarId;  // optional, null für Top-Level
}
```

### Frontend

#### Kommentar.tsx (Datenmodell)

```typescript
import { Person } from "./Person";

export class Kommentar {
    id!: string;
    beitragId!: string;
    elternKommentarId?: string | null;
    text!: string;
    autor!: Person;
    datum!: Date;
    likes?: Person[];
    likes_num!: number;
}
```

#### KommentarBereich.tsx

Container-Komponente, die alle Kommentare für einen Beitrag lädt und als Baum darstellt.

**Props:**
```typescript
type KommentarBereichProps = {
    beitragId: string;
    token: string | null;
    user?: Person;
}
```

**Verantwortlichkeiten:**
- GET `/beitrag/{beitragId}/kommentare` aufrufen
- Flache Liste in Baumstruktur umwandeln (gruppiert nach `elternKommentarId`)
- `KommentarCard` für jeden Kommentar rendern (rekursiv für Antworten)
- `KommentarEingabe` am Ende für neue Top-Level-Kommentare anzeigen
- Leeren Zustand anzeigen wenn keine Kommentare vorhanden

#### KommentarCard.tsx

Einzelne Kommentar-Darstellung mit Like-Button und Antworten-Button.

**Props:**
```typescript
type KommentarCardProps = {
    kommentar: Kommentar;
    antworten: Kommentar[];  // direkte Kind-Kommentare
    alleKommentare: Map<string | null, Kommentar[]>;  // gesamter Baum für Rekursion
    token: string | null;
    user?: Person;
    refetch: () => void;
    tiefe: number;  // Einrückungstiefe
}
```

**Verantwortlichkeiten:**
- Autor-Avatar, Name, Text, Datum anzeigen
- Like-Button mit Zähler und Highlight-Zustand
- "Antworten"-Button der `KommentarEingabe` einblendet
- Rekursiv `KommentarCard` für Kind-Kommentare rendern (eingerückt)

#### KommentarEingabe.tsx

Texteingabefeld mit Senden-Button.

**Props:**
```typescript
type KommentarEingabeProps = {
    beitragId: string;
    elternKommentarId?: string | null;
    token: string | null;
    onKommentarErstellt: () => void;  // Callback zum Refetchen
}
```

**Verantwortlichkeiten:**
- TextField + IconButton (Send)
- Senden-Button deaktiviert solange Text leer/whitespace-only
- POST-Request bei Submit
- Eingabefeld leeren nach erfolgreichem Submit
- Validierung: kein Submit bei leerem Text

### API-Endpunkte

| Methode | Pfad | Body | Response | Auth |
|---------|------|------|----------|------|
| GET | `/beitrag/{beitragId}/kommentare` | - | `List<Kommentar>` | Ja |
| POST | `/beitrag/{beitragId}/kommentar` | `{text, elternKommentarId?}` | `Kommentar` | Ja |
| POST | `/kommentar/{id}/like` | - | `void` | Ja |

## Data Models

### MongoDB Collection: `kommentare`

```json
{
    "_id": ObjectId("..."),
    "beitragId": "64a...",
    "elternKommentarId": null,
    "text": "Tolles Bild!",
    "autor": {
        "name": "Max",
        "avatar_url": "abc123.jpg"
    },
    "datum": ISODate("2024-01-15T10:30:00Z"),
    "likes": [
        { "name": "Anna", "avatar_url": "def456.jpg" }
    ],
    "likes_num": 1
}
```

### Index

- `beitragId` (ascending) — für effiziente Abfrage aller Kommentare eines Beitrags

### Baumaufbau im Frontend

Die flache Liste wird clientseitig in eine Map gruppiert:

```typescript
// Gruppierung: elternKommentarId -> Kommentar[]
const kommentarBaum = new Map<string | null, Kommentar[]>();
kommentare.forEach(k => {
    const parentId = k.elternKommentarId || null;
    if (!kommentarBaum.has(parentId)) {
        kommentarBaum.set(parentId, []);
    }
    kommentarBaum.get(parentId)!.push(k);
});
// Top-Level: kommentarBaum.get(null)
// Antworten auf Kommentar X: kommentarBaum.get(X.id)
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Comment creation persistence

*For any* valid (non-empty, non-whitespace-only) comment text and any authenticated user, creating a comment SHALL result in a persisted document containing all required fields: id, beitragId, elternKommentarId, text, autor (with name and avatar_url), datum, and likes.

**Validates: Requirements 1.1, 6.1**

### Property 2: Whitespace rejection

*For any* string composed entirely of whitespace characters (spaces, tabs, newlines, or empty string), attempting to create a comment SHALL be rejected and the total comment count for the associated Beitrag SHALL remain unchanged.

**Validates: Requirements 1.2**

### Property 3: Chronological ordering

*For any* set of comments belonging to the same Beitrag, the list returned by the API SHALL be sorted in ascending order by datum (oldest first), i.e. for all indices i < j: `kommentare[i].datum <= kommentare[j].datum`.

**Validates: Requirements 2.1**

### Property 4: Comment rendering completeness

*For any* Kommentar object with defined fields, the rendered KommentarCard SHALL display the autor name, avatar image, comment text, timestamp, and current like count.

**Validates: Requirements 2.2, 4.3**

### Property 5: Reply parent reference integrity

*For any* reply created with a given elternKommentarId, the persisted document SHALL contain that exact elternKommentarId. For any top-level comment (no parent specified), elternKommentarId SHALL be null.

**Validates: Requirements 3.1, 6.3**

### Property 6: Like toggle round-trip

*For any* comment and any authenticated user, liking the comment twice (toggle on then toggle off) SHALL return the comment's like list and like count to their original state.

**Validates: Requirements 4.1, 4.2**

### Property 7: Like highlight state consistency

*For any* comment, the Like-Symbol SHALL be highlighted if and only if the current user's name appears in the comment's likes list.

**Validates: Requirements 4.4**

### Property 8: Nested reply UI structure

*For any* comment tree, replies SHALL be rendered as children of their parent comment with increased indentation (tiefe), and the DOM structure SHALL reflect the parent-child relationship defined by elternKommentarId.

**Validates: Requirements 3.2**

## Error Handling

| Szenario | Backend-Verhalten | HTTP Status | Frontend-Verhalten |
|----------|-------------------|-------------|-------------------|
| Nicht authentifiziert | Request abgelehnt | 401 | Redirect zu Login (bestehender Interceptor) |
| Leerer Kommentartext | Validation Error | 400 (Bad Request) | Button deaktiviert (Prävention) |
| Beitrag nicht gefunden | Exception | 404 | Fehlermeldung anzeigen |
| Kommentar nicht gefunden (Like) | Exception | 404 | Fehlermeldung anzeigen |
| Server-Fehler | Internal Error | 500 | Snackbar mit Fehlermeldung |

### Validierung

- **Backend**: Text-Feld darf nicht leer oder nur Whitespace sein. Prüfung im Controller vor dem Speichern.
- **Frontend**: Senden-Button deaktiviert wenn Input leer. Doppelte Absicherung gegen Manipulation.

## Testing Strategy

### Unit Tests (Backend)

- `KommentarController`: Testen der Endpunkte mit MockMvc
  - Kommentar erstellen (happy path)
  - Leerer Text wird abgelehnt (400)
  - Like-Toggle (hinzufügen/entfernen)
  - Kommentare abrufen (sortiert)

### Unit Tests (Frontend)

- `KommentarEingabe`: Button-Disabled-State, Submit-Verhalten, Input-Clearing
- `KommentarCard`: Rendering aller Felder, Like-Highlight-Zustand
- `KommentarBereich`: Baumaufbau, leerer Zustand, Rekursion

### Property-Based Tests

Bibliothek: **jqwik** (für Java/Spring Boot Backend-Logik)

Konfiguration: Minimum 100 Iterationen pro Property-Test.

Jeder Test referenziert die zugehörige Correctness Property:

- **Property 1** (Comment creation persistence): Generiere zufällige gültige Kommentar-Texte, verifiziere vollständige Persistenz
- **Property 2** (Whitespace rejection): Generiere Whitespace-only-Strings, verifiziere Ablehnung
- **Property 3** (Chronological ordering): Generiere zufällige Kommentar-Sets mit verschiedenen Timestamps, verifiziere Sortierung
- **Property 5** (Reply parent reference): Generiere Kommentar-Bäume, verifiziere elternKommentarId-Integrität
- **Property 6** (Like toggle round-trip): Generiere zufällige Like-Szenarien, verifiziere Toggle-Idempotenz

Tag-Format: `Feature: kommentare, Property {N}: {title}`

### Integration Tests

- End-to-end Flow: Kommentar erstellen → abrufen → liken → abrufen
- Authentifizierung: Requests ohne Token werden abgelehnt
- MongoDB-Index: Verify Index auf `beitragId` existiert
