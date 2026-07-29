# Requirements Document

## Einleitung

Diese Spezifikation beschreibt die Navigation zu Benutzerprofilen innerhalb der Social-App. Nutzer sollen über das Avatar-Bild in Beiträgen (Posts) zum Profil des jeweiligen Autors navigieren können. Die Profilseite zeigt den Namen, das Avatar-Bild und alle Beiträge des betreffenden Nutzers an. Das Feature ergänzt die bestehende eigene Profilseite (`/profile`) um eine öffentliche Profilansicht für beliebige Nutzer.

## Glossar

- **App**: Die React/TypeScript Single-Page-Application im Frontend
- **Backend**: Der Spring Boot REST-API-Server mit MongoDB
- **BeitragCard**: Die UI-Komponente, die einen einzelnen Beitrag (Post) im Feed darstellt
- **Beitrag**: Ein Post bestehend aus Bild, Titel, Beschreibung, Autor und Metadaten
- **Person**: Ein registrierter Nutzer mit `id`, `name` und optionalem `avatar_url`
- **Profilseite**: Die Seite, die Avatar, Name und Beiträge eines Nutzers anzeigt
- **Feed**: Die Hauptansicht (`/secure`) mit dem chronologisch paginierten Beitrags-Stream

## Requirements

### Requirement 1: Klickbarer Avatar im BeitragCard

**User Story:** Als Nutzer möchte ich auf das Avatar-Bild eines Beitragsautors klicken können, damit ich zum Profil dieses Nutzers navigiert werde.

#### Acceptance Criteria

1. WHEN der Nutzer auf den Avatar im CardHeader einer BeitragCard klickt, THE App SHALL zur Route `/user/:personName` navigieren, wobei `:personName` dem `name`-Feld des `autor`-Objekts des Beitrags entspricht (URL-kodiert falls Sonderzeichen enthalten)
2. THE App SHALL den Avatar im CardHeader der BeitragCard als klickbares Element mit `cursor: pointer` darstellen, sodass der Nutzer visuell erkennt, dass der Avatar interaktiv ist
3. IF die BeitragCard im Bearbeitungsmodus (bearbeiten=true) angezeigt wird und kein `autor`-Objekt vorhanden ist, THEN THE App SHALL den Avatar ohne Klick-Interaktion darstellen und keine Navigation auslösen
4. IF das `name`-Feld des Beitragsautors leer oder undefiniert ist, THEN THE App SHALL keine Navigation auslösen und den Avatar ohne Klick-Interaktion darstellen

### Requirement 2: Öffentliche Profilseite

**User Story:** Als Nutzer möchte ich das Profil eines anderen Nutzers sehen können, damit ich dessen Avatar, Namen und alle Beiträge einsehen kann.

#### Acceptance Criteria

1. WHEN die Route `/user/:personName` aufgerufen wird, THE App SHALL eine Profilseite anzeigen, die den Avatar (als rundes Bild, maximal 120x120 Pixel Darstellungsgröße) und den Namen der Person in einer Liquid-Glass-Card oberhalb der Beitragsliste darstellt
2. WHEN die Profilseite geladen wird, THE App SHALL alle öffentlichen Beiträge (Beiträge ohne eingeschränkte Empfängerliste) des betreffenden Nutzers in chronologisch absteigender Reihenfolge (neueste zuerst) unterhalb der Profilinformationen unter Verwendung der bestehenden BeitragCard-Komponente anzeigen
3. WHILE die Beiträge vom Backend geladen werden, THE App SHALL einen zentrierten MUI CircularProgress-Spinner anstelle der Beitragsliste anzeigen
4. IF der angegebene `personName` keinem existierenden Nutzer in der Datenbank entspricht, THEN THE App SHALL anstelle der Profilinformationen eine Fehlermeldung anzeigen, die darauf hinweist, dass der Nutzer nicht gefunden wurde, sowie einen Button zur Navigation zurück zum Feed
5. THE Profilseite SHALL einen Zurück-Button (ArrowBackIcon) im oberen Bereich enthalten, der den Nutzer per `navigate('/')` zum Feed navigiert
6. WHEN die Beitragsliste des Nutzers geladen wird und keine Beiträge vorhanden sind, THE App SHALL unterhalb der Profilinformationen einen Hinweistext anzeigen, der kommuniziert, dass dieser Nutzer noch keine Beiträge veröffentlicht hat
7. IF das Laden der Profildaten oder Beiträge fehlschlägt (Netzwerkfehler oder Server-Fehler), THEN THE App SHALL eine Fehlermeldung anzeigen, die auf ein Ladeproblem hinweist, und einen Erneut-Versuchen-Button anbieten

