import { p256 } from './node_modules/@noble/curves/esm/p256.js';
import { sha256 } from './node_modules/@noble/hashes/esm/sha256.js';

// =========================================================================
// 1. STATE & LOCAL PERSISTENCE
// =========================================================================
const STATE = {
  currentScreen: 'screen-home',
  isSimulatedOffline: false,
  apiBaseUrl: localStorage.getItem('@authentiq_api_base_url') || 'http://localhost:8080',
  cachedKeys: JSON.parse(localStorage.getItem('@authentiq_cached_keys') || '{}'),
  scanHistory: JSON.parse(localStorage.getItem('@authentiq_history') || '[]'),
  pendingQueue: JSON.parse(localStorage.getItem('@authentiq_pending_queue') || '[]'),
  lastResult: null,
  jwtToken: localStorage.getItem('@authentiq_jwt_token') || null,
  mfgOrg: localStorage.getItem('@authentiq_user_org') || null,
  html5QrCode: null,
};

// Seed default demo key if not present
if (!STATE.cachedKeys['AUTHENTIQ-KEY-001'] && !STATE.cachedKeys['AUTH-KEY-001']) {
  // Demo Key initialized
  STATE.cachedKeys['AUTHENTIQ-KEY-001'] = {
    keyId: 'AUTHENTIQ-KEY-001',
    keyVersion: 1,
    curve: 'secp256r1',
    algorithm: 'SHA256withECDSA',
    publicKey: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE7p9KjG624P6wJbQpLqB+45m+a0Vn+12Y4r1Mv1A3p0QzG5K9pQzG5K9pQzG5K9pQzG5K9pQzG5K9pQzG5K9pQ==',
    active: true,
  };
}

// =========================================================================
// 2. CRYPTO UTILS (PURE CLIENT-SIDE OFFLINE ECDSA P-256)
// =========================================================================

function buildCanonicalString(v, mid, pid, name, brand, batch, mfg, exp) {
  const sanitize = (val) => (val ? String(val).trim() : '');
  return [
    'AUTHENTIQ',
    v || 1,
    sanitize(mid),
    sanitize(pid),
    sanitize(name),
    sanitize(brand),
    sanitize(batch),
    sanitize(mfg),
    sanitize(exp),
  ].join('|');
}

function parseSignatureBytes(sigBase64) {
  const binaryString = atob(sigBase64.trim());
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // If ASN.1 DER sequence
  if (bytes[0] === 0x30) {
    return p256.Signature.fromDER(bytes);
  }
  if (bytes.length === 64) {
    return p256.Signature.fromCompact(bytes);
  }
  return p256.Signature.fromDER(bytes);
}

function parsePublicKeyBytes(pubKeyBase64OrPem) {
  const clean = pubKeyBase64OrPem
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/\s+/g, '');

  const binaryString = atob(clean);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // X.509 SubjectPublicKeyInfo P-256 (91 bytes standard DER)
  if (bytes.length === 91 && bytes[0] === 0x30) {
    return bytes.slice(26); // Uncompressed point (65 bytes)
  }
  if (bytes.length === 65 || bytes.length === 33) {
    return bytes;
  }
  if (bytes.length > 65 && bytes[bytes.length - 65] === 0x04) {
    return bytes.slice(bytes.length - 65);
  }
  return bytes;
}

function verifyOfflineEcdsa(canonicalPayload, signatureBase64, publicKeyBase64) {
  try {
    const encoder = new TextEncoder();
    const hash = sha256(encoder.encode(canonicalPayload));
    const sig = parseSignatureBytes(signatureBase64);
    const pubKey = parsePublicKeyBytes(publicKeyBase64);
    return p256.verify(sig, hash, pubKey);
  } catch (e) {
    console.warn('ECDSA verification error:', e);
    return false;
  }
}

// =========================================================================
// 3. CORE VERIFICATION ENGINE
// =========================================================================

