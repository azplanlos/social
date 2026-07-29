# Implementation Plan: Kommentare

## Overview

Implementierung der Kommentarfunktion mit verschachtelten Antworten und Like-Toggle. Das Backend folgt dem bestehenden Spring Boot + MongoDB-Muster (Entity, Repository, Controller). Das Frontend verwendet React + MUI mit Glasmorphismus-Styling. Die Implementierung erfolgt inkrementell: zuerst Datenmodell und Backend-API, dann Frontend-Komponenten, abschließend Integration.

## Tasks

- [x] 1. Backend: Datenmodell und Repository
  - [x] 1.1 Erstelle Kommentar Entity und KommentarRequest DTO
    - Erstelle `Kommentar.java` in `eu.strietwald.social.backend` mit den Feldern: id (MongoId), beitragId (indexed), elternKommentarId, text, autor (Person), datum (Date), likes (List<Person>), likes_num (Integer)
    - Erstelle `KommentarRequest.java` DTO mit Feldern: text, elternKommentarId (optional)
    - Verwende Lombok (@Getter, @Setter, @ToString) und @Document(collection = "kommentare")
    - Füge @Indexed Annotation auf beitragId hinzu
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 1.2 Erstelle KommentarRepository
    - Erstelle `KommentarRepository.java` Interface extending MongoRepository<Kommentar, String>
    - Definiere Query-Methode: `List<Kommentar> findByBeitragIdOrderByDatumAsc(String beitragId)`
    - _Requirements: 2.1, 6.2_

- [x] 2. Backend: KommentarController
  - [x] 2.1 Implementiere GET /beitrag/{beitragId}/kommentare
    - Erstelle `KommentarController.java` als @RestController
    - Injiziere UserInfo und KommentarRepository via @Autowired
    - Implementiere GET-Endpunkt der alle Kommentare eines Beitrags chronologisch sortiert zurückgibt
    - _Requirements: 2.1_

  - [x] 2.2 Implementiere POST /beitrag/{beitragId}/kommentar
    - Validiere dass text nicht leer/whitespace-only ist (return 400 bei Verletzung)
    - Setze autor aus userInfo.getPerson(), datum auf new Date()
    - Setze beitragId aus Path-Variable
    - Speichere und gib den erstellten Kommentar zurück
    - _Requirements: 1.1, 1.2, 1.3, 3.1, 6.3_

  - [x] 2.3 Implementiere POST /kommentar/{id}/like
    - Lade Kommentar per ID (orElseThrow für 404)
    - Toggle-Logik: Wenn User schon in likes → entfernen und likes_num--, sonst hinzufügen und likes_num++
    - Folge dem bestehenden Muster aus BeitraegeController.like()
    - _Requirements: 4.1, 4.2, 4.5_

  - [ ]* 2.4 Schreibe Property-Tests für KommentarController
    - **Property 2: Whitespace rejection** — Generiere zufällige Whitespace-Strings, verifiziere Ablehnung
    - **Property 3: Chronological ordering** — Generiere Kommentare mit verschiedenen Timestamps, verifiziere Sortierreihenfolge
    - **Property 6: Like toggle round-trip** — Like zweimal togglen gibt Originalzustand zurück
    - **Validates: Requirements 1.2, 2.1, 4.1, 4.2**

- [x] 3. Checkpoint - Backend API verifizieren
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Frontend: Datenmodell und Komponenten
  - [x] 4.1 Erstelle Frontend-Datenmodell Kommentar.tsx
    - Erstelle `src/datenformat/Kommentar.tsx` mit TypeScript-Klasse
    - Felder: id, beitragId, elternKommentarId (optional/null), text, autor (Person), datum (Date), likes (Person[]), likes_num
    - Folge dem bestehenden Muster aus Beitrag.tsx
    - _Requirements: 6.1_

  - [x] 4.2 Erstelle KommentarEingabe.tsx
    - Implementiere Texteingabefeld (MUI TextField) mit Senden-IconButton (SendIcon)
    - Senden-Button deaktiviert solange text.trim() leer ist
    - POST-Request an `/beitrag/{beitragId}/kommentar` mit {text, elternKommentarId}
    - Nach erfolgreichem Submit: Input leeren und onKommentarErstellt() Callback aufrufen
    - Glasmorphismus-Styling konsistent mit dem Rest der App
    - _Requirements: 1.1, 1.4, 5.1, 5.2, 5.3_

  - [x] 4.3 Erstelle KommentarCard.tsx
    - Zeige Avatar, Autorname, Kommentartext, Datum (formatiert mit toLocaleString())
    - Like-IconButton mit Badge (likes_num), hervorgehoben wenn User in likes-Liste
    - "Antworten"-Button der ein KommentarEingabe-Feld einblendet (Toggle-State)
    - Rekursives Rendering der Kind-Kommentare mit erhöhter Einrückung (marginLeft basierend auf tiefe)
    - Like-Toggle: POST `/kommentar/{id}/like` → refetch
    - _Requirements: 2.2, 3.2, 4.3, 4.4, 5.2_

  - [x] 4.4 Erstelle KommentarBereich.tsx
    - Lade Kommentare via GET `/beitrag/{beitragId}/kommentare`
    - Baue Baumstruktur: Gruppiere Kommentare nach elternKommentarId in einer Map
    - Rendere Top-Level-Kommentare (elternKommentarId === null) als KommentarCard
    - Zeige leeren Zustand ("Noch keine Kommentare") wenn Liste leer
    - Zeige KommentarEingabe am Ende für neue Top-Level-Kommentare
    - _Requirements: 2.1, 2.3, 3.2_

- [x] 5. Frontend: Integration in BeitragCard
  - [x] 5.1 Integriere KommentarBereich in die App
    - Füge einen Kommentar-Icon-Button in BeitragCard CardActions hinzu (ChatBubbleOutlineIcon mit Badge für Kommentar-Anzahl)
    - Bei Klick: KommentarBereich unterhalb des BeitragCard ein-/ausblenden (Collapse/Expand)
    - Übergib beitragId, token und user als Props
    - _Requirements: 2.1, 5.1_

  - [ ]* 5.2 Schreibe Unit-Tests für Frontend-Komponenten
    - KommentarEingabe: Button-Disabled bei leerem Text, Input-Clearing nach Submit
    - KommentarCard: Rendering aller Felder, Like-Highlight-State
    - KommentarBereich: Baumaufbau-Logik, leerer Zustand
    - _Requirements: 1.4, 2.2, 2.3, 4.4, 5.3_

- [x] 6. Final Checkpoint - Alle Tests bestehen
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Das Backend folgt exakt dem Muster von BeitraegeController (Autowired UserInfo, Repository, REST-Endpunkte)
- Der Like-Toggle folgt dem gleichen Muster wie in BeitraegeController.like()
- Die Frontend-Komponenten verwenden das gleiche Glasmorphismus-Styling (rgba backgrounds, backdrop-filter, border-radius)
- Axios-Calls folgen dem bestehenden Pattern mit Authorization Header und withCredentials
- Die Baumstruktur wird clientseitig aufgebaut — das Backend liefert eine flache, nach datum sortierte Liste

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "4.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["2.1", "2.2", "2.3"] },
    { "id": 3, "tasks": ["2.4", "4.2", "4.3"] },
    { "id": 4, "tasks": ["4.4"] },
    { "id": 5, "tasks": ["5.1"] },
    { "id": 6, "tasks": ["5.2"] }
  ]
}
```
