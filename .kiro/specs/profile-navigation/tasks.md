# Implementation Plan: Profile Navigation

## Overview

Implementierung der Profilnavigation: Klickbarer Avatar in der BeitragCard navigiert zur öffentlichen Profilseite eines Nutzers. Die Profilseite zeigt Avatar, Name und paginierte Beiträge im Liquid-Glass-Design. Das Backend erhält einen neuen Endpoint für nutzer-spezifische Beiträge mit Sichtbarkeitsfilterung sowie einen Person-Lookup-Endpoint. Die Umsetzung erfolgt inkrementell: Backend-Erweiterungen → Frontend-Komponente → Integration und Routing.

## Tasks

- [ ] 1. Backend: Repository- und Endpoint-Erweiterungen
  - [ ] 1.1 Erweitere BeitragRepository um Autor-Query
    - Füge die Methode `Page<Beitrag> findByAutor_NameOrderByDatumDesc(String name, Pageable pageable)` zum `BeitragRepository` Interface hinzu
    - Spring Data MongoDB leitet die Query automatisch aus dem Methodennamen ab
    - _Requirements: 3.1_

  - [ ] 1.2 Implementiere GET /beitraege/user/{personName} in BeitraegeController
    - Neuer `@GetMapping("/beitraege/user/{personName}")` Endpunkt
    - Parameter: `@PathVariable String personName`, `@RequestParam(defaultValue = "0") int page`, `@RequestParam(defaultValue = "10") int size`
    - `size` auf Maximum 50 begrenzen: `size = Math.min(size, 50)`
    - Beiträge über `findByAutor_NameOrderByDatumDesc` laden
    - Sichtbarkeitsfilterung analog zum bestehenden `/beitraege`-Endpoint: Beitrag sichtbar wenn `empfaenger` leer/null, oder anfragender Nutzer ist Autor, oder anfragender Nutzer ist in `empfaenger`-Liste
    - Ergebnis als `Page<Beitrag>` zurückgeben (konsistent mit bestehendem Format)
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ] 1.3 Implementiere GET /user/{personName} Endpoint für Person-Lookup
    - Neuer Endpunkt im `AccountController` oder einem neuen `UserController`
    - Nutze `personRepository.findByName(personName)` (Methode existiert bereits)
    - Return `ResponseEntity.ok(person)` bei Fund, `ResponseEntity.notFound().build()` bei null
    - _Requirements: 2.1, 2.4_

- [ ] 2. Checkpoint - Backend-Endpoints verifizieren
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 3. Frontend: UserProfile-Komponente
  - [ ] 3.1 Erstelle UserProfile.tsx Seitenkomponente
    - Erstelle `src/UserProfile.tsx` mit Props: `token: string | null`, `user?: Person`
    - Lese `personName` aus dem URL-Parameter via `useParams()`
    - Lade Profildaten über `GET /user/{personName}` — bei 404 zeige Fehlermeldung "Nutzer nicht gefunden" mit Zurück-Button
    - Lade erste Seite der Beiträge über `GET /beitraege/user/{personName}?page=0&size=10`
    - Zeige Profilkarte im Liquid-Glass-Design: Avatar (120x120, rund, border) + Name
    - Zeige Beiträge unterhalb der Profilkarte als `BeitragCard`-Liste
    - Zeige `CircularProgress` während Daten laden
    - Zeige Hinweistext wenn keine Beiträge vorhanden
    - Zeige Fehlermeldung mit "Erneut versuchen"-Button bei Netzwerkfehler
    - Zurück-Button (ArrowBackIcon) oben, navigiert mit `navigate('/')` zum Feed
    - Verwende die bestehenden `glassCardSx`- und `glassButtonSx`-Styles (analog zu MyProfile.tsx)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [ ] 3.2 Implementiere Infinite-Scrolling in UserProfile
    - `IntersectionObserver` auf ein Loader-Element am Ende der Liste (analog zu App.tsx)
    - Lade nächste Seite wenn Loader sichtbar und `hasMore === true`
    - Setze `hasMore = false` wenn Backend `last: true` meldet
    - Keine Doppel-Requests: blockiere weitere Fetches während `loading === true`
    - Bei Fehler beim Nachladen: Fehlermeldung anzeigen, existierende Beiträge beibehalten
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 4. Frontend: BeitragCard-Avatar klickbar machen
  - [ ] 4.1 Erweitere BeitragCard um Avatar-Klick-Navigation
    - Importiere `useNavigate` von `react-router`
    - Wrapp den Avatar im `CardHeader` mit einem klickbaren Element (Box oder direkter `onClick` auf Avatar)
    - Bei Klick: `navigate('/user/' + encodeURIComponent(autor.name))`
    - Bedingung: nur klickbar wenn `bearbeiten === false` UND `beitrag?.autor?.name` vorhanden und nicht leer
    - Setze `cursor: 'pointer'` und `sx` auf dem Avatar wenn klickbar
    - Wenn `bearbeiten === true` oder `autor.name` leer/undefiniert: kein `onClick`, kein `cursor: pointer`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 5.1, 5.3_

