# Requirements Document

## Introduction

Dieses Feature erweitert die bestehende Social-App um eine persistente Benachrichtigungsliste. Aktuell werden Push-Benachrichtigungen nur als Web-Push versendet, ohne sie in der Datenbank zu speichern. Zukünftig sollen alle Benachrichtigungen in MongoDB gespeichert und über das Glocken-Icon in der Navbar abrufbar sein – inklusive genauem Datum und Uhrzeit.

## Glossary

- **Notification_Service**: Der Backend-Service, der Benachrichtigungen persistent in der Datenbank speichert und über eine REST-API bereitstellt.
- **Notification_Panel**: Die UI-Komponente im Frontend, die beim Klick auf das Glocken-Icon eine Liste aller Benachrichtigungen des aktuellen Benutzers anzeigt.
- **Notification**: Ein persistiertes Objekt in der Datenbank, das Informationen über ein Ereignis enthält (z.B. neuer Beitrag), inklusive Zeitstempel, Absender und Gelesen-Status.
- **Badge**: Die numerische Anzeige am Glocken-Icon, die die Anzahl ungelesener Benachrichtigungen darstellt.

## Requirements

### Requirement 1: Benachrichtigungen persistent speichern

**User Story:** Als Benutzer möchte ich, dass alle meine Benachrichtigungen gespeichert werden, damit ich sie auch später noch einsehen kann.

#### Acceptance Criteria

1. WHEN ein neuer Beitrag mit einer nicht-leeren Empfänger-Liste erstellt wird, THE Notification_Service SHALL eine Notification für jeden Empfänger in der Empfänger-Liste in der Datenbank speichern, wobei der Autor des Beitrags keine Notification erhält.
2. WHEN ein neuer Beitrag mit einer leeren Empfänger-Liste (öffentlicher Beitrag) erstellt wird, THE Notification_Service SHALL eine Notification für jeden registrierten Benutzer außer dem Autor in der Datenbank speichern.
3. THE Notification SHALL die folgenden Felder enthalten: eine eindeutige ID, die Empfänger-Person-ID, den Absender-Namen (Name des Autors), den Beitrag-Titel (maximal 200 Zeichen), die Beitrag-ID, einen Zeitstempel (Datum und Uhrzeit in UTC) und einen Gelesen-Status (initialer Wert: false).
4. WHEN eine Notification gespeichert wird, THE Notification_Service SHALL den Zeitstempel auf den aktuellen Zeitpunkt (UTC) setzen.
5. IF das Speichern einer Notification in der Datenbank fehlschlägt, THEN THE Notification_Service SHALL den Fehler protokollieren und die Verarbeitung der verbleibenden Empfänger fortsetzen.

### Requirement 2: Benachrichtigungen über REST-API abrufen

**User Story:** Als Benutzer möchte ich meine Benachrichtigungen über eine API abrufen können, damit das Frontend sie anzeigen kann.

#### Acceptance Criteria

1. WHEN ein authentifizierter Benutzer GET /notifications aufruft, THE Notification_Service SHALL die Notifications des Benutzers absteigend nach Zeitstempel sortiert zurückgeben, wobei die Ergebnisse mit den Query-Parametern `page` (Standard: 0) und `size` (Standard: 20, Maximum: 100) paginiert werden.
2. WHEN ein authentifizierter Benutzer GET /notifications aufruft, THE Notification_Service SHALL jede Notification mit folgenden Feldern zurückgeben: ID, Absender-Name, Beitrag-Titel, Beitrag-ID, Zeitstempel und Gelesen-Status.
3. WHEN ein authentifizierter Benutzer GET /notifications/unread-count aufruft, THE Notification_Service SHALL die Anzahl der ungelesenen Notifications des Benutzers als ganzzahligen Wert (≥ 0) zurückgeben.
4. IF ein nicht-authentifizierter Benutzer die Notifications-API aufruft, THEN THE Notification_Service SHALL mit HTTP-Status 401 antworten und keinen Notification-Inhalt zurückgeben.
5. THE Notification_Service SHALL den anfragenden Benutzer anhand der Person-ID aus dem authentifizierten JWT-Token identifizieren und ausschließlich dessen eigene Notifications zurückgeben.

### Requirement 3: Benachrichtigungen als gelesen markieren

**User Story:** Als Benutzer möchte ich Benachrichtigungen als gelesen markieren können, damit ich den Überblick über neue Benachrichtigungen behalte.

#### Acceptance Criteria

1. WHEN ein authentifizierter Benutzer POST /notifications/read-all aufruft, THE Notification_Service SHALL alle Notifications des Benutzers, deren read-Feld auf false gesetzt ist, auf read=true setzen und eine Erfolgsantwort innerhalb von 2 Sekunden zurückgeben.
2. WHEN Notifications als gelesen markiert werden, THE Notification_Service SHALL den Ungelesen-Zähler des Benutzers auf 0 zurücksetzen.
3. IF der Benutzer beim Aufruf von POST /notifications/read-all keine ungelesenen Notifications besitzt, THEN THE Notification_Service SHALL eine Erfolgsantwort zurückgeben ohne Daten zu verändern.
4. IF der Aufruf von POST /notifications/read-all fehlschlägt, THEN THE Notification_Service SHALL eine Fehlermeldung zurückgeben, die den Fehlergrund angibt, und keine Notifications verändern.