### Requirement 3: Backend-Endpoint für Beiträge eines Nutzers

**User Story:** Als Frontend-Entwickler möchte ich Beiträge eines bestimmten Nutzers vom Backend abrufen können, damit die Profilseite die relevanten Beiträge anzeigen kann.

#### Acceptance Criteria

1. WHEN eine authentifizierte GET-Anfrage an `/beitraege/user/{personName}` mit optionalen Query-Parametern `page` (Standard: 0) und `size` (Standard: 10, Maximum: 50) gesendet wird, THE Backend SHALL alle Beiträge, deren `autor.name` exakt (case-sensitive) dem angegebenen `personName` entspricht, paginiert und nach `datum` absteigend sortiert zurückgeben
2. THE Backend SHALL nur Beiträge zurückgeben, die der anfragende Nutzer sehen darf: ein Beitrag ist sichtbar, wenn seine `empfaenger`-Liste leer oder null ist (öffentlicher Beitrag), oder der anfragende Nutzer der Autor ist, oder der Name des anfragenden Nutzers in der `empfaenger`-Liste enthalten ist
3. IF keine sichtbaren Beiträge für den angegebenen `personName` existieren, THEN THE Backend SHALL eine leere paginierte Antwort mit `content: []` und `totalElements: 0` zurückgeben
4. IF der `size`-Parameter den Wert 50 überschreitet, THEN THE Backend SHALL den Wert auf 50 begrenzen

### Requirement 4: Pagination auf der Profilseite

**User Story:** Als Nutzer möchte ich auf der Profilseite durch viele Beiträge scrollen können, damit auch bei Nutzern mit vielen Beiträgen die Seite performant bleibt.

#### Acceptance Criteria

1. WHEN der Nutzer die Profilseite öffnet, THE App SHALL die ersten 10 Beiträge des Nutzers in absteigender chronologischer Reihenfolge laden und anzeigen
2. WHEN das Loader-Element am Ende der Beitragsliste im Viewport sichtbar wird und weitere Beiträge verfügbar sind, THE App SHALL die nächsten 10 Beiträge vom Backend nachladen und an die bestehende Liste anhängen
3. WHILE ein Nachladevorgang läuft, THE App SHALL einen Ladeindikator am Ende der Liste anzeigen und keine weiteren Requests an das Backend senden
4. WHILE keine weiteren Beiträge verfügbar sind (Backend meldet last=true), THE App SHALL den Ladeindikator ausblenden und keinen weiteren Request an das Backend senden
5. IF das Laden einer Seite fehlschlägt, THEN THE App SHALL eine Fehlermeldung anzeigen, die den Nutzer über das Scheitern des Ladevorgangs informiert, und die bereits geladenen Beiträge beibehalten

### Requirement 5: Navigation zum eigenen Profil

**User Story:** Als Nutzer möchte ich, dass ein Klick auf meinen eigenen Avatar in einem Beitrag mich ebenfalls zu meiner Profilseite mit meinen Beiträgen führt, damit das Verhalten konsistent ist.

#### Acceptance Criteria

1. WHEN der Nutzer auf den Avatar in einer BeitragCard klickt, THE App SHALL zur Route `/user/:personName` navigieren, wobei `:personName` dem Namen des Beitrag-Autors entspricht — unabhängig davon, ob es der eigene oder ein fremder Beitrag ist
2. WHEN die Route `/user/:personName` mit dem eigenen Nutzernamen aufgerufen wird, THE Profilseite SHALL den Avatar, den Namen und ausschließlich die Beiträge dieses Nutzers anzeigen — in derselben Darstellung wie für andere Nutzer
3. THE Avatar in der BeitragCard SHALL als klickbares Element erkennbar sein, indem der Cursor bei Hover auf einen Pointer wechselt
