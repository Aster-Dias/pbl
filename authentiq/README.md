# AuthentiQ – Offline-First Counterfeit Product Detection System

AuthentiQ is a full-stack, offline-first product authenticity defense platform that combines **ECDSA P-256 (`secp256r1`) digital signatures** on canonical product payloads with an **online duplicate-scan and geographic anomaly risk engine**.

---

## 1. Key Highlights & Architectural Flow

```
                      AUTHENTIQ SYSTEM ARCHITECTURE
                                    │
                                    ▼
                             Scan Product QR
                                    │
                                    ▼
                          ┌───────────────────┐
                          │   Offline ECDSA   │
                          │  Signature Check  │
                          └─────────┬─────────┘
                                    │
                            ┌───────┴────────┐
                            │                │
                         VALID            INVALID
                            │                │
                            ▼                ▼
                         VERIFIED          FAILED
                            │
                            ▼
                      Internet Available?
                         │          │
                        YES         NO
                         │           │
                         ▼           ▼
                   Duplicate       Offline
                   Scan Check    Verification
                         │
                         ▼
                     Risk Engine
                         │
                     ┌───┴────┐
                     │        │
                   NORMAL   SUSPICIOUS
                     │        │
                     ▼        ▼
                  GENUINE   POSSIBLE
                            CLONE
```

### Core Cryptographic Distinction:
1. **Invalid Signature = Cryptographically Altered / Forged**: The product name, batch, dates, or payload have been tampered with or signed by an unauthorized key.
2. **Valid Signature + Suspicious Duplicate Scans = Possible Physical Clone**: The QR code itself is genuine, but an attacker has physically copied/printed the genuine label onto multiple fake products.
3. **Valid Signature + Normal Scan History = Verified Genuine**: Digital signature is valid and scan behavior matches legitimate single-item lifecycle.

---

## 2. Technology Stack

* **Backend:** Java 17+ / Java 24, Spring Boot 3.3, Spring Security, Spring Data JPA, Hibernate, PostgreSQL
* **Cryptography:** Bouncy Castle & Java Security (`SHA256withECDSA`, NIST curve `secp256r1` / P-256)
* **QR Engine:** ZXing (`core` & `javase`) high-resolution PNG generator
* **Mobile / Web App:** React Native / TypeScript & Noble Curves (`@noble/curves/p256`, `@noble/hashes/sha256`)
* **Local Storage & Offline Queue:** LocalStorage / AsyncStorage persistence with auto-sync when online
* **Containerization:** Docker & Docker Compose

---

## 3. Deterministic Canonicalization & QR Payload Format

### Canonical Payload String:
```
AUTHENTIQ|version|manufacturerCode|productId|productName|brand|batchNumber|manufacturingDate|expiryDate
```
Example:
```
AUTHENTIQ|1|AUTH|AUTH-P001|Acme Paracetamol 500mg|Acme Pharma|BATCH001|2026-08-01|2028-08-01
```

### Compact QR JSON:
```json
{
  "v": 1,
  "alg": "ES256",
  "kid": "AUTHENTIQ-KEY-001",
  "mid": "AUTH",
  "pid": "AUTH-P001",
  "name": "Acme Paracetamol 500mg",
  "brand": "Acme Pharma",
  "batch": "BATCH001",
  "mfg": "2026-08-01",
  "exp": "2028-08-01",
  "sig": "MEUCIQDV7Rz4qOWaxnEQBaOwPQMVYrwEREeBI02CSiXsgmT5vwIgcaOgCxlPDZQ1B3jEPd/3YdSTwFXpWtTN8cLSP+zTehA="
}
```

---

## 4. Quick Start & Execution

### Option A: Run Full Stack via Docker Compose
```bash
docker-compose up --build
```
* Web/Mobile App: `http://localhost:3000`
* Backend API: `http://localhost:8080`
* PostgreSQL: `localhost:5432`

---

### Option B: Run Locally

#### 1. Backend (Spring Boot):
```bash
cd backend
mvn clean spring-boot:run
```
*(Or use `tools/maven/bin/mvn.cmd`)*

#### 2. Mobile App (Web Runner):
```bash
cd mobile
npm install
npm start
```
Open **`http://localhost:3000`** in your browser.

---

## 5. Automated Test Suites

### Run Backend Tests (Unit, Tamper, Risk Engine & Integration):
```bash
cd backend
mvn test "-Dspring.profiles.active=test"
```
**Results:** 9/9 Tests Passing (`EcdsaSignatureServiceTest`, `CanonicalPayloadServiceTest`, `RiskAssessmentServiceTest`, `ProductLifecycleIntegrationTest`).

### Run Mobile Offline Cryptography Tests:
```bash
cd mobile
npm test
```
**Results:** All offline P-256 verification and tamper tests passing.

---

## 6. Demonstration Guide (Step-by-Step for Presentations)

1. **Genuine Offline Verification**:
   - In the mobile app, click the **"ONLINE"** pill in the top header to toggle **OFFLINE MODE (Airplane Mode Simulation)**.
   - Click the **"Genuine Product"** quick preset or scan a genuine QR.
   - **Result:** Display shows `PRODUCT VERIFIED (OFFLINE)` with green theme and valid cryptographic signature details, verifying that zero network calls were required.

2. **Tamper Test Lab**:
   - Navigate to the **"Security Demo"** tab in the bottom bar.
   - Under **Interactive Tamper Lab**, change `Product Name` from `Acme Paracetamol 500mg` to `Counterfeit Paracetamol FAKED`.
   - Click **Evaluate Cryptographic Signature**.
   - **Result:** The client recalculates the SHA-256 hash of the modified canonical string and the P-256 verification immediately fails (`✕ SIGNATURE REJECTED`).

3. **Duplicate Scan & Clone Detection**:
   - In the **Security Demo** tab, click **"Simulate Impossible Geo Travel (SF → Tokyo in 2 mins)"**.
   - **Result:** The backend risk engine flags the scan as `CRITICAL / CLONE_DETECTED` (`Impossible travel velocity: 103,397 km/h between locations (8,616 km apart)`), protecting consumers against cloned genuine QR codes.

4. **Manufacturer Portal**:
   - Navigate to the **"Portal"** tab.
   - Log in using `admin@authentiq.demo` / `admin123`.
   - Fill in product details (e.g. `UltraFit Smartwatch 2`, `FitPulse`, `FP-2026-9`).
   - Click **Sign & Generate QR Code**.
   - **Result:** Product is signed with manufacturer's private key, registered in DB, and high-res printable QR code is generated. Click **Test Scan in App** to instantly verify it.