async function processVerification(qrRawString) {
  const timestamp = new Date().toISOString();
  let payload;

  try {
    payload = JSON.parse(qrRawString.trim());
    if (!payload.pid || !payload.sig || !payload.kid) {
      throw new Error('Missing essential fields');
    }
  } catch (e) {
    const result = {
      status: 'INVALID',
      cryptographicallyValid: false,
      message: 'Malformed QR code structure. Missing cryptographic signature or product metadata.',
      payload: null,
      canonicalPayload: '',
      keyId: 'UNKNOWN',
      verificationMode: isOnline() ? 'ONLINE' : 'OFFLINE',
      timestamp,
      riskLevel: 'CRITICAL',
      riskReason: 'Unparseable QR code',
    };
    saveScanResult(result);
    return result;
  }

  // 1. Check local public key cache
  let keyRecord = STATE.cachedKeys[payload.kid];

  // If missing and online, attempt to fetch from backend
  if (!keyRecord && isOnline()) {
    try {
      const res = await fetch(`${STATE.apiBaseUrl}/api/keys/${payload.kid}`);
      const data = await res.json();
      if (data.success && data.data) {
        keyRecord = data.data;
        STATE.cachedKeys[payload.kid] = keyRecord;
        localStorage.setItem('@authentiq_cached_keys', JSON.stringify(STATE.cachedKeys));
      }
    } catch (e) {
      console.warn('Failed to fetch public key online:', e);
    }
  }

  if (!keyRecord || !keyRecord.publicKey) {
    const result = {
      status: 'UNKNOWN_KEY',
      cryptographicallyValid: false,
      message: `Verification key "${payload.kid}" is not cached. Connect to internet once to download the public key.`,
      payload,
      canonicalPayload: '',
      keyId: payload.kid,
      verificationMode: isOnline() ? 'ONLINE' : 'OFFLINE',
      timestamp,
      riskLevel: 'HIGH',
      riskReason: 'Unknown Public Key',
    };
    saveScanResult(result);
    return result;
  }

  // 2. Deterministic Canonical reconstruction
  const canonical = buildCanonicalString(
    payload.v,
    payload.mid,
    payload.pid,
    payload.name,
    payload.brand,
    payload.batch,
    payload.mfg,
    payload.exp
  );

  // 3. Cryptographic Verification (Pure OFFLINE)
  const isValidSig = verifyOfflineEcdsa(canonical, payload.sig, keyRecord.publicKey);

  if (!isValidSig) {
    const result = {
      status: 'INVALID',
      cryptographicallyValid: false,
      message: 'VERIFICATION FAILED: Cryptographic signature mismatch. Product data or QR code has been altered or forged.',
      payload,
      canonicalPayload: canonical,
      keyId: payload.kid,
      verificationMode: isOnline() ? 'ONLINE' : 'OFFLINE',
      timestamp,
      riskLevel: 'CRITICAL',
      riskReason: 'Digital signature validation failed against manufacturer public key',
    };

    if (isOnline()) {
      recordScanOnline(payload.pid, 'INVALID', timestamp);
    }
    saveScanResult(result);
    return result;
  }

  // 4. Signature is VALID!
  if (isOnline()) {
    try {
      const scanData = await recordScanOnline(payload.pid, 'VALID', timestamp);
      if (scanData) {
        const isClone = scanData.cloneWarning || scanData.status === 'CLONE_DETECTED' || scanData.riskLevel === 'HIGH' || scanData.riskLevel === 'CRITICAL';
        const result = {
          status: isClone ? 'SUSPICIOUS_CLONE' : 'GENUINE',
          cryptographicallyValid: true,
          message: isClone
            ? 'SUSPICIOUS PRODUCT: Cryptographic signature is valid, but unusual duplicate scanning activity was detected (Possible cloned QR).'
            : 'PRODUCT VERIFIED: Valid digital signature with normal authentic scan history.',
          payload,
          canonicalPayload: canonical,
          keyId: payload.kid,
          verificationMode: 'ONLINE',
          timestamp,
          riskLevel: scanData.riskLevel,
          riskReason: scanData.riskReason,
          totalScans: scanData.totalScans,
          cloneWarning: scanData.cloneWarning,
        };
        saveScanResult(result);
        return result;
      }
    } catch (e) {
      console.warn('Online risk check failed, falling back to offline result:', e);
    }
  }

  // 5. Offline Verification fallback
  enqueueScanOffline(payload.pid, 'VALID', timestamp);
  const result = {
    status: 'GENUINE',
    cryptographicallyValid: true,
    message: 'PRODUCT VERIFIED (OFFLINE): Digitally signed by manufacturer with valid ECDSA signature. Scan queued for sync.',
    payload,
    canonicalPayload: canonical,
    keyId: payload.kid,
    verificationMode: 'OFFLINE',
    timestamp,
    riskLevel: 'LOW',
    riskReason: 'Cryptographically verified offline without backend dependency',
    totalScans: 1,
    cloneWarning: false,
  };
  saveScanResult(result);
  return result;
}

// =========================================================================
// 4. NETWORK & SYNC
// =========================================================================

function isOnline() {
  if (STATE.isSimulatedOffline) return false;
  return navigator.onLine;
}

async function recordScanOnline(productId, verificationResult, timestamp, customCoords = null) {
  try {
    const payload = {
      productId,
      deviceIdentifierHash: 'DEV_' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      timestamp: timestamp || new Date().toISOString(),
      networkStatus: 'ONLINE',
      verificationResult: verificationResult || 'VALID',
      latitude: customCoords ? customCoords.lat : 37.7749 + (Math.random() - 0.5) * 0.05,
      longitude: customCoords ? customCoords.lng : -122.4194 + (Math.random() - 0.5) * 0.05,
    };

    const res = await fetch(`${STATE.apiBaseUrl}/api/scans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    return json.data;
  } catch (e) {
    console.warn('Failed to record online scan:', e);
    return null;
  }
}

function enqueueScanOffline(productId, verificationResult, timestamp) {
  const item = {
    id: 'scan-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    productId,
    deviceIdentifierHash: 'OFFLINE_DEV_' + Math.random().toString(36).substring(2, 6),
    timestamp: timestamp || new Date().toISOString(),
    networkStatus: 'OFFLINE_SYNCED',
    verificationResult: verificationResult || 'VALID',
  };
  STATE.pendingQueue.push(item);
  localStorage.setItem('@authentiq_pending_queue', JSON.stringify(STATE.pendingQueue));
  updateQueueUI();
}

async function syncPendingQueue() {
  if (!isOnline() || STATE.pendingQueue.length === 0) return;

  let synced = 0;
  const remaining = [];

  for (const item of STATE.pendingQueue) {
    try {
      const res = await fetch(`${STATE.apiBaseUrl}/api/scans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      const data = await res.json();
      if (data.success) {
        synced++;
      } else {
        remaining.push(item);
      }
    } catch (e) {
      remaining.push(item);
    }
  }

  STATE.pendingQueue = remaining;
  localStorage.setItem('@authentiq_pending_queue', JSON.stringify(STATE.pendingQueue));
  updateQueueUI();
  return synced;
}