### Requirement 4: Glocken-Icon mit aktuellem Ungelesen-Zähler

**User Story:** Als Benutzer möchte ich am Glocken-Icon die Anzahl meiner ungelesenen Benachrichtigungen sehen, damit ich weiß, ob es Neuigkeiten gibt.

#### Acceptance Criteria

1. WHEN die Navbar geladen wird, THE Notification_Panel SHALL die aktuelle Anzahl ungelesener Notifications vom Backend (GET /notifications/unread-count) abrufen und im Badge anzeigen.
2. WHILE der Ungelesen-Zähler 0 ist, THE Notification_Panel SHALL das Badge ausblenden (kein Badge-Element sichtbar).
3. WHILE der Ungelesen-Zähler größer als 0 und kleiner oder gleich 99 ist, THE Notification_Panel SHALL die exakte Zahl im Badge anzeigen.
4. WHILE der Ungelesen-Zähler größer als 99 ist, THE Notification_Panel SHALL "99+" im Badge anzeigen.
5. WHEN die Notifications als gelesen markiert werden (nach Öffnen des Notification_Panels), THE Notification_Panel SHALL den Badge-Zähler auf 0 setzen und das Badge ausblenden.
6. IF der API-Aufruf zum Abrufen des Ungelesen-Zählers fehlschlägt, THEN THE Notification_Panel SHALL das Badge ausblenden und keinen Zähler anzeigen.

### Requirement 5: Benachrichtigungsliste beim Klick auf die Glocke anzeigen

**User Story:** Als Benutzer möchte ich beim Klick auf die Glocke alle meine Benachrichtigungen sehen, damit ich informiert bleibe.

#### Acceptance Criteria

1. WHEN der Benutzer auf das Glocken-Icon klickt, THE Notification_Panel SHALL ein Dropdown-Panel öffnen und die Notifications des Benutzers in absteigender chronologischer Reihenfolge (neueste zuerst) anzeigen, begrenzt auf maximal 50 Einträge.
2. THE Notification_Panel SHALL jede Notification mit dem Absender-Namen (maximal 50 Zeichen, danach abgeschnitten mit "…"), dem Beitrag-Titel (maximal 100 Zeichen, danach abgeschnitten mit "…") und dem Zeitstempel im Format "TT.MM.JJJJ, HH:MM Uhr" anzeigen.
3. THE Notification_Panel SHALL ungelesene Notifications visuell von gelesenen Notifications unterscheidbar darstellen.
4. WHEN das Notification_Panel geöffnet wird und ungelesene Notifications vorhanden sind, THE Notification_Panel SHALL alle angezeigten Notifications als gelesen markieren.
5. WHEN der Benutzer außerhalb des Notification_Panels klickt, THE Notification_Panel SHALL sich schließen.
6. IF keine Notifications vorhanden sind, THEN THE Notification_Panel SHALL einen Hinweistext anzeigen, der kommuniziert, dass keine Benachrichtigungen vorliegen.
7. IF das Laden der Notifications fehlschlägt, THEN THE Notification_Panel SHALL eine Fehlermeldung anzeigen, die den Benutzer über das Ladeproblem informiert, und die zuvor geladenen Daten beibehalten.

### Requirement 6: Zeitstempel-Anzeige

**User Story:** Als Benutzer möchte ich das genaue Datum und die Uhrzeit jeder Benachrichtigung sehen, damit ich weiß, wann etwas passiert ist.

#### Acceptance Criteria

1. THE Notification_Panel SHALL den Zeitstempel jeder Notification im Format "TT.MM.JJJJ, HH:MM Uhr" anzeigen (z.B. "25.07.2026, 14:32 Uhr"), wobei TT zweistellig (01–31), MM zweistellig (01–12), JJJJ vierstellig, und HH:MM im 24-Stunden-Format (00:00–23:59) dargestellt werden.
2. THE Notification_Panel SHALL den Zeitstempel in der lokalen Zeitzone des Benutzers anzeigen, ermittelt über die Zeitzoneneinstellung des Browsers mittels JavaScript Intl API.
3. IF eine Notification keinen gültigen Zeitstempel enthält (null, undefined oder ungültiges Datum), THEN THE Notification_Panel SHALL anstelle des Zeitstempels den Platzhaltertext "—" anzeigen.
4. WHEN der UTC-Zeitstempel vom Backend empfangen wird, THE Notification_Panel SHALL diesen vor der Anzeige in die lokale Zeitzone des Benutzers konvertieren, sodass die angezeigte Zeit der Ortszeit des Benutzers entspricht.