- [ ] 5. Frontend: Route registrieren in App.tsx
  - [ ] 5.1 Füge Route /user/:personName in App.tsx hinzu
    - Importiere `UserProfile` Komponente
    - Füge `<Route path="/user/:personName" element={<UserProfile token={token} user={user} />} />` zu den Routes hinzu
    - Platziere die Route neben den bestehenden Routes (z.B. nach `/profile`)
    - _Requirements: 2.1, 5.2_

- [ ] 6. Checkpoint - Integration verifizieren
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Property-Based Tests (Backend)
  - [ ]* 7.1 Schreibe Property-Test für Author-Filterung
    - **Property 1: Author-Filterung**
    - Generiere zufällige Mengen von `Beitrag`-Objekten mit variierenden `autor.name`-Werten
    - Speichere in Test-MongoDB, rufe den Endpoint auf, verifiziere: alle zurückgegebenen Beiträge haben exakt den angegebenen `autor.name`, sortiert nach `datum` absteigend
    - Verwende jqwik (`net.jqwik:jqwik`) mit mindestens 100 Iterationen
    - **Validates: Requirements 3.1**

  - [ ]* 7.2 Schreibe Property-Test für Sichtbarkeitsfilterung
    - **Property 2: Sichtbarkeitsfilterung**
    - Generiere Beiträge mit variierenden `empfaenger`-Listen (leer, mit anfragendem Nutzer, ohne anfragenden Nutzer)
    - Verifiziere: nur Beiträge sichtbar bei denen `empfaenger` leer/null ist, oder der anfragende Nutzer Autor ist, oder der anfragende Nutzer in `empfaenger` enthalten ist
    - Verwende jqwik mit mindestens 100 Iterationen
    - **Validates: Requirements 3.2**

- [ ] 8. Final Checkpoint - Alle Tests bestehen
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Das Backend folgt dem bestehenden Muster aus `BeitraegeController` (Sichtbarkeitsfilterung per Stream-Filter)
- `PersonRepository.findByName()` existiert bereits — kein neues Repository-Method nötig
- Frontend-Styles folgen dem Liquid-Glass-Pattern aus `MyProfile.tsx` (rgba backgrounds, backdrop-filter, border-radius)
- Axios-Calls verwenden das bestehende Pattern mit `Authorization: 'Bearer ' + token` Header und `withCredentials: true`
- Die `UserProfile`-Komponente nutzt dieselbe Pagination-Logik wie der Feed in `App.tsx`
- Property-Tests validieren universelle Korrektheitseigenschaften des Backend-Endpoints

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.3"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["3.1", "4.1"] },
    { "id": 3, "tasks": ["3.2", "5.1"] },
    { "id": 4, "tasks": ["7.1", "7.2"] }
  ]
}
```