function saveScanResult(res) {
  STATE.lastResult = res;
  STATE.scanHistory.unshift(res);
  if (STATE.scanHistory.length > 100) STATE.scanHistory.pop();
  localStorage.setItem('@authentiq_history', JSON.stringify(STATE.scanHistory));
  renderHomeHistory();
  renderFullHistory('all');
}

// =========================================================================
// 5. SAMPLE PRESET GENERATOR
// =========================================================================

async function generateSampleQrPayloads() {
  // Fetch active keys from backend if online
  if (isOnline()) {
    try {
      const res = await fetch(`${STATE.apiBaseUrl}/api/keys`);
      const data = await res.json();
      if (data.success && data.data) {
        data.data.forEach((k) => {
          STATE.cachedKeys[k.keyId] = k;
        });
        localStorage.setItem('@authentiq_cached_keys', JSON.stringify(STATE.cachedKeys));
      }
    } catch (e) {}
  }
}

// =========================================================================
// 6. UI RENDERING & ROUTING
// =========================================================================

function navigateTo(screenId) {
  document.querySelectorAll('.screen-view').forEach((s) => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));

  const targetScreen = document.getElementById(screenId);
  if (targetScreen) {
    targetScreen.classList.add('active');
    STATE.currentScreen = screenId;

    const activeNav = document.querySelector(`.nav-item[data-screen="${screenId}"]`);
    if (activeNav) activeNav.classList.add('active');

    // Handle screen-specific initializers
    if (screenId === 'screen-scanner') {
      startCameraScanner();
    } else {
      stopCameraScanner();
    }

    if (screenId === 'screen-history') {
      renderFullHistory('all');
    }

    if (screenId === 'screen-settings') {
      renderCachedKeysList();
    }

    if (screenId === 'screen-manufacturer') {
      checkManufacturerAuth();
    }
  }
}

function updateNetworkUI() {
  const btn = document.getElementById('net-toggle-btn');
  const text = document.getElementById('net-status-text');
  const scannerBadge = document.getElementById('scanner-net-mode');

  if (isOnline()) {
    btn.className = 'net-pill online';
    text.textContent = 'ONLINE';
    if (scannerBadge) scannerBadge.textContent = 'ONLINE / VERIFIED';
    syncPendingQueue();
  } else {
    btn.className = 'net-pill offline';
    text.textContent = 'OFFLINE MODE';
    if (scannerBadge) scannerBadge.textContent = 'OFFLINE READY';
  }
}

function updateQueueUI() {
  const item = document.getElementById('queue-status-item');
  const badge = document.getElementById('queue-badge-count');
  if (STATE.pendingQueue.length > 0) {
    item.style.display = 'flex';
    badge.textContent = `${STATE.pendingQueue.length} pending sync`;
  } else {
    item.style.display = 'none';
  }
}

function renderResultScreen(res) {
  const card = document.getElementById('result-card');
  let icon = '✓';
  let title = 'PRODUCT VERIFIED';
  let sub = 'Cryptographic Signature Valid';
  let cardClass = 'genuine';

  if (res.status === 'INVALID') {
    icon = '✕';
    title = 'VERIFICATION FAILED';
    sub = 'Invalid / Altered Signature';
    cardClass = 'invalid';
  } else if (res.status === 'SUSPICIOUS_CLONE') {
    icon = '⚠';
    title = 'SUSPICIOUS PRODUCT';
    sub = 'Possible Copied QR Code';
    cardClass = 'suspicious';
  } else if (res.status === 'UNKNOWN_KEY') {
    icon = '?';
    title = 'UNKNOWN KEY';
    sub = 'Cannot Verify Offline';
    cardClass = 'invalid';
  }

  card.className = `result-card ${cardClass}`;
  card.innerHTML = `
    <div class="result-banner">
      <div class="result-icon-badge">${icon}</div>
      <div>
        <div class="result-status-title">${title}</div>
        <div class="result-status-sub">${sub}</div>
      </div>
    </div>

    <div class="result-message-box">
      ${res.message}
    </div>

    ${
      res.payload
        ? `
      <div class="product-specs-box">
        <div class="spec-row">
          <span class="spec-label">Product Name</span>
          <span class="spec-value">${res.payload.name || 'N/A'}</span>
        </div>
        <div class="spec-row">
          <span class="spec-label">Brand</span>
          <span class="spec-value">${res.payload.brand || 'N/A'}</span>
        </div>
        <div class="spec-row">
          <span class="spec-label">Product ID</span>
          <span class="spec-value">${res.payload.pid || 'N/A'}</span>
        </div>
        <div class="spec-row">
          <span class="spec-label">Batch Number</span>
          <span class="spec-value">${res.payload.batch || 'N/A'}</span>
        </div>
        <div class="spec-row">
          <span class="spec-label">Manufacturing Date</span>
          <span class="spec-value">${res.payload.mfg || 'N/A'}</span>
        </div>
        <div class="spec-row">
          <span class="spec-label">Expiry Date</span>
          <span class="spec-value">${res.payload.exp || 'N/A'}</span>
        </div>
      </div>
    `
        : ''
    }

    <div class="crypto-badge-grid">
      <div class="crypto-badge-item">
        <span class="cb-key">Crypto Signature</span>
        <span class="cb-val ${res.cryptographicallyValid ? 'text-success' : 'text-danger'}">
          ${res.cryptographicallyValid ? 'VALID (✓)' : 'INVALID (✕)'}
        </span>
      </div>
      <div class="crypto-badge-item">
        <span class="cb-key">Verification Mode</span>
        <span class="cb-val text-info">${res.verificationMode}</span>
      </div>
      <div class="crypto-badge-item">
        <span class="cb-key">Curve & Algorithm</span>
        <span class="cb-val">P-256 / SHA-256</span>
      </div>
      <div class="crypto-badge-item">
        <span class="cb-key">Risk Level</span>
        <span class="cb-val ${res.riskLevel === 'CRITICAL' || res.riskLevel === 'HIGH' ? 'text-danger' : res.riskLevel === 'MEDIUM' ? 'text-warning' : 'text-success'}">
          ${res.riskLevel || 'LOW'}
        </span>
      </div>
    </div>
  `;

  navigateTo('screen-result');
}

