# Social

Eine Social-Media-Plattform mit React-Frontend und Spring Boot-Backend.

## Architektur

```
┌────────────────┐       ┌────────────────┐       ┌──────────────┐
│  React Frontend│──────▶│  Spring Boot   │──────▶│   MongoDB    │
│  (Port 3000)   │       │  Backend (8080)│       │  (Port 27018)│
└────────────────┘       └────────────────┘       └──────────────┘
                                │
                    ┌───────────┼───────────┐
                    ▼           ▼           ▼
             ┌──────────┐ ┌──────────┐ ┌──────────────┐
             │  MinIO   │ │ Keycloak │ │ Mongo Express│
             │(9000/9001)│ │  (8082)  │ │   (8081)     │
             └──────────┘ └──────────┘ └──────────────┘
```

### Frontend

- **Framework:** React 19 mit TypeScript
- **UI-Library:** Material UI (MUI) 9
- **HTTP-Client:** Axios mit axios-hooks
- **Routing:** React Router 7
- **Build-Tool:** Create React App
- **Port:** 3000 (Dev-Server proxied API-Requests an Backend auf Port 8080)

### Backend

- **Framework:** Spring Boot 4 (Java 21)
- **Datenbank:** MongoDB (Spring Data MongoDB)
- **Authentifizierung:** OAuth2/OpenID Connect via Keycloak
- **Objektspeicher:** MinIO (S3-kompatibel) für Foto-Uploads
- **Build-Tool:** Maven
- **Port:** 8080

### Infrastruktur (Docker)

| Service       | Image                          | Port(s)      | Zweck                        |
|---------------|--------------------------------|--------------|------------------------------|
| MongoDB       | `mongo`                        | 27018        | Datenbank                    |
| Mongo Express | `mongo-express`                | 8081         | DB-Admin-UI                  |
| MinIO         | `elestio/minio`                | 9000 / 9001  | Objektspeicher / Admin-UI    |
| Keycloak      | `quay.io/keycloak/keycloak`    | 8082         | Identity Provider            |

## Voraussetzungen

- **Node.js** (>= 18) und **npm**
- **Java 21** (JDK)
- **Docker Desktop**
- **Windows Terminal** (fuer das Startup-Script)

## Schnellstart

Das gesamte Projekt (Docker-Services, Backend, Frontend) kann mit einem einzigen Befehl gestartet werden:

```powershell
.\dev-start.ps1
```

Das Script:
1. Startet Docker Desktop falls noetig
2. Faehrt alle Docker-Services hoch (MongoDB, Mongo Express, MinIO, Keycloak)
3. Wartet bis MongoDB bereit ist
4. Wartet bis Keycloak bereit ist (kann beim ersten Start ~90s dauern)
5. Installiert Frontend-Abhaengigkeiten falls noetig (`npm install`)
6. Oeffnet Windows Terminal mit Split-Panes fuer Backend und Frontend

### Manueller Start

Falls du die Services einzeln starten moechtest:

**1. Docker-Services starten:**

```powershell
docker compose -f backend\docker-compose.yml up -d
```

**2. Backend starten:**

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

**3. Frontend starten:**

```powershell
npm install   # nur beim ersten Mal
npm start
```

## Zugangsdaten (Entwicklung)

| Service       | Benutzer            | Passwort          |
|---------------|---------------------|-------------------|
| MongoDB       | root                | example           |
| Mongo Express | mongoexpressuser    | mongoexpresspass  |
| Keycloak Admin| admin               | example1          |
| Keycloak User | testuser            | testuser          |
| MinIO         | lukas               | example1          |

## URLs (Entwicklung)

| Service        | URL                          |
|----------------|------------------------------|
| Frontend       | http://localhost:3000         |
| Backend API    | http://localhost:8080         |
| Mongo Express  | http://localhost:8081         |
| Keycloak Admin | http://localhost:8082         |
| MinIO Console  | http://localhost:9001         |

## Projektstruktur

```
social/
├── src/                  # React Frontend (TypeScript)
├── public/               # Statische Assets
├── backend/
│   ├── src/main/java/    # Spring Boot Backend
│   ├── keycloak/
│   │   └── realm-export.json  # Keycloak Realm-Konfiguration (auto-import)
│   ├── docker-compose.yml
│   ├── pom.xml
│   └── mvnw.cmd
├── dev-start.ps1         # Startup-Script
├── package.json          # Frontend-Abhaengigkeiten
└── tsconfig.json
```

## Keycloak

Die Keycloak-Konfiguration (Realm "social") wird automatisch beim Container-Start importiert
aus `backend/keycloak/realm-export.json`. Das bedeutet:

- Bei jedem frischen `docker compose up` wird der Realm automatisch erstellt
- Aenderungen am Realm koennen in der JSON-Datei versioniert werden
- Ein Testbenutzer (`testuser` / `testuser`) ist vorkonfiguriert
- Der OAuth2-Client "social" ist mit den korrekten Redirect-URIs eingerichtet

Falls der Realm manuell im Keycloak-Admin-UI geaendert wurde und die Aenderungen
persistiert werden sollen, kann ein Export erstellt werden:

```powershell
docker exec backend-keycloak-1 /opt/keycloak/bin/kc.sh export --dir /tmp/export --realm social
docker cp backend-keycloak-1:/tmp/export/social-realm.json backend/keycloak/realm-export.json
```

## Docker-Services stoppen

```powershell
docker compose -f backend\docker-compose.yml down
```

Um auch die Daten (Volumes) zu loeschen:

```powershell
docker compose -f backend\docker-compose.yml down -v
```
