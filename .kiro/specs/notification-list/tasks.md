# Implementation Plan: Notification List

## Overview

Implementierung einer persistenten Benachrichtigungsliste bestehend aus Backend (Spring Boot + MongoDB) und Frontend (React + MUI). Das Feature speichert Notifications bei Beitrag-Erstellung, stellt sie über eine REST-API bereit und zeigt sie im Frontend über ein Glocken-Icon mit Badge und Dropdown-Panel an.

## Tasks

- [x] 1. Backend: Datenmodell und Repository erstellen
  - [x] 1.1 Notification-Entity und NotificationRepository erstellen
    - Neue Datei `Notification.java` im Package `eu.strietwald.social.backend` erstellen
    - Felder: `id` (ObjectId), `recipientId` (String, indexed), `senderName` (String), `beitragTitel` (String), `beitragId` (String), `createdAt` (Instant, indexed), `read` (boolean, default false)
    - Lombok `@Getter`/`@Setter` verwenden (wie bestehende Entities)
    - Neue Datei `NotificationRepository.java` als `MongoRepository<Notification, String>` erstellen
    - Methoden: `findByRecipientIdOrderByCreatedAtDesc(String recipientId, Pageable pageable)`, `countByRecipientIdAndReadFalse(String recipientId)`, und ein Update-Query für mark-all-as-read
    - _Requirements: 1.3, 1.4_

- [x] 2. Backend: NotificationService implementieren
  - [x] 2.1 NotificationService erstellen
    - Neue Datei `NotificationService.java` als `@Service` erstellen
    - Methode `createNotifications(Beitrag beitrag, List<Person> recipients)` implementieren
    - Autor aus Empfänger-Liste ausschließen (recipientId != autor.getId())
    - `beitragTitel` auf 200 Zeichen begrenzen
    - `createdAt` auf `Instant.now()` setzen, `read` auf `false`
    - Fehler pro Empfänger loggen und mit verbleibenden fortfahren
    - `@Async` Annotation verwenden (analog zu PushNotificationService)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 2.2 Property-Tests für NotificationService schreiben (jqwik)
    - **Property 1: Notification-Erstellung exkludiert den Autor**
    - **Property 2: Notification enthält alle Pflichtfelder**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**

- [x] 3. Backend: NotificationController implementieren
  - [x] 3.1 NotificationController erstellen
    - Neue Datei `NotificationController.java` als `@RestController` mit `@RequestMapping("/notifications")` erstellen
    - `GET /notifications` mit Paginierung (`page` default 0, `size` default 20, max 100)
    - `GET /notifications/unread-count` als JSON `{ "count": n }`
    - `POST /notifications/read-all` markiert alle ungelesenen des Benutzers als gelesen
    - `UserInfo.getPerson()` für Benutzer-Identifikation verwenden (bestehendes Pattern)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4_

  - [x] 3.2 Property-Tests für NotificationController schreiben (jqwik)
    - **Property 3: Notifications werden nur für den authentifizierten Benutzer zurückgegeben**
    - **Property 4: Notifications sind absteigend nach Zeitstempel sortiert**
    - **Property 5: Unread-Count stimmt mit tatsächlich ungelesenen Notifications überein**
    - **Property 6: Mark-All-As-Read setzt alle ungelesenen Notifications auf gelesen**
    - **Property 7: Mark-All-As-Read ist idempotent**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.5, 3.1, 3.2, 3.3**

- [x] 4. Backend: Integration in BeitraegeController
  - [x] 4.1 BeitraegeController um NotificationService-Aufruf erweitern
    - `NotificationService` per `@Autowired` injizieren
    - In `uploadBeitrag()` nach dem Speichern des Beitrags `notificationService.createNotifications(beitrag, recipients)` aufrufen
    - Der Aufruf erfolgt parallel zum bestehenden `pushNotificationService.sendToPersons()` (beide Mechanismen unabhängig)
    - _Requirements: 1.1, 1.2_