function renderProductDetails(res) {
  const container = document.getElementById('product-details-content');
  if (!res || !res.payload) {
    container.innerHTML = '<div class="empty-state">No product details available.</div>';
    return;
  }

  container.innerHTML = `
    <div class="section-card">
      <h3>Canonical Payload Reconstruction</h3>
      <p class="section-sub">The deterministic string constructed by the client and signed by the manufacturer:</p>
      <div class="canonical-live-box">
        <code>${res.canonicalPayload || 'N/A'}</code>
      </div>
    </div>

    <div class="section-card">
      <h3>Cryptographic Metadata</h3>
      <div class="spec-row">
        <span class="spec-label">Algorithm</span>
        <span class="spec-value">SHA256withECDSA</span>
      </div>
      <div class="spec-row">
        <span class="spec-label">Curve</span>
        <span class="spec-value">secp256r1 (NIST P-256)</span>
      </div>
      <div class="spec-row">
        <span class="spec-label">Public Key ID (kid)</span>
        <span class="spec-value"><code>${res.keyId}</code></span>
      </div>
      <div class="spec-row">
        <span class="spec-label">Signature Format</span>
        <span class="spec-value">Base64 ASN.1 DER</span>
      </div>
      <div class="spec-row">
        <span class="spec-label">Signature Bytes</span>
        <span class="spec-value sig-snippet">${res.payload.sig}</span>
      </div>
    </div>

    <div class="section-card">
      <h3>Scan Anomaly Analysis</h3>
      <div class="spec-row">
        <span class="spec-label">Total Scans Recorded</span>
        <span class="spec-value">${res.totalScans || 1}</span>
      </div>
      <div class="spec-row">
        <span class="spec-label">Risk Evaluation</span>
        <span class="spec-value ${res.riskLevel === 'HIGH' || res.riskLevel === 'CRITICAL' ? 'text-danger' : 'text-success'}">${res.riskLevel || 'LOW'}</span>
      </div>
      <div class="spec-row">
        <span class="spec-label">Evaluation Rationale</span>
        <span class="spec-value">${res.riskReason || 'Normal authentic product scan'}</span>
      </div>
    </div>
  `;
}

function renderHomeHistory() {
  const container = document.getElementById('home-history-list');
  if (STATE.scanHistory.length === 0) {
    container.innerHTML = '<div class="empty-state">No scans recorded yet. Scan a product to begin.</div>';
    return;
  }

  const recent = STATE.scanHistory.slice(0, 3);
  container.innerHTML = recent
    .map((item, idx) => `
      <div class="history-item" data-history-idx="${idx}">
        <div class="history-item-left">
          <div class="history-status-dot ${item.status === 'GENUINE' ? 'genuine' : item.status === 'SUSPICIOUS_CLONE' ? 'suspicious' : 'invalid'}"></div>
          <div>
            <div class="history-prod-name">${item.payload ? item.payload.name : 'Unknown Product'}</div>
            <div class="history-meta">${item.payload ? item.payload.pid : 'N/A'} • ${item.verificationMode}</div>
          </div>
        </div>
        <div class="history-item-right">
          <div>${item.status === 'GENUINE' ? 'Verified' : item.status === 'SUSPICIOUS_CLONE' ? 'Suspicious' : 'Failed'}</div>
          <small>${new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
        </div>
      </div>
    `)
    .join('');
}

