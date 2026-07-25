# Deployment-Plan: Zitadel + Cloudflare + Railway

## Domain

Die App wird unter `mysocialapp.de` gehostet.

| Dienst | URL |
|---|---|
| Frontend | `https://mysocialapp.de` |
| Backend API | `https://api.mysocialapp.de` |
| Bilder/Assets (R2) | `https://assets.mysocialapp.de` |
| Zitadel (Auth) | `https://auth.mysocialapp.de` (CNAME auf Zitadel Cloud) |

---

## DNS-Konfiguration (GoDaddy)

Die Domain `mysocialapp.de` wird bei GoDaddy verwaltet. Es gibt zwei Optionen:

### Option A: Nameserver auf Cloudflare umstellen (empfohlen)

Cloudflare Pages und R2 Custom Domains funktionieren am besten wenn Cloudflare die DNS-Verwaltung übernimmt. Dafür die Nameserver bei GoDaddy auf Cloudflare umstellen:

1. Cloudflare-Konto erstellen → "Add Site" → `mysocialapp.de` eingeben → Free Plan wählen
2. Cloudflare zeigt zwei Nameserver an (z.B. `anna.ns.cloudflare.com`, `bob.ns.cloudflare.com`)
3. Bei GoDaddy → Domain Settings → Nameservers → "Custom" → Cloudflare Nameserver eintragen
4. Propagation abwarten (bis zu 24h, meist schneller)
5. Danach alle DNS-Records in Cloudflare verwalten

**DNS-Records (in Cloudflare nach Umstellung):**

| Typ | Name | Ziel | Proxy |
|---|---|---|---|
| CNAME | `@` | `social.pages.dev` | Proxied (orange) |
| CNAME | `api` | `<service>.up.railway.app` | DNS only (grey) |
| CNAME | `assets` | R2 Custom Domain (von Cloudflare zugewiesen) | Proxied (orange) |
| CNAME | `auth` | `<instanz>.zitadel.cloud` | DNS only (grey) |

> **Hinweis:** `api` und `auth` sollten "DNS only" (nicht proxied) sein, damit Railway und Zitadel ihre eigenen TLS-Zertifikate ausstellen können.

### Option B: Nameserver bei GoDaddy belassen

Falls ihr die Nameserver nicht umstellen wollt, könnt ihr die DNS-Records direkt bei GoDaddy setzen. Cloudflare Pages funktioniert dann über einen CNAME-Verifizierungsprozess.

**DNS-Records (bei GoDaddy):**

| Typ | Name | Ziel | TTL |
|---|---|---|---|
| CNAME | `www` | `social.pages.dev` | 1h |
| CNAME | `api` | `<service>.up.railway.app` | 1h |
| CNAME | `assets` | R2 Custom Domain | 1h |
| CNAME | `auth` | `<instanz>.zitadel.cloud` | 1h |
| A | `@` | Cloudflare Pages IP (via Verifizierung) | 1h |

> **Nachteil:** Kein Cloudflare-Proxy (kein CDN-Caching, kein DDoS-Schutz für Frontend). Außerdem erfordert die R2 Custom Domain zwingend Cloudflare-DNS.

### Empfehlung

**Option A (Nameserver umstellen)** – ist innerhalb von Minuten erledigt, kostet nichts, und ihr bekommt Cloudflare CDN + SSL + DDoS-Schutz gratis dazu. Die Domain bleibt bei GoDaddy registriert, nur die DNS-Verwaltung läuft über Cloudflare.

---

## Ziel-Architektur

Kostengünstige, serverless-nahe Hosting-Lösung für die Social-App mit Daten in der EU.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Cloudflare                                │
│                                                                 │
│   ┌──────────────┐    ┌──────────────────────────────────────┐  │
│   │ Cloudflare   │    │ Cloudflare R2                        │  │
│   │ Pages        │    │ (Object Storage, EU Jurisdiction)    │  │
│   │ (React SPA)  │    │ Bilder & Uploads                     │  │
│   └──────┬───────┘    └──────────────────────────────────────┘  │
│          │                          ▲                            │
└──────────┼──────────────────────────┼────────────────────────────┘
           │                          │
           │ API Calls                │ S3-kompatible API
           ▼                          │