- [x] 5. Checkpoint - Backend verifizieren
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Frontend: Datentyp und Hook erstellen
  - [x] 6.1 Notification-TypeScript-Interface erstellen
    - Neue Datei `src/datenformat/Notification.ts` mit Interface: `id`, `senderName`, `beitragTitel`, `beitragId`, `createdAt` (string), `read` (boolean)
    - _Requirements: 2.2_

  - [x] 6.2 useNotifications Hook implementieren
    - Neue Datei `src/useNotifications.ts` erstellen
    - State: `notifications`, `unreadCount`, `loading`, `error`
    - `fetchUnreadCount()`: GET `/notifications/unread-count` — beim Mount aufrufen
    - `fetchNotifications()`: GET `/notifications?page=0&size=50` — on-demand beim Panel-Öffnen
    - `markAllAsRead()`: POST `/notifications/read-all` — setzt `unreadCount` lokal auf 0
    - Fehlerbehandlung: bei API-Fehler `error`-State setzen, vorherige Daten beibehalten
    - Auth-Token aus den Props/Context verwenden (bestehendes Pattern der App)
    - _Requirements: 2.1, 2.3, 3.1, 4.1, 4.6, 5.7_

- [x] 7. Frontend: NotificationPanel-Komponente erstellen
  - [x] 7.1 NotificationPanel mit MUI Popover implementieren
    - Neue Datei `src/NotificationPanel.tsx` erstellen
    - MUI `Popover` als Container verwenden
    - Liste der Notifications mit `senderName` (max 50 Zeichen + "…"), `beitragTitel` (max 100 Zeichen + "…"), Zeitstempel im Format "TT.MM.JJJJ, HH:MM Uhr"
    - Ungelesene Notifications visuell hervorheben (z.B. Hintergrundfarbe)
    - Beim Öffnen: Notifications laden und alle als gelesen markieren
    - Leer-Zustand: Hinweistext "Keine Benachrichtigungen vorhanden"
    - Fehler-Zustand: Fehlermeldung anzeigen, vorherige Daten beibehalten
    - Schließen bei Klick außerhalb (Popover-Standard)
    - Zeitstempel-Formatierung: UTC → lokale Zeitzone via `Intl.DateTimeFormat`, ungültige Werte → "—"
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.1, 6.2, 6.3, 6.4_

  - [x] 7.2 Property-Tests für Badge-Logik und Zeitstempel-Formatierung (fast-check)
    - **Property 8: Badge-Anzeige folgt dem Ungelesen-Zähler**
    - **Property 9: Zeitstempel-Formatierung Roundtrip**
    - **Property 10: Ungültige Zeitstempel zeigen Platzhalter**
    - **Validates: Requirements 4.2, 4.3, 4.4, 6.1, 6.2, 6.3, 6.4**

- [x] 8. Frontend: Integration in Navbar
  - [x] 8.1 Navbar um NotificationPanel und Badge erweitern
    - `useNotifications` Hook in der Navbar oder übergeordneten Komponente einbinden
    - Glocken-Icon mit dynamischem Badge: `unreadCount == 0` → kein Badge, `1–99` → exakte Zahl, `>99` → "99+"
    - Klick auf Glocke öffnet `NotificationPanel` (Popover-Anchor = Glocken-IconButton)
    - Bestehende statische Badge-Werte (hardcoded `17`) durch dynamischen `unreadCount` ersetzen
    - Auch im Mobile-Menü die Notification-Funktionalität integrieren
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.5_

- [x] 9. Final Checkpoint - Gesamtsystem verifizieren
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Backend uses Java (Spring Boot + MongoDB + jqwik), Frontend uses TypeScript (React + MUI + fast-check)
- Existing patterns to follow: `PersonRepository`, `BeitragRepository`, `UserInfo`, `PushNotificationService`
- The `@Async` annotation on `NotificationService.createNotifications()` ensures non-blocking execution (same pattern as `PushNotificationService`)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "6.1"] },
    { "id": 1, "tasks": ["2.1", "6.2"] },
    { "id": 2, "tasks": ["2.2", "3.1"] },
    { "id": 3, "tasks": ["3.2", "4.1"] },
    { "id": 4, "tasks": ["7.1"] },
    { "id": 5, "tasks": ["7.2", "8.1"] }
  ]
}
```