function renderFullHistory(filter = 'all') {
  const container = document.getElementById('full-history-list');
  let list = STATE.scanHistory;

  if (filter === 'genuine') list = list.filter((i) => i.status === 'GENUINE');
  if (filter === 'suspicious') list = list.filter((i) => i.status === 'SUSPICIOUS_CLONE');
  if (filter === 'invalid') list = list.filter((i) => i.status === 'INVALID' || i.status === 'UNKNOWN_KEY');

  if (list.length === 0) {
    container.innerHTML = `<div class="empty-state">No scans matching "${filter}" filter.</div>`;
    return;
  }

  container.innerHTML = list
    .map((item, idx) => `
      <div class="history-item" data-full-idx="${idx}">
        <div class="history-item-left">
          <div class="history-status-dot ${item.status === 'GENUINE' ? 'genuine' : item.status === 'SUSPICIOUS_CLONE' ? 'suspicious' : 'invalid'}"></div>
          <div>
            <div class="history-prod-name">${item.payload ? item.payload.name : 'Unknown Product'}</div>
            <div class="history-meta">${item.payload ? item.payload.brand + ' • ' + item.payload.batch : 'Invalid QR'}</div>
          </div>
        </div>
        <div class="history-item-right">
          <div>${item.status}</div>
          <small>${new Date(item.timestamp).toLocaleDateString()} ${new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
        </div>
      </div>
    `)
    .join('');
}

function renderCachedKeysList() {
  const container = document.getElementById('cached-keys-list');
  const keys = Object.values(STATE.cachedKeys);

  if (keys.length === 0) {
    container.innerHTML = '<div class="empty-state">No public keys cached. Click "Fetch Active Keys".</div>';
    return;
  }

  container.innerHTML = keys
    .map((k) => `
      <div class="spec-row" style="margin-top:8px;">
        <span class="spec-label"><code>${k.keyId}</code> (v${k.keyVersion || 1})</span>
        <span class="spec-value text-success">Cached (P-256)</span>
      </div>
    `)
    .join('');
}

// =========================================================================
// 7. CAMERA SCANNER
// =========================================================================

function startCameraScanner() {
  if (typeof Html5Qrcode === 'undefined') return;

  const readerElement = document.getElementById('qr-reader');
  if (!readerElement) return;

  if (STATE.html5QrCode) {
    try {
      STATE.html5QrCode.stop().catch(() => {});
    } catch (e) {}
  }

  STATE.html5QrCode = new Html5Qrcode('qr-reader');
  STATE.html5QrCode
    .start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      async (decodedText) => {
        stopCameraScanner();
        const result = await processVerification(decodedText);
        renderResultScreen(result);
      },
      () => {}
    )
    .catch((err) => {
      console.warn('Camera start error (expected on desktop without permission):', err);
    });
}

function stopCameraScanner() {
  if (STATE.html5QrCode) {
    try {
      STATE.html5QrCode.stop().then(() => STATE.html5QrCode.clear()).catch(() => {});
    } catch (e) {}
  }
}

// =========================================================================
// 8. SECURITY DEMO & LIVE TAMPER LAB
// =========================================================================

function setupTamperLab() {
  const nameInput = document.getElementById('tamper-name');
  const brandInput = document.getElementById('tamper-brand');
  const batchInput = document.getElementById('tamper-batch');
  const mfgInput = document.getElementById('tamper-mfg');
  const expInput = document.getElementById('tamper-exp');
  const canonicalPreview = document.getElementById('tamper-canonical-preview');
  const evalBtn = document.getElementById('btn-eval-tamper');
  const resultBox = document.getElementById('tamper-eval-result');

  // Standard sample signature created for "Acme Paracetamol 500mg" with AUTH-P001
  let activeSample = {
    v: 1,
    alg: 'ES256',
    kid: 'AUTHENTIQ-KEY-001',
    mid: 'AUTH',
    pid: 'AUTH-P001',
    name: 'Acme Paracetamol 500mg',
    brand: 'Acme Pharma',
    batch: 'BATCH001',
    mfg: '2026-08-01',
    exp: '2028-08-01',
    sig: 'MEUCIQDV7Rz4qOWaxnEQBaOwPQMVYrwEREeBI02CSiXsgmT5vwIgcaOgCxlPDZQ1B3jEPd/3YdSTwFXpWtTN8cLSP+zTehA=',
  };

  function updatePreview() {
    const canonical = buildCanonicalString(
      1,
      'AUTH',
      'AUTH-P001',
      nameInput.value,
      brandInput.value,
      batchInput.value,
      mfgInput.value,
      expInput.value
    );
    canonicalPreview.textContent = canonical;
    return canonical;
  }

  [nameInput, brandInput, batchInput, mfgInput, expInput].forEach((input) => {
    input.addEventListener('input', updatePreview);
  });

  evalBtn.addEventListener('click', () => {
    const canonical = updatePreview();
    const key = STATE.cachedKeys['AUTHENTIQ-KEY-001'] || Object.values(STATE.cachedKeys)[0];

    if (!key) {
      resultBox.style.display = 'block';
      resultBox.className = 'tamper-result-box invalid';
      resultBox.textContent = 'No public key cached for evaluation.';
      return;
    }

    const isValid = verifyOfflineEcdsa(canonical, activeSample.sig, key.publicKey);

    resultBox.style.display = 'block';
    if (isValid) {
      resultBox.className = 'tamper-result-box genuine';
      resultBox.innerHTML = `✓ SIGNATURE VALID: The payload matches the original cryptographic signature exactly.`;
    } else {
      resultBox.className = 'tamper-result-box invalid';
      resultBox.innerHTML = `✕ SIGNATURE REJECTED: The modified canonical string no longer produces the original ECDSA signature digest! Counterfeit detected.`;
    }
  });
}