┌──────────────────────┐              │
│ Railway              │              │
│ ┌──────────────────┐ │              │
│ │ Spring Boot      │─┼─────────────┘
│ │ Backend          │ │
│ │ (Docker)         │ │
│ └────────┬─────────┘ │
│          │            │
└──────────┼────────────┘
           │
           ▼
┌──────────────────────┐     ┌──────────────────────┐
│ MongoDB Atlas        │     │ Zitadel Cloud        │
│ (Free Tier, M0)     │     │ (OIDC Provider)      │
│ Region: eu-central-1│     │ Region: EU           │
└──────────────────────┘     └──────────────────────┘
```

---

## Komponenten im Detail

### 1. Frontend – Cloudflare Pages

**Was:** React-SPA (Static Build) auf Cloudflare Pages hosten.

**Warum Cloudflare Pages:**
- Kostenlos (unlimited Bandwidth, 500 Builds/Monat)
- Globales CDN mit Edge-Nodes in Deutschland
- Automatische Deployments via Git-Integration
- Custom Domain mit kostenlosem SSL

**Deployment:**
```bash
npm run build
# Output: /build Ordner → wird auf Cloudflare Pages deployed
```

**Cloudflare Pages Konfiguration:**
- Build Command: `npm run build`
- Output Directory: `build`
- Environment Variables: `REACT_APP_API_URL`, `REACT_APP_ZITADEL_AUTHORITY`, `REACT_APP_ZITADEL_CLIENT_ID`

---

### 2. Backend – Railway

**Was:** Spring Boot Backend als Docker-Container auf Railway.

**Warum Railway:**
- EU-Region verfügbar (Netherlands, eu-west)
- Einfaches Docker-Deployment
- Auto-Sleep nach Inaktivität (Hobby Plan)
- $5/Monat Grundgebühr + Usage (reicht für kleine Apps)
- Eingebaute Logs, Metriken, Custom Domains

**Nötiges Dockerfile:** (`backend/Dockerfile`)
```dockerfile
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY target/backend-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

**Deployment-Methode:**
- Image wird via GitHub Actions gebaut und nach `ghcr.io` gepushed
- Railway pulled das Image von dort (siehe CI/CD-Abschnitt)

**Railway Konfiguration:**
- Region: `eu-west`
- Port: `8080`
- Custom Domain: z.B. `api.mysocialapp.de`

**Environment Variables auf Railway:**
```env
SPRING_DATA_MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/social
SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_ISSUER_URI=https://<instance>.zitadel.cloud
SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_JWK_SET_URI=https://<instance>.zitadel.cloud/oauth/v2/keys
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_ACCESS_KEY=<r2-access-key>
S3_SECRET_KEY=<r2-secret-key>
S3_BUCKET=social
```

---

### 3. Datenbank – MongoDB Atlas (Free Tier)

**Was:** Managed MongoDB Cluster in Frankfurt.

**Free Tier (M0) beinhaltet:**
- 512 MB Storage
- Shared Cluster
- Region: `aws-eu-central-1` (Frankfurt)
- Kostenlos, dauerhaft (kein Ablauf)

