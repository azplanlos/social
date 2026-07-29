# Requirements Document

## Introduction

Kommentarfunktion für die Social-Media-App. Benutzer können Textkommentare unter Beiträgen (Posts) verfassen, auf bestehende Kommentare antworten (verschachtelte/threaded Kommentare) und Kommentare liken. Die Kommentare werden in MongoDB gespeichert und über eine REST-API bereitgestellt.

## Glossary

- **Kommentar_System**: Das Backend-Subsystem, das Kommentare erstellt, speichert, abruft und verwaltet
- **Kommentar_UI**: Die Frontend-Komponente, die Kommentare anzeigt und Benutzereingaben entgegennimmt
- **Kommentar**: Ein Textbeitrag eines authentifizierten Benutzers, der einem Beitrag oder einem anderen Kommentar zugeordnet ist
- **Beitrag**: Ein Post in der Social-Media-App (bestehendes Datenmodell)
- **Person**: Ein registrierter Benutzer der App (bestehendes Datenmodell)
- **Antwort**: Ein Kommentar, der als Reaktion auf einen anderen Kommentar verfasst wird (erzeugt Verschachtelung)
- **Like**: Eine positive Bewertung eines Kommentars durch einen authentifizierten Benutzer

## Requirements

### Requirement 1: Kommentar erstellen

**User Story:** Als authentifizierter Benutzer möchte ich einen Textkommentar unter einem Beitrag verfassen, damit ich meine Meinung oder Reaktion zu einem Beitrag teilen kann.

#### Acceptance Criteria

1. WHEN ein authentifizierter Benutzer einen nicht-leeren Kommentartext eingibt und absenden bestätigt, THE Kommentar_System SHALL den Kommentar mit Autorname, Avatar-URL, Text und aktuellem Zeitstempel in der Datenbank speichern und dem Beitrag zuordnen.
2. WHEN ein Benutzer versucht einen leeren oder nur aus Leerzeichen bestehenden Kommentar abzusenden, THE Kommentar_System SHALL die Erstellung ablehnen und den aktuellen Zustand beibehalten.
3. WHEN ein nicht-authentifizierter Benutzer versucht einen Kommentar zu erstellen, THE Kommentar_System SHALL die Anfrage mit einem Authentifizierungsfehler ablehnen.
4. WHEN ein Kommentar erfolgreich erstellt wurde, THE Kommentar_UI SHALL das Eingabefeld leeren und den neuen Kommentar in der Kommentarliste anzeigen.

### Requirement 2: Kommentare anzeigen

**User Story:** Als Benutzer möchte ich alle Kommentare zu einem Beitrag sehen, damit ich die Diskussion verfolgen kann.

#### Acceptance Criteria

1. WHEN ein Benutzer die Kommentare eines Beitrags abruft, THE Kommentar_System SHALL alle Kommentare zu dem Beitrag chronologisch sortiert (älteste zuerst) zurückgeben.
2. WHEN Kommentare angezeigt werden, THE Kommentar_UI SHALL für jeden Kommentar den Autorname, das Avatar-Bild, den Kommentartext und den Zeitstempel darstellen.
3. WHEN keine Kommentare zu einem Beitrag vorhanden sind, THE Kommentar_UI SHALL einen leeren Zustand anzeigen.

### Requirement 3: Auf Kommentare antworten (Verschachtelung)

**User Story:** Als Benutzer möchte ich auf einen bestehenden Kommentar antworten können, damit eine strukturierte Diskussion mit Kontext entsteht.

#### Acceptance Criteria

1. WHEN ein authentifizierter Benutzer auf einen bestehenden Kommentar antwortet, THE Kommentar_System SHALL die Antwort als untergeordneten Kommentar mit Referenz auf den Elternkommentar speichern.
2. WHEN Kommentare mit Antworten angezeigt werden, THE Kommentar_UI SHALL Antworten visuell eingerückt unter dem Elternkommentar darstellen.
3. WHEN ein nicht-authentifizierter Benutzer versucht auf einen Kommentar zu antworten, THE Kommentar_System SHALL die Anfrage mit einem Authentifizierungsfehler ablehnen.

### Requirement 4: Kommentar liken

**User Story:** Als authentifizierter Benutzer möchte ich Kommentare liken können, damit ich Zustimmung oder Wertschätzung ausdrücken kann.

#### Acceptance Criteria

1. WHEN ein authentifizierter Benutzer einen Kommentar liked, den der Benutzer noch nicht geliked hat, THE Kommentar_System SHALL den Benutzer zur Like-Liste des Kommentars hinzufügen und den Like-Zähler um eins erhöhen.
2. WHEN ein authentifizierter Benutzer einen Kommentar liked, den der Benutzer bereits geliked hat, THE Kommentar_System SHALL den Benutzer aus der Like-Liste entfernen und den Like-Zähler um eins verringern (Toggle-Verhalten).
3. WHEN Kommentare angezeigt werden, THE Kommentar_UI SHALL die aktuelle Anzahl der Likes für jeden Kommentar anzeigen.
4. WHEN ein Benutzer einen Kommentar bereits geliked hat, THE Kommentar_UI SHALL das Like-Symbol visuell hervorgehoben darstellen.
5. WHEN ein nicht-authentifizierter Benutzer versucht einen Kommentar zu liken, THE Kommentar_System SHALL die Anfrage mit einem Authentifizierungsfehler ablehnen.

### Requirement 5: Kommentar-Eingabe UI

**User Story:** Als Benutzer möchte ich eine einfache und intuitive Eingabemöglichkeit für Kommentare haben, damit ich schnell und unkompliziert kommentieren kann.

#### Acceptance Criteria

1. THE Kommentar_UI SHALL ein Texteingabefeld mit einem Senden-Button unterhalb der Kommentarliste anzeigen.
2. WHEN der Benutzer auf "Antworten" bei einem Kommentar klickt, THE Kommentar_UI SHALL ein Eingabefeld direkt unter dem betreffenden Kommentar einblenden.
3. WHILE der Kommentartext leer ist, THE Kommentar_UI SHALL den Senden-Button deaktiviert darstellen.

### Requirement 6: Datenspeicherung

**User Story:** Als Entwickler möchte ich Kommentare effizient in MongoDB speichern und abrufen, damit die App auch bei vielen Kommentaren performant bleibt.

#### Acceptance Criteria

1. THE Kommentar_System SHALL jeden Kommentar als eigenes MongoDB-Dokument mit den Feldern id, beitragId, elternKommentarId, text, autor, datum und likes speichern.
2. WHEN Kommentare für einen Beitrag abgefragt werden, THE Kommentar_System SHALL die Abfrage über einen Index auf dem Feld beitragId ausführen.
3. THE Kommentar_System SHALL die Eltern-Kind-Beziehung zwischen Kommentaren über das Feld elternKommentarId abbilden, wobei Kommentare auf oberster Ebene den Wert null in diesem Feld haben.