function setupCloneSimulator() {
  const output = document.getElementById('clone-sim-output');

  document.getElementById('btn-sim-normal-scan').addEventListener('click', async () => {
    output.style.display = 'block';
    output.innerHTML = '<span style="color:#38BDF8;">Submitting single authentic scan from San Francisco...</span>';

    const data = await recordScanOnline('AUTH-P001', 'VALID', new Date().toISOString(), { lat: 37.7749, lng: -122.4194 });
    if (data) {
      output.innerHTML = `
        <div style="color:#10B981; font-weight:700; margin-bottom:4px;">✓ Scan 1 Recorded: NORMAL</div>
        <div>Total Scans: ${data.totalScans} | Unique Devices: ${data.uniqueDevices}</div>
        <div>Risk Level: <strong style="color:#10B981;">${data.riskLevel}</strong> (${data.riskReason})</div>
      `;
    }
  });

  document.getElementById('btn-sim-rapid-burst').addEventListener('click', async () => {
    output.style.display = 'block';
    output.innerHTML = '<span style="color:#F59E0B;">Simulating 4 distinct devices scanning same QR within 2 minutes...</span>';

    let lastData = null;
    for (let i = 0; i < 4; i++) {
      lastData = await recordScanOnline('AUTH-P001', 'VALID', new Date().toISOString(), { lat: 37.7749 + i * 0.01, lng: -122.4194 + i * 0.01 });
    }

    if (lastData) {
      output.innerHTML = `
        <div style="color:#F59E0B; font-weight:700; margin-bottom:4px;">⚠ Risk Engine Triggered: ${lastData.status}</div>
        <div>Total Scans: ${lastData.totalScans} | Unique Devices: ${lastData.uniqueDevices}</div>
        <div>Risk Level: <strong style="color:#EF4444;">${lastData.riskLevel}</strong></div>
        <div>Reason: ${lastData.riskReason}</div>
        <div style="margin-top:6px; color:#F59E0B;">Result: Product QR flagged as <strong>POSSIBLE CLONE</strong> due to abnormal device burst.</div>
      `;
    }
  });

  document.getElementById('btn-sim-geo-anomaly').addEventListener('click', async () => {
    output.style.display = 'block';
    output.innerHTML = '<span style="color:#EF4444;">Simulating scan from Tokyo (35.6762, 139.6503) 1 minute after San Francisco scan (~8,200 km)...</span>';

    const data = await recordScanOnline('AUTH-P001', 'VALID', new Date().toISOString(), { lat: 35.6762, lng: 139.6503 });
    if (data) {
      output.innerHTML = `
        <div style="color:#EF4444; font-weight:700; margin-bottom:4px;">🚨 CRITICAL ANOMALY: CLONE_DETECTED</div>
        <div>Total Scans: ${data.totalScans} | Unique Devices: ${data.uniqueDevices}</div>
        <div>Risk Level: <strong style="color:#EF4444;">${data.riskLevel}</strong></div>
        <div style="color:#F87171; font-weight:600; margin-top:4px;">Trigger: ${data.riskReason}</div>
        <div style="margin-top:6px;">Conclusion: Physical copy of genuine QR identified in a geographically impossible travel window.</div>
      `;
    }
  });
}

// =========================================================================
// 9. MANUFACTURER PORTAL
// =========================================================================

function checkManufacturerAuth() {
  const authCard = document.getElementById('mfg-auth-card');
  const dashboard = document.getElementById('mfg-dashboard');

  if (STATE.jwtToken) {
    authCard.style.display = 'none';
    dashboard.style.display = 'block';
    loadManufacturerProducts();
  } else {
    authCard.style.display = 'block';
    dashboard.style.display = 'none';
  }
}

