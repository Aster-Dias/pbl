# AuthentiQ – Offline-First Counterfeit Product Detection System

AuthentiQ is a full-stack, offline-first product authenticity defense platform that combines **ECDSA P-256 (`secp256r1`) digital signatures** on canonical product payloads with an **online duplicate-scan and geographic anomaly risk engine**.

---

## 1. Project Directory Structure
```
c:/pbl_project/
├── authentiq/
│   ├── backend/             # Java 17+ Spring Boot 3 Backend
│   │   ├── src/main/java/com/authentiq/
│   │   │   ├── config/      # SecurityConfig, CORS, Beans
│   │   │   ├── controller/  # Auth, Product, Scan, Key, Verify, Dashboard
│   │   │   ├── crypto/      # EcdsaSignatureService, CanonicalPayloadService, KeyManager
│   │   │   ├── dto/         # Request and Response DTOs
│   │   │   ├── entity/      # Manufacturer, Product, Signature, PublicKey, ScanEvent, Summary
│   │   │   ├── exception/   # GlobalExceptionHandler, Custom Exceptions
│   │   │   ├── repository/  # JPA Repositories
│   │   │   ├── security/    # JwtTokenProvider, JwtAuthenticationFilter, UserDetailsService
│   │   │   ├── service/     # AuthService, ProductService, ScanService, RiskAssessmentService, QrCodeService
│   │   │   └── util/        # GeoUtil, HashUtil
│   │   ├── src/test/java/   # Unit & Integration Tests (9/9 Passed)
│   │   ├── pom.xml
│   │   └── Dockerfile
│   ├── mobile/              # React Native / TypeScript & Web Runner
│   │   ├── public/          # Index.html, styles.css, app.js
│   │   ├── src/             # Pure Crypto, Storage, API clients, Type definitions
│   │   ├── tests/           # Client-side offline ECDSA unit tests
│   │   ├── server.js        # Node.js Web & Mobile server (Port 3000)
│   │   └── Dockerfile
│   ├── database/
│   │   └── schema.sql       # PostgreSQL DDL migrations
│   ├── docker-compose.yml
│   ├── .env.example
│   └── README.md
```

---

## 2. Quick Execution

### Start Backend:
```powershell
cd c:\pbl_project\authentiq\backend
& "c:\pbl_project\tools\maven\bin\mvn.cmd" spring-boot:run
```

### Start Mobile Web App:
```powershell
cd c:\pbl_project\authentiq\mobile
npm start
```
Access the application at **`http://localhost:3000`**.