**Setup-Schritte:**
1. Account auf [mongodb.com/atlas](https://www.mongodb.com/atlas) erstellen
2. Free Cluster (M0) in `aws/eu-central-1` erstellen
3. Database User anlegen
4. Network Access: Railway IP-Range whitelisten (oder 0.0.0.0/0 für Simplicity)
5. Connection String kopieren → Railway Environment Variable

---

### 4. Object Storage – Cloudflare R2

**Was:** S3-kompatibler Object Storage für Bilder und Uploads.

**Warum R2:**
- 10 GB Storage kostenlos
- 0 € Egress-Kosten (kein Transfer-Gebühr!)
- S3-kompatible API → bestehender AWS SDK Code funktioniert
- EU Jurisdiction Einstellung möglich (Daten bleiben in EU)

**Free Tier:**
- 10 GB Storage
- 10 Millionen Class-A-Operationen (PUT, POST)
- 10 Millionen Class-B-Operationen (GET)

**Migration von MinIO:**
- Endpoint in `application.properties` ändern
- Access Key / Secret Key von R2 verwenden
- Bucket `social` in R2 anlegen
- Public Access für den Bucket aktivieren (für Bild-URLs)

**Backend-Anpassung (application.properties):**
```properties
s3.endpoint=https://<account-id>.r2.cloudflarestorage.com
s3.access-key=${S3_ACCESS_KEY}
s3.secret-key=${S3_SECRET_KEY}
s3.bucket=social
s3.public-url=https://assets.mysocialapp.de
```

**Öffentlicher Zugriff auf Bilder:**
- Cloudflare R2 Custom Domain einrichten (z.B. `assets.mysocialapp.de`)
- Dann sind Bilder direkt über `https://assets.mysocialapp.de/<key>` erreichbar

---

### 5. Authentifizierung – Zitadel Cloud

**Was:** Zitadel als OIDC-Provider ersetzt Keycloak.

**Warum Zitadel statt Keycloak:**
- Schweizer Firma, Daten in EU gehostet
- Free Tier: 25.000 Monthly Active Users
- Kein eigener Server nötig (fully managed)
- OIDC-kompatibel → minimale Code-Änderungen
- Modernes Admin-UI, PKCE-Support out of the box

**Free Tier beinhaltet:**
- 25.000 MAU
- Unlimited Projekte & Applikationen
- Custom Domain (CNAME)
- EU-Hosting (Schweiz/Deutschland)

**Setup-Schritte:**
1. Account auf [zitadel.cloud](https://zitadel.cloud) erstellen
2. Projekt „Social" anlegen
3. Application erstellen (Type: User Agent / SPA, Auth: PKCE)
4. Redirect URIs konfigurieren:
   - `https://mysocialapp.de/login/oauth2/code/zitadel`
   - `http://localhost:3000/login/oauth2/code/zitadel` (Dev)
5. Login Policy → **"Allow Registration" deaktivieren** (kein Self-Sign-Up)
6. User werden manuell vom Admin in der Console angelegt (Users → New)
7. User bekommt Einladungs-E-Mail mit Link zum Passwort-Setup

**Zitadel Projekt-Konfiguration:**
| Einstellung | Wert |
|---|---|
| Application Type | Single Page Application (SPA) |
| Auth Method | PKCE (empfohlen) |
| Redirect URI | `https://mysocialapp.de/login/oauth2/code/zitadel` |
| Post-Logout URI | `https://mysocialapp.de/` |
| Token Type | JWT |

---

## Nötige Code-Änderungen (umgesetzt)

### Backend (Spring Boot)

#### Profil-basierte Konfiguration

Die Konfiguration ist aufgeteilt in:
- `application.properties` – shared Settings (App-Name, Defaults)
- `application-local.properties` – lokale Entwicklung (Keycloak, MinIO, MongoDB lokal)
- `application-prod.properties` – Produktion (Env-Variablen)

#### `S3Config.java` (neu)

S3-Client als Spring Bean, konfiguriert über Properties:
```java
@Configuration
public class S3Config {
    @Value("${s3.endpoint}") private String endpoint;
    @Value("${s3.access-key}") private String accessKey;
    @Value("${s3.secret-key}") private String secretKey;
    @Value("${s3.region:eu-central-1}") private String region;
    @Value("${s3.bucket}") private String bucket;

    @Bean
    public S3Client s3Client() { /* ... */ }
    @Bean
    public S3AsyncClient s3AsyncClient() { /* ... */ }
    @Bean
    public String s3Bucket() { return bucket; }
}
```

Die Controller (BeitraegeController, AccountController) nutzen jetzt `@Autowired S3Client` / `S3AsyncClient` statt hardcoded Credentials.

#### Railway Environment Variables

| Variable | Beschreibung |
|---|---|
| `SPRING_PROFILES_ACTIVE` | `prod` |
| `MONGODB_URI` | MongoDB Atlas Connection String |
| `OIDC_ISSUER_URI` | `https://auth.mysocialapp.de` |
| `OIDC_JWKS_URI` | `https://auth.mysocialapp.de/oauth/v2/keys` |
| `S3_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` |
| `S3_ACCESS_KEY` | Cloudflare R2 Access Key |
| `S3_SECRET_KEY` | Cloudflare R2 Secret Key |
| `S3_BUCKET` | `social` |
| `S3_REGION` | `auto` |
| `CORS_ALLOWED_ORIGINS` | `https://mysocialapp.de` |

---

### Frontend (React)

#### `src/config.ts` (neu)

Zentrale Konfiguration aus Environment-Variablen:
```typescript
export const config = {
  apiUrl: process.env.REACT_APP_API_URL || '',
  assetsUrl: process.env.REACT_APP_ASSETS_URL || '/social',
  oidc: {
    authority: process.env.REACT_APP_OIDC_AUTHORITY || 'http://localhost:8082/realms/social',
    clientId: process.env.REACT_APP_OIDC_CLIENT_ID || 'social',
    redirectPath: '/login/oauth2/code/callback',
    scope: 'openid profile email',
  },
};
```

#### Änderungen

- `axios.defaults.baseURL = config.apiUrl` – API-URL zentral gesetzt
- Alle Asset-URLs (`'/social/' + ...`) durch `config.assetsUrl + '/' + ...` ersetzt
- Auth-URL dynamisch aus `config.oidc.authority` abgeleitet (erkennt Keycloak vs. Zitadel)
- Redirect-Pfad generisch: `/login/oauth2/code/callback`
- Passwort-Änderungs-Link generisch (Keycloak Account vs. Zitadel Console)

#### API-URL Verhalten

- **Lokal:** `REACT_APP_API_URL` ist leer → relative URLs → CRA Proxy leitet an `localhost:8080`
- **Produktion:** `REACT_APP_API_URL=https://api.mysocialapp.de` → absolute URLs

---

## CORS-Konfiguration

Da Frontend und Backend auf verschiedenen Domains laufen, muss CORS korrekt konfiguriert sein:

```java
@Bean
public CorsFilter corsFilter() {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOrigins(List.of(
        "https://mysocialapp.de",        // Produktion
        "http://localhost:3000"           // Entwicklung
    ));
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
    config.setAllowedHeaders(List.of("*"));
    config.setAllowCredentials(true);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return new CorsFilter(source);
}
```

---

## Kosten-Übersicht

| Komponente | Service | Monatliche Kosten |
|---|---|---|
| Frontend | Cloudflare Pages Free | 0 € |
| Backend | Railway Hobby Plan | ~5 $/Monat |
| Datenbank | MongoDB Atlas M0 | 0 € |
| Object Storage | Cloudflare R2 Free | 0 € (bis 10 GB) |
| Auth | Zitadel Cloud Free | 0 € (bis 25.000 MAU) |
| Domain | Optional (Cloudflare Registrar) | ~10 €/Jahr |
| **Gesamt** | | **~5-7 €/Monat** |

---

## Migrations-Reihenfolge

### Phase 1: Infrastruktur aufsetzen (kein Code nötig)
1. MongoDB Atlas Free Cluster erstellen (Frankfurt)
2. Cloudflare-Konto erstellen, R2 Bucket `social` anlegen
3. Zitadel Cloud Instanz erstellen, Projekt + App konfigurieren
4. Railway-Konto erstellen, Service anlegen

### Phase 2: Backend anpassen & deployen
5. `application.properties` auf Env-Variablen umstellen (Profile-basiert)
6. S3-Client Endpoint auf R2 konfigurieren
7. JWT Issuer auf Zitadel umstellen
8. Dockerfile erstellen
9. Backend auf Railway deployen & testen

### Phase 3: Frontend anpassen & deployen
10. Auth-Flow auf Zitadel umstellen (PKCE oder Zitadel SDK)
11. API-URLs und Asset-URLs konfigurierbar machen
12. `npm run build` → Cloudflare Pages deployen
13. Custom Domain einrichten

### Phase 4: Go Live
14. Zitadel-User manuell anlegen
15. Smoke-Test aller Funktionen (Login, Upload, Feed)

---

## Lokale Entwicklung

Die lokale Entwicklung kann weiterhin mit Docker Compose funktionieren. Spring Profiles steuern die Konfiguration.

**Backend:** `application-local.properties` (wird automatisch geladen via `spring.profiles.default=local`)
```properties
spring.data.mongodb.uri=mongodb://root:example@localhost:27018/social?authSource=admin
spring.security.oauth2.resourceserver.jwt.issuer-uri=http://localhost:8082/realms/social
spring.security.oauth2.resourceserver.jwt.jwk-set-uri=http://localhost:8082/realms/social/protocol/openid-connect/certs
s3.endpoint=http://localhost:9000
s3.access-key=lukas
s3.secret-key=example1
s3.bucket=social
s3.region=eu-central-1
```

**Backend (Produktion):** `application-prod.properties` (Environment-Variablen von Railway)
```properties
spring.data.mongodb.uri=${MONGODB_URI}
spring.security.oauth2.resourceserver.jwt.issuer-uri=${OIDC_ISSUER_URI}
spring.security.oauth2.resourceserver.jwt.jwk-set-uri=${OIDC_JWKS_URI}
s3.endpoint=${S3_ENDPOINT}
s3.access-key=${S3_ACCESS_KEY}
s3.secret-key=${S3_SECRET_KEY}
s3.bucket=${S3_BUCKET:social}
s3.region=${S3_REGION:auto}
```

**Frontend:** `.env.local` (lokale Defaults)
```env
REACT_APP_API_URL=
REACT_APP_ASSETS_URL=/social
REACT_APP_OIDC_AUTHORITY=http://localhost:8082/realms/social
REACT_APP_OIDC_CLIENT_ID=social
```

Starten:
```bash
# Backend (lokales Profil wird automatisch geladen)
./mvnw spring-boot:run

# Frontend (CRA Proxy leitet API-Calls an localhost:8080)
npm start

# Auf Railway (Env Variable)
SPRING_PROFILES_ACTIVE=prod
```

---

## CI/CD – GitHub Actions (Release-basiert)

Deployments werden nur durch ein GitHub Release ausgelöst. Der Workflow:

```
GitHub Release erstellt (z.B. v1.2.0)
    → Tests laufen
    → Backend: Docker Image bauen → Railway deployen
    → Frontend: npm build → Cloudflare Pages deployen
```

### Warum Release-Trigger?

- Kein versehentliches Deployment durch normalen Push
- Klare Versionierung (Semantic Versioning)
- Release Notes dokumentieren was sich geändert hat
- Einfacher Rollback: vorheriges Release erneut deployen

### Backend Workflow

Datei: `.github/workflows/deploy-backend.yml`

Der Workflow baut ein Docker Image, pushed es zu GitHub Container Registry (ghcr.io)
und triggert Railway, das Image von dort zu pullen.

```yaml
name: Deploy Backend

on:
  release:
    types: [published]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}/backend

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Java 21
        uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'

      - name: Run tests
        working-directory: backend
        run: ./mvnw test

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4

      - name: Set up Java 21
        uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'

      - name: Build JAR
        working-directory: backend
        run: ./mvnw package -DskipTests

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract version from release tag
        id: version
        run: echo "tag=${GITHUB_REF_NAME}" >> $GITHUB_OUTPUT

      - name: Build and push Docker image
        uses: docker/build-push-action@v6
        with:
          context: backend
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ steps.version.outputs.tag }}
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Railway
        run: |
          curl -X POST "https://backboard.railway.com/graphql/v2" \
            -H "Authorization: Bearer ${{ secrets.RAILWAY_TOKEN }}" \
            -H "Content-Type: application/json" \
            -d '{
              "query": "mutation { serviceInstanceRedeploy(serviceId: \"${{ vars.RAILWAY_SERVICE_ID }}\", environmentId: \"${{ vars.RAILWAY_ENVIRONMENT_ID }}\") }"
            }'
```

### Dockerfile (Backend)

Datei: `backend/Dockerfile`

```dockerfile
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

COPY target/backend-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
```

### Railway Konfiguration

Railway wird so konfiguriert, dass es das Image von ghcr.io pulled statt selbst zu bauen:

1. Railway Service → Settings → Source → "Docker Image" wählen
2. Image: `ghcr.io/<github-user>/social/backend:latest`
3. Credentials hinterlegen (GitHub PAT mit `read:packages` Scope)
4. Auto-Deploy bei neuem Image deaktivieren (Redeploy wird via API getriggert)

### Frontend Workflow

Datei: `.github/workflows/deploy-frontend.yml`

```yaml
name: Deploy Frontend

on:
  release:
    types: [published]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test -- --watchAll=false

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          REACT_APP_API_URL: ${{ vars.REACT_APP_API_URL }}
          REACT_APP_OIDC_AUTHORITY: ${{ vars.REACT_APP_OIDC_AUTHORITY }}
          REACT_APP_OIDC_CLIENT_ID: ${{ vars.REACT_APP_OIDC_CLIENT_ID }}
          REACT_APP_ASSETS_URL: ${{ vars.REACT_APP_ASSETS_URL }}

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy build --project-name=social
```

### Benötigte GitHub Secrets & Variables

Im GitHub Repository unter Settings → Secrets and Variables → Actions:

**Secrets (sensibel):**
| Name | Beschreibung |
|---|---|
| `RAILWAY_TOKEN` | Railway API Token (Account Settings → Tokens) |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token mit Pages-Berechtigung |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID |

**Variables (nicht-sensibel):**
| Name | Beispielwert |
|---|---|
| `REACT_APP_API_URL` | `https://api.mysocialapp.de` |
| `REACT_APP_OIDC_AUTHORITY` | `https://auth.mysocialapp.de` |
| `REACT_APP_OIDC_CLIENT_ID` | `123456789@social` |
| `REACT_APP_ASSETS_URL` | `https://assets.mysocialapp.de` |
| `RAILWAY_SERVICE_ID` | Railway Service ID (Settings → General) |
| `RAILWAY_ENVIRONMENT_ID` | Railway Environment ID (z.B. Production) |

### Release erstellen

```bash
# Tag erstellen
git tag v1.0.0
git push origin v1.0.0

# Dann auf GitHub: Releases → "Create release from tag"
# Oder via CLI:
gh release create v1.0.0 --title "v1.0.0" --notes "Initial deployment"
```

### Hinweis zu Railway

Railway ist so konfiguriert, dass es das Docker Image direkt von ghcr.io bezieht.
Die GitHub Action pushed das Image und triggert dann ein Redeploy via Railway API.

Vorteile gegenüber Railway's eigenem Build:
- **Reproduzierbar:** Dasselbe Image kann lokal getestet werden
- **Schneller:** Railway muss nicht selbst bauen, nur pullen + starten
- **Versioniert:** Jedes Release-Tag hat ein eigenes Image (Rollback = altes Tag deployen)
- **Unabhängig:** Kein Vendor Lock-in auf Railway's Build-System

---

## Offene Entscheidungen

| Frage | Optionen |
|---|---|
| Auth-Flow im Frontend | Implicit Flow (aktuell) – PKCE-Migration als nächster Schritt |
| Domain-Struktur | Entschieden: `mysocialapp.de` + `api.mysocialapp.de` + `assets.mysocialapp.de` + `auth.mysocialapp.de` |
| User-Management | Entschieden: Self-Registration deaktiviert, Admin legt User manuell an |
| Bild-URLs in DB | Relative Pfade (flexibler) – `config.assetsUrl` als Prefix im Frontend |
| Railway Sleep | Akzeptabel (~10s Cold Start) vs. Always-On (teurer) |
| CI/CD | Entschieden: Ein Release deployed beides (Frontend + Backend) |
| DNS | Entschieden: Domain bei GoDaddy, Nameserver auf Cloudflare umstellen |