async function loadManufacturerProducts() {
  if (!isOnline() || !STATE.jwtToken) return;

  try {
    const res = await fetch(`${STATE.apiBaseUrl}/api/products?size=20`, {
      headers: { Authorization: `Bearer ${STATE.jwtToken}` },
    });
    const json = await res.json();
    const tableWrapper = document.getElementById('mfg-product-table-wrapper');

    if (json.success && json.data && json.data.content) {
      const prods = json.data.content;
      tableWrapper.innerHTML = `
        <table class="mfg-table">
          <thead>
            <tr>
              <th>Product ID</th>
              <th>Name</th>
              <th>Batch</th>
              <th>Scans</th>
              <th>Risk</th>
            </tr>
          </thead>
          <tbody>
            ${prods
              .map(
                (p) => `
              <tr>
                <td><code>${p.productId}</code></td>
                <td><strong>${p.productName}</strong></td>
                <td>${p.batchNumber}</td>
                <td>${p.scanCount || 0}</td>
                <td><span class="status-tag ${p.riskLevel === 'HIGH' || p.riskLevel === 'CRITICAL' ? 'tag-danger' : 'tag-success'}">${p.riskLevel || 'LOW'}</span></td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      `;
    }
  } catch (e) {
    console.warn('Failed to load manufacturer products:', e);
  }
}

// =========================================================================
// 10. EVENT LISTENERS INITIALIZATION
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {
  // 1. Navigation clicks
  document.querySelectorAll('[data-screen]').forEach((el) => {
    el.addEventListener('click', () => navigateTo(el.getAttribute('data-screen')));
  });
  document.querySelectorAll('.back-btn').forEach((btn) => {
    btn.addEventListener('click', () => navigateTo(btn.getAttribute('data-target')));
  });

  // 2. Network Toggle
  document.getElementById('net-toggle-btn').addEventListener('click', () => {
    STATE.isSimulatedOffline = !STATE.isSimulatedOffline;
    updateNetworkUI();
  });
  window.addEventListener('online', updateNetworkUI);
  window.addEventListener('offline', updateNetworkUI);
  updateNetworkUI();
  updateQueueUI();

  // 3. CTA Scan button on home
  document.getElementById('btn-start-scan').addEventListener('click', () => navigateTo('screen-scanner'));
  document.querySelectorAll('[data-action="scan-again"]').forEach((b) => {
    b.addEventListener('click', () => navigateTo('screen-scanner'));
  });

  // 4. View Details on result screen
  document.getElementById('btn-view-details').addEventListener('click', () => {
    if (STATE.lastResult) {
      renderProductDetails(STATE.lastResult);
      navigateTo('screen-product-details');
    }
  });

  // 5. Presets
  document.querySelectorAll('.preset-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const type = btn.getAttribute('data-preset');
      let qrJson = '';

      // Sample P-256 Signature generated for Demo Key
      if (type === 'genuine') {
        qrJson = JSON.stringify({
          v: 1,
          alg: 'ES256',
          kid: 'AUTHENTIQ-KEY-001',
          mid: 'AUTH',
          pid: 'AUTH-P001',
          name: 'Acme Paracetamol 500mg',
          brand: 'Acme Pharma',
          batch: 'BATCH001',
          mfg: '2026-08-01',
          exp: '2028-08-01',
          sig: 'MEUCIQDV7Rz4qOWaxnEQBaOwPQMVYrwEREeBI02CSiXsgmT5vwIgcaOgCxlPDZQ1B3jEPd/3YdSTwFXpWtTN8cLSP+zTehA=',
        });
      } else if (type === 'tamper-name') {
        qrJson = JSON.stringify({
          v: 1,
          alg: 'ES256',
          kid: 'AUTHENTIQ-KEY-001',
          mid: 'AUTH',
          pid: 'AUTH-P001',
          name: 'Counterfeit Paracetamol FAKED',
          brand: 'Acme Pharma',
          batch: 'BATCH001',
          mfg: '2026-08-01',
          exp: '2028-08-01',
          sig: 'MEUCIQDV7Rz4qOWaxnEQBaOwPQMVYrwEREeBI02CSiXsgmT5vwIgcaOgCxlPDZQ1B3jEPd/3YdSTwFXpWtTN8cLSP+zTehA=',
        });
      } else if (type === 'tamper-batch') {
        qrJson = JSON.stringify({
          v: 1,
          alg: 'ES256',
          kid: 'AUTHENTIQ-KEY-001',
          mid: 'AUTH',
          pid: 'AUTH-P001',
          name: 'Acme Paracetamol 500mg',
          brand: 'Acme Pharma',
          batch: 'TAMPERED_BATCH_888',
          mfg: '2026-08-01',
          exp: '2028-08-01',
          sig: 'MEUCIQDV7Rz4qOWaxnEQBaOwPQMVYrwEREeBI02CSiXsgmT5vwIgcaOgCxlPDZQ1B3jEPd/3YdSTwFXpWtTN8cLSP+zTehA=',
        });
      } else if (type === 'clone') {
        // First simulate rapid scan burst online, then verify
        await recordScanOnline('AUTH-P001', 'VALID', new Date().toISOString(), { lat: 37.77, lng: -122.41 });
        await recordScanOnline('AUTH-P001', 'VALID', new Date().toISOString(), { lat: 51.50, lng: -0.12 });
        qrJson = JSON.stringify({
          v: 1,
          alg: 'ES256',
          kid: 'AUTHENTIQ-KEY-001',
          mid: 'AUTH',
          pid: 'AUTH-P001',
          name: 'Acme Paracetamol 500mg',
          brand: 'Acme Pharma',
          batch: 'BATCH001',
          mfg: '2026-08-01',
          exp: '2028-08-01',
          sig: 'MEUCIQDV7Rz4qOWaxnEQBaOwPQMVYrwEREeBI02CSiXsgmT5vwIgcaOgCxlPDZQ1B3jEPd/3YdSTwFXpWtTN8cLSP+zTehA=',
        });
      }

      const res = await processVerification(qrJson);
      renderResultScreen(res);
    });
  });

  // 6. Manual Payload Verification
  document.getElementById('btn-verify-manual').addEventListener('click', async () => {
    const raw = document.getElementById('manual-qr-text').value;
    if (!raw.trim()) return alert('Please enter QR JSON');
    const res = await processVerification(raw);
    renderResultScreen(res);
  });

  // 7. QR Image file upload
  document.getElementById('qr-file-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file || typeof Html5Qrcode === 'undefined') return;

    const qrScanner = new Html5Qrcode('qr-reader');
    qrScanner
      .scanFile(file, true)
      .then(async (decodedText) => {
        const res = await processVerification(decodedText);
        renderResultScreen(res);
      })
      .catch((err) => {
        alert('Could not decode QR from image: ' + err);
      });
  });

  // 8. History tabs & clear
  document.querySelectorAll('.filter-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      renderFullHistory(tab.getAttribute('data-filter'));
    });
  });
  document.getElementById('btn-clear-history').addEventListener('click', () => {
    if (confirm('Clear all scan history?')) {
      STATE.scanHistory = [];
      localStorage.removeItem('@authentiq_history');
      renderHomeHistory();
      renderFullHistory('all');
    }
  });

  // 9. Settings
  document.getElementById('btn-save-api-url').addEventListener('click', () => {
    const url = document.getElementById('settings-api-url').value;
    STATE.apiBaseUrl = url.replace(/\/$/, '');
    localStorage.setItem('@authentiq_api_base_url', STATE.apiBaseUrl);
    alert('API Base URL saved!');
  });
  document.getElementById('btn-sync-keys').addEventListener('click', async () => {
    if (!isOnline()) return alert('Internet required to sync public keys');
    try {
      const res = await fetch(`${STATE.apiBaseUrl}/api/keys`);
      const data = await res.json();
      if (data.success && data.data) {
        data.data.forEach((k) => (STATE.cachedKeys[k.keyId] = k));
        localStorage.setItem('@authentiq_cached_keys', JSON.stringify(STATE.cachedKeys));
        renderCachedKeysList();
        alert(`Successfully synchronized ${data.data.length} active public keys!`);
      }
    } catch (e) {
      alert('Key sync failed: ' + e.message);
    }
  });
  document.getElementById('btn-sync-queue-now').addEventListener('click', async () => {
    const count = await syncPendingQueue();
    alert(`Synchronized ${count || 0} pending scan events to backend.`);
  });
  document.getElementById('btn-clear-queue').addEventListener('click', () => {
    STATE.pendingQueue = [];
    localStorage.removeItem('@authentiq_pending_queue');
    updateQueueUI();
  });

  // 10. Manufacturer login & product creation
  const loginForm = document.getElementById('mfg-login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const pass = document.getElementById('login-password').value;

      try {
        const res = await fetch(`${STATE.apiBaseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: pass }),
        });
        const json = await res.json();
        if (json.success && json.data) {
          STATE.jwtToken = json.data.token;
          STATE.mfgOrg = json.data.organizationCode;
          localStorage.setItem('@authentiq_jwt_token', json.data.token);
          localStorage.setItem('@authentiq_user_org', json.data.organizationCode);
          checkManufacturerAuth();
        } else {
          alert('Login failed: ' + json.message);
        }
      } catch (err) {
        alert('Login error: ' + err.message);
      }
    });
  }

  const logoutBtn = document.getElementById('btn-mfg-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      STATE.jwtToken = null;
      STATE.mfgOrg = null;
      localStorage.removeItem('@authentiq_jwt_token');
      localStorage.removeItem('@authentiq_user_org');
      checkManufacturerAuth();
    });
  }

  const createProdForm = document.getElementById('create-product-form');
  if (createProdForm) {
    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    const expDate = new Date(Date.now() + 2 * 365 * 24 * 3600 * 1000).toISOString().split('T')[0];
    document.getElementById('new-prod-mfg').value = today;
    document.getElementById('new-prod-exp').value = expDate;

    createProdForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const prodData = {
        productName: document.getElementById('new-prod-name').value,
        brand: document.getElementById('new-prod-brand').value,
        category: document.getElementById('new-prod-cat').value || 'General',
        batchNumber: document.getElementById('new-prod-batch').value,
        manufacturingDate: document.getElementById('new-prod-mfg').value,
        expiryDate: document.getElementById('new-prod-exp').value,
      };

      try {
        const res = await fetch(`${STATE.apiBaseUrl}/api/products`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${STATE.jwtToken}`,
          },
          body: JSON.stringify(prodData),
        });
        const json = await res.json();
        if (json.success && json.data) {
          const detail = json.data;
          const qrCard = document.getElementById('newly-created-qr-card');
          qrCard.style.display = 'block';

          document.getElementById('generated-qr-img').src = 'data:image/png;base64,' + detail.qrCodeBase64;
          document.getElementById('gen-prod-title').textContent = detail.productName;
          document.getElementById('gen-prod-id').textContent = detail.productId;
          document.getElementById('gen-prod-sig').textContent = detail.signature;
          document.getElementById('btn-download-qr').href = 'data:image/png;base64,' + detail.qrCodeBase64;

          document.getElementById('btn-test-scan-generated').onclick = async () => {
            const qrJson = JSON.stringify(detail.qrPayload);
            const verifyRes = await processVerification(qrJson);
            renderResultScreen(verifyRes);
          };

          loadManufacturerProducts();
          alert('Product created and signed with ECDSA P-256 private key!');
        } else {
          alert('Failed to create product: ' + json.message);
        }
      } catch (err) {
        alert('Product creation error: ' + err.message);
      }
    });
  }

  // Initial loads
  setupTamperLab();
  setupCloneSimulator();
  renderHomeHistory();
  generateSampleQrPayloads();
});
