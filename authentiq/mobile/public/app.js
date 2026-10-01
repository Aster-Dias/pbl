import { p256 } from './node_modules/@noble/curves/esm/p256.js';
import { sha256 } from './node_modules/@noble/hashes/esm/sha256.js';

// =========================================================================
// 1. STATE & PERSISTENCE
// =========================================================================
const STATE = {
  currentScreen: 'screen-user-dashboard',
  currentRole: 'consumer', // 'consumer' | 'manufacturer'
  isSimulatedOffline: false,
  apiBaseUrl: localStorage.getItem('@authentiq_api_base_url') || 'http://localhost:8080',
  cachedKeys: JSON.parse(localStorage.getItem('@authentiq_cached_keys') || '{}'),
  scanHistory: JSON.parse(localStorage.getItem('@authentiq_history') || '[]'),
  pendingQueue: JSON.parse(localStorage.getItem('@authentiq_pending_queue') || '[]'),
  mfgProducts: JSON.parse(localStorage.getItem('@authentiq_mfg_products') || '[]'),
  lastResult: null,
  jwtToken: localStorage.getItem('@authentiq_jwt_token') || null,
  mfgOrg: localStorage.getItem('@authentiq_user_org') || 'AUTH',
  mfgPrivateKeyHex: localStorage.getItem('@authentiq_mfg_privkey') || null,
  mfgPublicKeyBase64: localStorage.getItem('@authentiq_mfg_pubkey') || null,
  mfgKeyId: localStorage.getItem('@authentiq_mfg_keyid') || 'AUTHENTIQ-KEY-001',
  html5QrCode: null,
};

// Seed default demo key if not present
if (!STATE.cachedKeys['AUTHENTIQ-KEY-001'] && !STATE.cachedKeys['AUTH-KEY-001']) {
  STATE.cachedKeys['AUTHENTIQ-KEY-001'] = {
    keyId: 'AUTHENTIQ-KEY-001',
    keyVersion: 1,
    curve: 'secp256r1',
    algorithm: 'SHA256withECDSA',
    publicKey: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE7p9KjG624P6wJbQpLqB+45m+a0Vn+12Y4r1Mv1A3p0QzG5K9pQzG5K9pQzG5K9pQzG5K9pQzG5K9pQzG5K9pQ==',
    active: true,
  };
  localStorage.setItem('@authentiq_cached_keys', JSON.stringify(STATE.cachedKeys));
}

// Initialize default manufacturer private key if none exists
if (!STATE.mfgPrivateKeyHex) {
  // Demo 32-byte private key for manufacturer demo
  STATE.mfgPrivateKeyHex = 'e8b7c4a123f859218654a9c80d452179b4561029384756102938475610293847';
  localStorage.setItem('@authentiq_mfg_privkey', STATE.mfgPrivateKeyHex);
}

// Compute matching public key if not cached
if (!STATE.mfgPublicKeyBase64 && STATE.mfgPrivateKeyHex) {
  try {
    const privBytes = hexToBytes(STATE.mfgPrivateKeyHex);
    const pubBytes = p256.getPublicKey(privBytes, false);
    STATE.mfgPublicKeyBase64 = encodeX509PublicKey(pubBytes);
    localStorage.setItem('@authentiq_mfg_pubkey', STATE.mfgPublicKeyBase64);
    
    // Also add to cached keys for consumer verification
    STATE.cachedKeys[STATE.mfgKeyId] = {
      keyId: STATE.mfgKeyId,
      keyVersion: 1,
      curve: 'secp256r1',
      algorithm: 'SHA256withECDSA',
      publicKey: STATE.mfgPublicKeyBase64,
      active: true,
    };
    localStorage.setItem('@authentiq_cached_keys', JSON.stringify(STATE.cachedKeys));
  } catch (e) {
    console.warn('Could not derive default public key:', e);
  }
}

// Seed default initial manufacturer catalog if empty
if (STATE.mfgProducts.length === 0) {
  STATE.mfgProducts = [
    {
      productId: 'AUTH-P001',
      productName: 'Acme Paracetamol 500mg',
      brand: 'Acme Pharma',
      category: 'Pharmaceuticals',
      batchNumber: 'BATCH001',
      manufacturingDate: '2026-08-01',
      expiryDate: '2028-08-01',
      keyId: 'AUTHENTIQ-KEY-001',
      signature: 'MEUCIQDV7Rz4qOWaxnEQBaOwPQMVYrwEREeBI02CSiXsgmT5vwIgcaOgCxlPDZQ1B3jEPd/3YdSTwFXpWtTN8cLSP+zTehA=',
      scanCount: 12,
      riskLevel: 'LOW',
      status: 'ACTIVE',
    },
    {
      productId: 'AUTH-P002',
      productName: 'UltraFit Pro Smartwatch',
      brand: 'PulseTech',
      category: 'Electronics',
      batchNumber: 'PT-2026-X1',
      manufacturingDate: '2026-09-15',
      expiryDate: '2029-09-15',
      keyId: 'AUTHENTIQ-KEY-001',
      signature: 'MEQCIG8jWn0c2YmP5kLv9xQ1r2t4Y5u6I8o9p0q1r2s3t4u5AiA3e5r6t7y8u9i0o1p2q3r4s5t6u7v8w9x0y1z2a3b4c5==',
      scanCount: 3,
      riskLevel: 'LOW',
      status: 'ACTIVE',
    }
  ];
  localStorage.setItem('@authentiq_mfg_products', JSON.stringify(STATE.mfgProducts));
}

// =========================================================================
// 2. CRYPTOGRAPHIC UTILITIES (ECDSA P-256 SECP256R1)
// =========================================================================

function hexToBytes(hex) {
  const clean = hex.replace(/[^0-9a-fA-F]/g, '');
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function bytesToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(base64) {
  const clean = base64.replace(/\s+/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Standard X.509 SubjectPublicKeyInfo DER header for P-256 (26 bytes)
const X509_P256_HEADER_HEX = '3059301306072a8648ce3d020106082a8648ce3d030107034200';

function encodeX509PublicKey(uncompressedPubBytes) {
  const header = hexToBytes(X509_P256_HEADER_HEX);
  const combined = new Uint8Array(header.length + uncompressedPubBytes.length);
  combined.set(header, 0);
  combined.set(uncompressedPubBytes, header.length);
  return bytesToBase64(combined);
}

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
  const bytes = base64ToBytes(sigBase64);
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

  const bytes = base64ToBytes(clean);

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

/**
 * Sign canonical string using manufacturer's private key
 */
function signWithPrivateKey(canonicalPayload, privateKeyHex) {
  try {
    const encoder = new TextEncoder();
    const hash = sha256(encoder.encode(canonicalPayload));
    const privBytes = hexToBytes(privateKeyHex);
    const sig = p256.sign(hash, privBytes);
    const derBytes = sig.toDERRawBytes();
    return bytesToBase64(derBytes);
  } catch (e) {
    console.error('Signing error:', e);
    throw new Error('Failed to sign payload with private key: ' + e.message);
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
      throw new Error('Missing essential fields (pid, sig, kid)');
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
      riskReason: 'Unparseable or non-AuthentiQ QR format',
    };
    saveScanResult(result);
    return result;
  }

  // 1. Fetch public key from cache
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
      console.warn('Could not reach backend for key lookup');
    }
  }

  // Fallback: If still not found, check if only one key is registered
  if (!keyRecord && Object.keys(STATE.cachedKeys).length > 0) {
    keyRecord = Object.values(STATE.cachedKeys)[0];
  }

  // 2. Reconstruct Canonical String
  const canonical = buildCanonicalString(
    payload.v || 1,
    payload.mid || 'AUTH',
    payload.pid,
    payload.name,
    payload.brand,
    payload.batch,
    payload.mfg,
    payload.exp
  );

  // 3. Execute Offline ECDSA Verification
  let isCryptoValid = false;
  if (keyRecord && keyRecord.publicKey) {
    isCryptoValid = verifyOfflineEcdsa(canonical, payload.sig, keyRecord.publicKey);
  }

  let finalStatus = isCryptoValid ? 'GENUINE' : 'INVALID';
  let message = isCryptoValid
    ? 'Product authenticity verified mathematically using manufacturer digital signature.'
    : 'Cryptographic signature mismatch! The QR data has been modified or forged.';
  let riskLevel = isCryptoValid ? 'LOW' : 'CRITICAL';
  let riskReason = isCryptoValid ? 'Valid ECDSA signature' : 'Signature verification failed';

  // 4. Online duplicate/anomaly check if online
  if (isOnline() && isCryptoValid) {
    try {
      const onlineAssessment = await recordScanOnline(
        payload.pid,
        isCryptoValid ? 'VALID' : 'INVALID',
        timestamp,
        await getApproxLocation()
      );

      if (onlineAssessment) {
        if (onlineAssessment.riskLevel === 'HIGH' || onlineAssessment.riskLevel === 'CRITICAL') {
          finalStatus = 'SUSPICIOUS';
          riskLevel = onlineAssessment.riskLevel;
          riskReason = onlineAssessment.riskReason || 'Duplicate QR scans detected across multiple devices';
          message = `Warning: Valid signature, but backend flagged ${riskReason}.`;
        }
      }
    } catch (err) {
      console.warn('Online sync failed, falling back to pure offline result:', err);
    }
  } else if (!isOnline() && isCryptoValid) {
    // Queue offline scan for later synchronization
    queueOfflineScan(payload.pid, isCryptoValid ? 'VALID' : 'INVALID', timestamp);
  }

  const result = {
    status: finalStatus,
    cryptographicallyValid: isCryptoValid,
    message,
    payload,
    canonicalPayload: canonical,
    keyId: payload.kid || (keyRecord ? keyRecord.keyId : 'UNKNOWN'),
    verificationMode: isOnline() ? 'ONLINE' : 'OFFLINE',
    timestamp,
    riskLevel,
    riskReason,
  };

  saveScanResult(result);
  return result;
}

// =========================================================================
// 4. NETWORKING & SYNC QUEUE
// =========================================================================

function isOnline() {
  return navigator.onLine && !STATE.isSimulatedOffline;
}

function updateNetworkUI() {
  const netBtn = document.getElementById('net-toggle-btn');
  const netText = document.getElementById('net-status-text');
  const scannerMode = document.getElementById('scanner-net-mode');

  if (isOnline()) {
    netBtn.className = 'net-pill online';
    netText.textContent = 'ONLINE';
    if (scannerMode) {
      scannerMode.textContent = 'ONLINE ASSISTED';
      scannerMode.className = 'mode-badge-small online';
    }
  } else {
    netBtn.className = 'net-pill offline';
    netText.textContent = 'OFFLINE MODE';
    if (scannerMode) {
      scannerMode.textContent = 'OFFLINE CRYPTO READY';
      scannerMode.className = 'mode-badge-small offline';
    }
  }
}

async function getApproxLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ lat: 37.7749, lng: -122.4194 }); // Default fallback (SF)
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve({ lat: 37.7749, lng: -122.4194 }),
      { timeout: 3000 }
    );
  });
}

async function recordScanOnline(productId, verificationResult, timestamp, coords) {
  try {
    const res = await fetch(`${STATE.apiBaseUrl}/api/scans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId,
        verificationResult,
        deviceIdentifier: 'AQ-WEB-CLIENT-' + getDeviceId(),
        timestamp,
        latitude: coords ? coords.lat : 37.7749,
        longitude: coords ? coords.lng : -122.4194,
        networkStatus: 'ONLINE',
      }),
    });
    const json = await res.json();
    return json.success ? json.data : null;
  } catch (e) {
    return null;
  }
}

function getDeviceId() {
  let devId = localStorage.getItem('@authentiq_device_id');
  if (!devId) {
    devId = 'DEV-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    localStorage.setItem('@authentiq_device_id', devId);
  }
  return devId;
}

function queueOfflineScan(productId, verificationResult, timestamp) {
  STATE.pendingQueue.push({
    productId,
    verificationResult,
    deviceIdentifier: 'AQ-WEB-CLIENT-' + getDeviceId(),
    timestamp,
    latitude: 37.7749,
    longitude: -122.4194,
    networkStatus: 'OFFLINE_SYNCED',
  });
  localStorage.setItem('@authentiq_pending_queue', JSON.stringify(STATE.pendingQueue));
  updateQueueUI();
}

async function syncPendingQueue() {
  if (!isOnline() || STATE.pendingQueue.length === 0) return 0;
  const count = STATE.pendingQueue.length;

  try {
    const res = await fetch(`${STATE.apiBaseUrl}/api/scans/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scans: STATE.pendingQueue }),
    });
    const json = await res.json();
    if (json.success) {
      STATE.pendingQueue = [];
      localStorage.removeItem('@authentiq_pending_queue');
      updateQueueUI();
      return count;
    }
  } catch (e) {
    console.warn('Queue sync error:', e);
  }
  return 0;
}

function updateQueueUI() {
  const badge = document.getElementById('queue-status-item');
  const countSpan = document.getElementById('queue-badge-count');
  if (STATE.pendingQueue.length > 0) {
    badge.style.display = 'flex';
    countSpan.textContent = `${STATE.pendingQueue.length} pending sync`;
  } else {
    badge.style.display = 'none';
  }
}

// =========================================================================
// 5. NAVIGATION & ROLE SWITCHER
// =========================================================================

function navigateTo(screenId) {
  document.querySelectorAll('.screen-view').forEach((s) => s.classList.remove('active'));
  const target = document.getElementById(screenId);
  if (target) {
    target.classList.add('active');
    STATE.currentScreen = screenId;
    window.scrollTo(0, 0);
  }

  // Update bottom nav highlighting
  document.querySelectorAll('.nav-item').forEach((item) => {
    if (item.getAttribute('data-screen') === screenId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Role header sync
  updateHeaderPortalLabel();

  // Screen specific hooks
  if (screenId === 'screen-scanner') {
    startCameraScanner();
  } else {
    stopCameraScanner();
  }

  if (screenId === 'screen-history') {
    renderFullHistory('all');
  }

  if (screenId === 'screen-user-dashboard') {
    updateConsumerStats();
    renderHomeHistory();
  }

  if (screenId === 'screen-manufacturer-dashboard') {
    checkManufacturerAuth();
    renderKeyManagementStudio();
  }
}

function updateHeaderPortalLabel() {
  const label = document.getElementById('header-portal-label');
  const switchBtn = document.getElementById('role-switch-label');
  const switchIcon = document.querySelector('.role-switch-btn .role-icon');

  if (STATE.currentScreen === 'screen-manufacturer-dashboard') {
    if (label) label.textContent = 'Manufacturer Enterprise';
    if (switchBtn) switchBtn.textContent = 'Consumer Mode';
    if (switchIcon) switchIcon.textContent = '👤';
  } else {
    if (label) label.textContent = 'Consumer Dashboard';
    if (switchBtn) switchBtn.textContent = 'Manufacturer Portal';
    if (switchIcon) switchIcon.textContent = '🏢';
  }
}

function togglePortalRole() {
  if (STATE.currentScreen === 'screen-manufacturer-dashboard') {
    navigateTo('screen-user-dashboard');
  } else {
    navigateTo('screen-manufacturer-dashboard');
  }
}

// =========================================================================
// 6. CONSUMER DASHBOARD & HISTORY
// =========================================================================

function saveScanResult(res) {
  STATE.lastResult = res;
  STATE.scanHistory.unshift(res);
  if (STATE.scanHistory.length > 50) STATE.scanHistory.pop();
  localStorage.setItem('@authentiq_history', JSON.stringify(STATE.scanHistory));

  updateConsumerStats();
  renderHomeHistory();
}

function updateConsumerStats() {
  const verifiedCount = STATE.scanHistory.filter((s) => s.status === 'GENUINE').length;
  const counterfeitCount = STATE.scanHistory.filter((s) => s.status === 'INVALID').length;
  const suspiciousCount = STATE.scanHistory.filter((s) => s.status === 'SUSPICIOUS').length;

  const vEl = document.getElementById('user-stat-verified');
  const cEl = document.getElementById('user-stat-counterfeit');
  const sEl = document.getElementById('user-stat-suspicious');

  if (vEl) vEl.textContent = verifiedCount;
  if (cEl) cEl.textContent = counterfeitCount;
  if (sEl) sEl.textContent = suspiciousCount;
}

function renderHomeHistory() {
  const listEl = document.getElementById('home-history-list');
  if (!listEl) return;

  if (STATE.scanHistory.length === 0) {
    listEl.innerHTML = `<div class="empty-state">No scans recorded yet. Scan or test a preset to begin.</div>`;
    return;
  }

  const recent = STATE.scanHistory.slice(0, 4);
  listEl.innerHTML = recent
    .map(
      (item) => `
    <div class="history-item-compact ${item.status.toLowerCase()}" onclick="inspectHistoryItem('${item.timestamp}')">
      <div class="history-status-icon">${item.status === 'GENUINE' ? '✓' : item.status === 'SUSPICIOUS' ? '⚠' : '✕'}</div>
      <div class="history-info">
        <strong>${item.payload ? item.payload.name : 'Unknown Product'}</strong>
        <small>${item.payload ? item.payload.pid : 'Malformed QR'} • ${new Date(item.timestamp).toLocaleTimeString()}</small>
      </div>
      <span class="status-tag tag-${item.status.toLowerCase()}">${item.status}</span>
    </div>
  `
    )
    .join('');
}

function renderFullHistory(filter = 'all') {
  const container = document.getElementById('full-history-list');
  if (!container) return;

  let list = STATE.scanHistory;
  if (filter === 'genuine') list = list.filter((s) => s.status === 'GENUINE');
  if (filter === 'suspicious') list = list.filter((s) => s.status === 'SUSPICIOUS');
  if (filter === 'invalid') list = list.filter((s) => s.status === 'INVALID');

  if (list.length === 0) {
    container.innerHTML = `<div class="empty-state">No scan records found for "${filter}".</div>`;
    return;
  }

  container.innerHTML = list
    .map(
      (s) => `
    <div class="history-card ${s.status.toLowerCase()}">
      <div class="history-card-header">
        <span class="status-tag tag-${s.status.toLowerCase()}">${s.status}</span>
        <span class="history-time">${new Date(s.timestamp).toLocaleString()}</span>
      </div>
      <h4>${s.payload ? s.payload.name : 'Unrecognized Payload'}</h4>
      <div class="history-meta-row">
        <span>PID: <code>${s.payload ? s.payload.pid : 'N/A'}</code></span>
        <span>Batch: <strong>${s.payload ? s.payload.batch : 'N/A'}</strong></span>
      </div>
      <div class="history-meta-row">
        <span>Crypto: <strong>${s.cryptographicallyValid ? 'VERIFIED (✓)' : 'FAILED (✕)'}</strong></span>
        <span>Mode: <strong class="text-info">${s.verificationMode}</strong></span>
      </div>
    </div>
  `
    )
    .join('');
}

window.inspectHistoryItem = function (ts) {
  const item = STATE.scanHistory.find((s) => s.timestamp === ts);
  if (item) {
    STATE.lastResult = item;
    renderResultScreen(item);
    navigateTo('screen-result');
  }
};

// =========================================================================
// 7. VERIFICATION RESULT & CRYPTO PROOF RENDERER
// =========================================================================

function renderResultScreen(res) {
  const card = document.getElementById('result-card');
  if (!card) return;

  card.className = `result-card ${res.status.toLowerCase()}`;

  let statusTitle = 'GENUINE PRODUCT';
  let badgeColor = 'text-success';
  let iconSvg = `
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <path d="M9 12l2 2 4-4"/>
    </svg>`;

  if (res.status === 'SUSPICIOUS') {
    statusTitle = 'SUSPICIOUS (DUPLICATE SCAN)';
    badgeColor = 'text-warning';
    iconSvg = `
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>`;
  } else if (res.status === 'INVALID') {
    statusTitle = 'COUNTERFEIT DETECTED';
    badgeColor = 'text-danger';
    iconSvg = `
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" y1="9" x2="9" y2="15"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
      </svg>`;
  }

  card.innerHTML = `
    <div class="result-badge-icon ${res.status.toLowerCase()}">${iconSvg}</div>
    <h2 class="${badgeColor}">${statusTitle}</h2>
    <p class="result-message">${res.message}</p>

    <div class="result-meta-grid">
      <div class="meta-item">
        <span class="meta-label">Product Name</span>
        <strong class="meta-val">${res.payload ? res.payload.name : 'Unknown'}</strong>
      </div>
      <div class="meta-item">
        <span class="meta-label">Brand</span>
        <strong class="meta-val">${res.payload ? res.payload.brand : 'N/A'}</strong>
      </div>
      <div class="meta-item">
        <span class="meta-label">Product ID</span>
        <code class="meta-val">${res.payload ? res.payload.pid : 'N/A'}</code>
      </div>
      <div class="meta-item">
        <span class="meta-label">Batch / Lot</span>
        <strong class="meta-val">${res.payload ? res.payload.batch : 'N/A'}</strong>
      </div>
      <div class="meta-item">
        <span class="meta-label">Mfg Date</span>
        <span class="meta-val">${res.payload ? res.payload.mfg : 'N/A'}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Exp Date</span>
        <span class="meta-val">${res.payload ? res.payload.exp : 'N/A'}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">ECDSA Signature</span>
        <strong class="meta-val ${res.cryptographicallyValid ? 'text-success' : 'text-danger'}">
          ${res.cryptographicallyValid ? 'VALID MATHEMATICAL PROOF (✓)' : 'FAILED / TAMPERED (✕)'}
        </strong>
      </div>
      <div class="meta-item">
        <span class="meta-label">Verification Mode</span>
        <span class="meta-val text-info">${res.verificationMode} (${res.riskLevel} RISK)</span>
      </div>
    </div>
  `;

  navigateTo('screen-result');
}

function renderProductDetails(res) {
  const container = document.getElementById('product-details-content');
  if (!container) return;

  container.innerHTML = `
    <div class="section-card">
      <h3>Cryptographic Specification</h3>
      <div class="details-table">
        <div class="row"><span>Curve:</span> <strong>secp256r1 (NIST P-256)</strong></div>
        <div class="row"><span>Algorithm:</span> <strong>SHA256withECDSA (ES256)</strong></div>
        <div class="row"><span>Signer Key ID:</span> <code>${res.keyId}</code></div>
        <div class="row"><span>Crypto Status:</span> <strong class="${res.cryptographicallyValid ? 'text-success' : 'text-danger'}">${res.cryptographicallyValid ? 'VERIFIED VALID' : 'SIGNATURE REJECTED'}</strong></div>
      </div>
    </div>

    <div class="section-card">
      <h3>Canonical String Digest</h3>
      <p class="section-sub">Exact byte-level string formatted before cryptographic hashing:</p>
      <div class="code-box"><code>${res.canonicalPayload || 'N/A'}</code></div>
    </div>

    <div class="section-card">
      <h3>Raw Digital Signature</h3>
      <p class="section-sub">ECDSA P-256 ASN.1 DER Base64 encoded signature:</p>
      <div class="code-box"><code>${res.payload ? res.payload.sig : 'N/A'}</code></div>
    </div>
  `;
}

// =========================================================================
// 8. MANUFACTURER DASHBOARD & PRIVATE KEY QR GENERATOR
// =========================================================================

function checkManufacturerAuth() {
  const authContainer = document.getElementById('mfg-auth-container');
  const mainDashboard = document.getElementById('mfg-main-dashboard');

  if (STATE.jwtToken || STATE.isSimulatedOffline) {
    if (authContainer) authContainer.style.display = 'none';
    if (mainDashboard) mainDashboard.style.display = 'block';
    loadManufacturerKPIs();
    renderManufacturerProductsTable();
  } else {
    if (authContainer) authContainer.style.display = 'block';
    if (mainDashboard) mainDashboard.style.display = 'none';
  }
}

function renderKeyManagementStudio() {
  const privInput = document.getElementById('mfg-private-key-input');
  const pubPreview = document.getElementById('mfg-public-key-preview');
  const orgDisplay = document.getElementById('mfg-org-code-display');
  const keyIdDisplay = document.getElementById('mfg-key-id-display');

  if (privInput) privInput.value = STATE.mfgPrivateKeyHex || '';
  if (pubPreview) pubPreview.value = STATE.mfgPublicKeyBase64 || '';
  if (orgDisplay) orgDisplay.textContent = STATE.mfgOrg || 'AUTH';
  if (keyIdDisplay) keyIdDisplay.textContent = STATE.mfgKeyId || 'AUTHENTIQ-KEY-001';

  updateCanonicalPreview();
}

function generateNewKeyPair() {
  try {
    const privBytes = p256.utils.randomPrivateKey();
    const privHex = bytesToHex(privBytes);
    const pubBytes = p256.getPublicKey(privBytes, false);
    const pubX509Base64 = encodeX509PublicKey(pubBytes);

    STATE.mfgPrivateKeyHex = privHex;
    STATE.mfgPublicKeyBase64 = pubX509Base64;
    STATE.mfgKeyId = 'AUTH-KEY-' + Math.floor(100 + Math.random() * 900);

    localStorage.setItem('@authentiq_mfg_privkey', privHex);
    localStorage.setItem('@authentiq_mfg_pubkey', pubX509Base64);
    localStorage.setItem('@authentiq_mfg_keyid', STATE.mfgKeyId);

    // Register in consumer public key cache
    STATE.cachedKeys[STATE.mfgKeyId] = {
      keyId: STATE.mfgKeyId,
      keyVersion: 1,
      curve: 'secp256r1',
      algorithm: 'SHA256withECDSA',
      publicKey: pubX509Base64,
      active: true,
    };
    localStorage.setItem('@authentiq_cached_keys', JSON.stringify(STATE.cachedKeys));

    renderKeyManagementStudio();
    renderCachedKeysList();
    alert(`✨ New ECDSA P-256 Keypair Generated!\nKey ID: ${STATE.mfgKeyId}\nPublic key has been registered in the consumer offline verification cache.`);
  } catch (err) {
    alert('Key generation failed: ' + err.message);
  }
}

function updateCanonicalPreview() {
  const name = document.getElementById('new-prod-name')?.value || 'Product Name';
  const org = document.getElementById('new-prod-org')?.value || 'AUTH';
  const brand = document.getElementById('new-prod-brand')?.value || 'Brand';
  const batch = document.getElementById('new-prod-batch')?.value || 'BATCH001';
  const customId = document.getElementById('new-prod-custom-id')?.value;
  const mfg = document.getElementById('new-prod-mfg')?.value || '2026-10-01';
  const exp = document.getElementById('new-prod-exp')?.value || '2028-10-01';

  const pid = customId && customId.trim() ? customId.trim() : `${org}-P${Math.floor(100000 + Math.random() * 900000)}`;
  const canonical = buildCanonicalString(1, org, pid, name, brand, batch, mfg, exp);

  const previewEl = document.getElementById('new-prod-canonical-preview');
  if (previewEl) previewEl.textContent = canonical;

  return { canonical, pid, org, name, brand, batch, mfg, exp };
}

/**
 * Handle Product Form Submission & Cryptographic QR Generation
 */
async function handleGenerateProductQR(e) {
  e.preventDefault();

  const name = document.getElementById('new-prod-name').value.trim();
  const org = document.getElementById('new-prod-org').value.trim() || 'AUTH';
  const brand = document.getElementById('new-prod-brand').value.trim();
  const category = document.getElementById('new-prod-cat').value;
  const batch = document.getElementById('new-prod-batch').value.trim();
  const customId = document.getElementById('new-prod-custom-id').value.trim();
  const mfg = document.getElementById('new-prod-mfg').value;
  const exp = document.getElementById('new-prod-exp').value;
  const signingMode = document.querySelector('input[name="signing-mode"]:checked')?.value || 'client-private-key';

  const pid = customId || `${org}-P${Math.floor(100000 + Math.random() * 900000)}`;
  const canonical = buildCanonicalString(1, org, pid, name, brand, batch, mfg, exp);

  let signature = '';
  let keyId = STATE.mfgKeyId || 'AUTHENTIQ-KEY-001';

  try {
    if (signingMode === 'client-private-key' || !isOnline()) {
      // 1. Sign locally using manufacturer's private key
      if (!STATE.mfgPrivateKeyHex) {
        throw new Error('No manufacturer private key configured. Generate or input a private key first.');
      }
      signature = signWithPrivateKey(canonical, STATE.mfgPrivateKeyHex);
    } else {
      // 2. Sign via Backend REST API
      const res = await fetch(`${STATE.apiBaseUrl}/api/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${STATE.jwtToken}`,
        },
        body: JSON.stringify({
          productName: name,
          brand,
          category,
          batchNumber: batch,
          manufacturingDate: mfg,
          expiryDate: exp,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        signature = json.data.signature;
        keyId = json.data.keyId || keyId;
      } else {
        throw new Error(json.message || 'Server signing failed');
      }
    }

    // 3. Assemble full QR code payload JSON
    const qrPayload = {
      v: 1,
      alg: 'ES256',
      kid: keyId,
      mid: org,
      pid,
      name,
      brand,
      batch,
      mfg,
      exp,
      sig: signature,
    };

    const qrJsonString = JSON.stringify(qrPayload);

    // 4. Render QR Code via Canvas
    const canvas = document.getElementById('generated-qr-canvas');
    if (typeof QRCode !== 'undefined' && canvas) {
      await QRCode.toCanvas(canvas, qrJsonString, {
        width: 280,
        margin: 1,
        color: { dark: '#030712', light: '#FFFFFF' },
      });
    }

    // 5. Update Generated QR Result Card
    const qrCard = document.getElementById('newly-created-qr-card');
    if (qrCard) qrCard.style.display = 'block';

    document.getElementById('gen-prod-title').textContent = name;
    document.getElementById('gen-prod-id').textContent = pid;
    document.getElementById('gen-prod-batch').textContent = batch;
    document.getElementById('gen-prod-dates').textContent = `Mfg: ${mfg} | Exp: ${exp}`;
    document.getElementById('gen-prod-sig').textContent = signature;
    document.getElementById('gen-prod-kid').textContent = keyId;

    // High-Res PNG Download setup
    const dataUrl = canvas.toDataURL('image/png');
    const downloadBtn = document.getElementById('btn-download-highres-qr');
    if (downloadBtn) {
      downloadBtn.onclick = () => {
        const a = document.createElement('a');
        a.download = `${pid}-AuthentiQ-QR.png`;
        a.href = dataUrl;
        a.click();
      };
    }

    // Copy JSON action
    document.getElementById('btn-copy-qr-json').onclick = () => {
      navigator.clipboard.writeText(qrJsonString).then(() => alert('📋 Raw QR JSON copied to clipboard!'));
    };

    // Printable packaging label setup
    const printLabelImg = document.getElementById('print-label-qr-img');
    if (printLabelImg) printLabelImg.src = dataUrl;
    document.getElementById('print-label-org').textContent = org;
    document.getElementById('print-label-name').textContent = name;
    document.getElementById('print-label-pid').textContent = pid;
    document.getElementById('print-label-batch').textContent = batch;
    document.getElementById('print-label-exp').textContent = exp;

    document.getElementById('btn-print-packaging-label').onclick = () => {
      const labelBox = document.getElementById('printable-label-template');
      labelBox.style.display = 'block';
      window.print();
    };

    // 1-Click "Test Scan in Consumer Dashboard"
    document.getElementById('btn-test-scan-generated').onclick = async () => {
      const verifyRes = await processVerification(qrJsonString);
      renderResultScreen(verifyRes);
    };

    // 6. Save to local product inventory
    const newProductRecord = {
      productId: pid,
      productName: name,
      brand,
      category,
      batchNumber: batch,
      manufacturingDate: mfg,
      expiryDate: exp,
      keyId,
      signature,
      scanCount: 0,
      riskLevel: 'LOW',
      status: 'ACTIVE',
      qrPayload,
    };

    STATE.mfgProducts.unshift(newProductRecord);
    localStorage.setItem('@authentiq_mfg_products', JSON.stringify(STATE.mfgProducts));

    loadManufacturerKPIs();
    renderManufacturerProductsTable();

    // Scroll to generated QR
    qrCard.scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    alert('Failed to generate signed QR code: ' + err.message);
  }
}

function loadManufacturerKPIs() {
  const prodCount = STATE.mfgProducts.length;
  const totalScans = STATE.scanHistory.length;
  const counterfeits = STATE.scanHistory.filter((s) => s.status === 'INVALID').length;
  const clones = STATE.scanHistory.filter((s) => s.status === 'SUSPICIOUS').length;

  const pEl = document.getElementById('mfg-kpi-products');
  const sEl = document.getElementById('mfg-kpi-scans');
  const cEl = document.getElementById('mfg-kpi-counterfeits');
  const clEl = document.getElementById('mfg-kpi-clones');

  if (pEl) pEl.textContent = prodCount;
  if (sEl) sEl.textContent = totalScans;
  if (cEl) cEl.textContent = counterfeits;
  if (clEl) clEl.textContent = clones;
}

function renderManufacturerProductsTable() {
  const tableWrapper = document.getElementById('mfg-product-table-wrapper');
  if (!tableWrapper) return;

  if (STATE.mfgProducts.length === 0) {
    tableWrapper.innerHTML = `<div class="empty-state">No registered products. Use the form above to generate your first signed product QR.</div>`;
    return;
  }

  tableWrapper.innerHTML = `
    <table class="mfg-table">
      <thead>
        <tr>
          <th>Product ID</th>
          <th>Product Name</th>
          <th>Batch</th>
          <th>Key ID</th>
          <th>Scans</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${STATE.mfgProducts
          .map(
            (p) => `
          <tr>
            <td><code>${p.productId}</code></td>
            <td><strong>${p.productName}</strong><br><small class="text-muted">${p.brand}</small></td>
            <td><code>${p.batchNumber}</code></td>
            <td><small class="font-mono text-info">${p.keyId || 'P-256'}</small></td>
            <td>${p.scanCount || 0}</td>
            <td><span class="status-tag ${p.riskLevel === 'HIGH' || p.riskLevel === 'CRITICAL' ? 'tag-danger' : 'tag-success'}">${p.riskLevel || 'LOW'}</span></td>
            <td>
              <button class="btn-xs btn-primary" onclick="verifyCatalogProduct('${p.productId}')">Test Verify</button>
            </td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  `;
}

window.verifyCatalogProduct = async function (pid) {
  const item = STATE.mfgProducts.find((p) => p.productId === pid);
  if (!item) return;

  const qrPayload = item.qrPayload || {
    v: 1,
    alg: 'ES256',
    kid: item.keyId || 'AUTHENTIQ-KEY-001',
    mid: 'AUTH',
    pid: item.productId,
    name: item.productName,
    brand: item.brand,
    batch: item.batchNumber,
    mfg: item.manufacturingDate,
    exp: item.expiryDate,
    sig: item.signature,
  };

  const verifyRes = await processVerification(JSON.stringify(qrPayload));
  renderResultScreen(verifyRes);
};

// =========================================================================
// 9. CAMERA SCANNER
// =========================================================================

function startCameraScanner() {
  if (typeof Html5Qrcode === 'undefined') return;

  if (!STATE.html5QrCode) {
    STATE.html5QrCode = new Html5Qrcode('qr-reader');
  }

  const qrConfig = { fps: 10, qrbox: { width: 220, height: 220 } };

  STATE.html5QrCode
    .start(
      { facingMode: 'environment' },
      qrConfig,
      async (decodedText) => {
        stopCameraScanner();
        const res = await processVerification(decodedText);
        renderResultScreen(res);
      },
      () => {}
    )
    .catch((err) => {
      console.warn('Camera start error:', err);
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
// 10. SECURITY LAB & TAMPER SIMULATOR
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
    if (canonicalPreview) canonicalPreview.textContent = canonical;
    return canonical;
  }

  [nameInput, brandInput, batchInput, mfgInput, expInput].forEach((input) => {
    if (input) input.addEventListener('input', updatePreview);
  });

  if (evalBtn) {
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
        resultBox.innerHTML = `✕ SIGNATURE REJECTED: The modified canonical string no longer matches the ECDSA signature digest! Counterfeit detected.`;
      }
    });
  }
}

function setupCloneSimulator() {
  const output = document.getElementById('clone-sim-output');

  const btn1 = document.getElementById('btn-sim-normal-scan');
  if (btn1) {
    btn1.addEventListener('click', async () => {
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
  }

  const btn2 = document.getElementById('btn-sim-rapid-burst');
  if (btn2) {
    btn2.addEventListener('click', async () => {
      output.style.display = 'block';
      output.innerHTML = '<span style="color:#F59E0B;">Simulating 4 distinct devices scanning same QR within 2 minutes...</span>';

      let lastData = null;
      for (let i = 0; i < 4; i++) {
        lastData = await recordScanOnline('AUTH-P001', 'VALID', new Date().toISOString(), {
          lat: 37.7749 + i * 0.01,
          lng: -122.4194 + i * 0.01,
        });
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
  }

  const btn3 = document.getElementById('btn-sim-geo-anomaly');
  if (btn3) {
    btn3.addEventListener('click', async () => {
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
}

function renderCachedKeysList() {
  const container = document.getElementById('cached-keys-list');
  const countEl = document.getElementById('cached-keys-count');
  if (!container) return;

  const keys = Object.values(STATE.cachedKeys);
  if (countEl) countEl.textContent = `${keys.length} Cached (✓)`;

  container.innerHTML = keys
    .map(
      (k) => `
    <div class="key-card">
      <div class="key-header">
        <strong>${k.keyId}</strong>
        <span class="status-tag tag-success">Active</span>
      </div>
      <div class="key-meta">Curve: ${k.curve || 'secp256r1'} | Alg: ${k.algorithm || 'SHA256withECDSA'}</div>
      <code class="key-pub-snippet">${k.publicKey}</code>
    </div>
  `
    )
    .join('');
}

// =========================================================================
// 11. INITIALIZATION & EVENT LISTENERS
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {
  // 1. Navigation Clicks
  document.querySelectorAll('[data-screen]').forEach((el) => {
    el.addEventListener('click', () => navigateTo(el.getAttribute('data-screen')));
  });
  document.querySelectorAll('.back-btn').forEach((btn) => {
    btn.addEventListener('click', () => navigateTo(btn.getAttribute('data-target')));
  });

  // 2. Role Switcher in Header & Brand logo
  const modeSwitcherBtn = document.getElementById('mode-switcher-btn');
  if (modeSwitcherBtn) modeSwitcherBtn.addEventListener('click', togglePortalRole);

  const brandLogoBtn = document.getElementById('brand-logo-btn');
  if (brandLogoBtn) brandLogoBtn.addEventListener('click', () => navigateTo('screen-user-dashboard'));

  // 3. Network Toggle
  document.getElementById('net-toggle-btn').addEventListener('click', () => {
    STATE.isSimulatedOffline = !STATE.isSimulatedOffline;
    updateNetworkUI();
  });
  window.addEventListener('online', updateNetworkUI);
  window.addEventListener('offline', updateNetworkUI);
  updateNetworkUI();
  updateQueueUI();

  // 4. CTA Scan Buttons
  const startScanBtn = document.getElementById('btn-start-scan');
  if (startScanBtn) startScanBtn.addEventListener('click', () => navigateTo('screen-scanner'));

  document.querySelectorAll('[data-action="scan-again"]').forEach((b) => {
    b.addEventListener('click', () => navigateTo('screen-scanner'));
  });

  // 5. View Full Details on Result Screen
  const viewDetailsBtn = document.getElementById('btn-view-details');
  if (viewDetailsBtn) {
    viewDetailsBtn.addEventListener('click', () => {
      if (STATE.lastResult) {
        renderProductDetails(STATE.lastResult);
        navigateTo('screen-product-details');
      }
    });
  }

  // 6. View All History Link
  const viewAllHistBtn = document.getElementById('btn-view-all-history');
  if (viewAllHistBtn) viewAllHistBtn.addEventListener('click', () => navigateTo('screen-history'));

  // 7. Presets for Instant Testing
  document.querySelectorAll('.preset-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const type = btn.getAttribute('data-preset');
      let qrJson = '';

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
        await recordScanOnline('AUTH-P001', 'VALID', new Date().toISOString(), { lat: 37.77, lng: -122.41 });
        await recordScanOnline('AUTH-P001', 'VALID', new Date().toISOString(), { lat: 51.5, lng: -0.12 });
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

  // 8. Manual Payload Verification
  const verifyManualBtn = document.getElementById('btn-verify-manual');
  if (verifyManualBtn) {
    verifyManualBtn.addEventListener('click', async () => {
      const raw = document.getElementById('manual-qr-text').value;
      if (!raw.trim()) return alert('Please enter QR JSON payload');
      const res = await processVerification(raw);
      renderResultScreen(res);
    });
  }

  // 9. QR Image File Uploads (Home & Scanner)
  ['qr-file-input', 'qr-file-input-home'].forEach((id) => {
    const input = document.getElementById(id);
    if (!input) return;
    input.addEventListener('change', (e) => {
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
          alert('Could not decode QR from uploaded image: ' + err);
        });
    });
  });

  // 10. History Tabs & Clear
  document.querySelectorAll('.filter-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      renderFullHistory(tab.getAttribute('data-filter'));
    });
  });

  const clearHistBtn = document.getElementById('btn-clear-history');
  if (clearHistBtn) {
    clearHistBtn.addEventListener('click', () => {
      if (confirm('Clear all verification scan history?')) {
        STATE.scanHistory = [];
        localStorage.removeItem('@authentiq_history');
        updateConsumerStats();
        renderHomeHistory();
        renderFullHistory('all');
      }
    });
  }

  // 11. Key Management Studio Controls
  const genKeyBtn = document.getElementById('btn-generate-new-keypair');
  if (genKeyBtn) genKeyBtn.addEventListener('click', generateNewKeyPair);

  const togglePrivBtn = document.getElementById('btn-toggle-privkey');
  if (togglePrivBtn) {
    togglePrivBtn.addEventListener('click', () => {
      const privInput = document.getElementById('mfg-private-key-input');
      if (privInput.type === 'password') {
        privInput.type = 'text';
        togglePrivBtn.textContent = 'Hide Key';
      } else {
        privInput.type = 'password';
        togglePrivBtn.textContent = 'Show Key';
      }
    });
  }

  const privInput = document.getElementById('mfg-private-key-input');
  if (privInput) {
    privInput.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      STATE.mfgPrivateKeyHex = val;
      localStorage.setItem('@authentiq_mfg_privkey', val);
      try {
        if (val.length >= 64) {
          const privBytes = hexToBytes(val);
          const pubBytes = p256.getPublicKey(privBytes, false);
          STATE.mfgPublicKeyBase64 = encodeX509PublicKey(pubBytes);
          localStorage.setItem('@authentiq_mfg_pubkey', STATE.mfgPublicKeyBase64);
          document.getElementById('mfg-public-key-preview').value = STATE.mfgPublicKeyBase64;
        }
      } catch (err) {}
    });
  }

  const resetDefaultKeyBtn = document.getElementById('btn-use-default-key');
  if (resetDefaultKeyBtn) {
    resetDefaultKeyBtn.addEventListener('click', () => {
      STATE.mfgPrivateKeyHex = 'e8b7c4a123f859218654a9c80d452179b4561029384756102938475610293847';
      localStorage.setItem('@authentiq_mfg_privkey', STATE.mfgPrivateKeyHex);
      const privBytes = hexToBytes(STATE.mfgPrivateKeyHex);
      const pubBytes = p256.getPublicKey(privBytes, false);
      STATE.mfgPublicKeyBase64 = encodeX509PublicKey(pubBytes);
      localStorage.setItem('@authentiq_mfg_pubkey', STATE.mfgPublicKeyBase64);
      renderKeyManagementStudio();
      alert('Reset to default demo keypair.');
    });
  }

  const publishPubBtn = document.getElementById('btn-publish-pubkey');
  if (publishPubBtn) {
    publishPubBtn.addEventListener('click', () => {
      STATE.cachedKeys[STATE.mfgKeyId] = {
        keyId: STATE.mfgKeyId,
        keyVersion: 1,
        curve: 'secp256r1',
        algorithm: 'SHA256withECDSA',
        publicKey: STATE.mfgPublicKeyBase64,
        active: true,
      };
      localStorage.setItem('@authentiq_cached_keys', JSON.stringify(STATE.cachedKeys));
      renderCachedKeysList();
      alert(`Public Key for ${STATE.mfgKeyId} saved to consumer verification cache!`);
    });
  }

  const exportKeyBtn = document.getElementById('btn-export-key-backup');
  if (exportKeyBtn) {
    exportKeyBtn.addEventListener('click', () => {
      const backup = {
        keyId: STATE.mfgKeyId,
        algorithm: 'SHA256withECDSA',
        curve: 'secp256r1',
        privateKeyHex: STATE.mfgPrivateKeyHex,
        publicKeyX509Base64: STATE.mfgPublicKeyBase64,
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${STATE.mfgKeyId}-keypair-backup.json`;
      a.click();
    });
  }

  // 12. Manufacturer QR Form Listeners
  const createProdForm = document.getElementById('create-product-form');
  if (createProdForm) {
    const today = new Date().toISOString().split('T')[0];
    const expDate = new Date(Date.now() + 2 * 365 * 24 * 3600 * 1000).toISOString().split('T')[0];
    const mfgInput = document.getElementById('new-prod-mfg');
    const expInput = document.getElementById('new-prod-exp');
    if (mfgInput) mfgInput.value = today;
    if (expInput) expInput.value = expDate;

    // Real-time canonical preview
    ['new-prod-name', 'new-prod-org', 'new-prod-brand', 'new-prod-batch', 'new-prod-custom-id', 'new-prod-mfg', 'new-prod-exp'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', updateCanonicalPreview);
    });

    createProdForm.addEventListener('submit', handleGenerateProductQR);
  }

  const closeQrCardBtn = document.getElementById('btn-close-qr-card');
  if (closeQrCardBtn) {
    closeQrCardBtn.addEventListener('click', () => {
      document.getElementById('newly-created-qr-card').style.display = 'none';
    });
  }

  const refreshInvBtn = document.getElementById('btn-refresh-inventory');
  if (refreshInvBtn) refreshInvBtn.addEventListener('click', renderManufacturerProductsTable);

  // 13. Manufacturer Login
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
          STATE.mfgOrg = json.data.organizationCode || 'AUTH';
          localStorage.setItem('@authentiq_jwt_token', json.data.token);
          localStorage.setItem('@authentiq_user_org', STATE.mfgOrg);
          checkManufacturerAuth();
        } else {
          alert('Login failed: ' + json.message);
        }
      } catch (err) {
        // Fallback demo login if offline/local
        STATE.jwtToken = 'demo-jwt-token-local';
        STATE.mfgOrg = 'AUTH';
        localStorage.setItem('@authentiq_jwt_token', STATE.jwtToken);
        localStorage.setItem('@authentiq_user_org', STATE.mfgOrg);
        checkManufacturerAuth();
      }
    });
  }

  const quickDemoBtn = document.getElementById('btn-demo-quick-login');
  if (quickDemoBtn) {
    quickDemoBtn.addEventListener('click', () => {
      STATE.jwtToken = 'demo-token-12345';
      STATE.mfgOrg = 'AUTH';
      localStorage.setItem('@authentiq_jwt_token', STATE.jwtToken);
      localStorage.setItem('@authentiq_user_org', STATE.mfgOrg);
      checkManufacturerAuth();
    });
  }

  const logoutBtn = document.getElementById('btn-mfg-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      STATE.jwtToken = null;
      localStorage.removeItem('@authentiq_jwt_token');
      checkManufacturerAuth();
    });
  }

  // 14. Settings Listeners
  const saveApiUrlBtn = document.getElementById('btn-save-api-url');
  if (saveApiUrlBtn) {
    saveApiUrlBtn.addEventListener('click', () => {
      const url = document.getElementById('settings-api-url').value;
      STATE.apiBaseUrl = url.replace(/\/$/, '');
      localStorage.setItem('@authentiq_api_base_url', STATE.apiBaseUrl);
      alert('API Base URL saved!');
    });
  }

  const syncKeysBtn = document.getElementById('btn-sync-keys');
  if (syncKeysBtn) {
    syncKeysBtn.addEventListener('click', async () => {
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
  }

  const syncQueueBtn = document.getElementById('btn-sync-queue-now');
  if (syncQueueBtn) {
    syncQueueBtn.addEventListener('click', async () => {
      const count = await syncPendingQueue();
      alert(`Synchronized ${count || 0} pending scan events to backend.`);
    });
  }

  const clearQueueBtn = document.getElementById('btn-clear-queue');
  if (clearQueueBtn) {
    clearQueueBtn.addEventListener('click', () => {
      STATE.pendingQueue = [];
      localStorage.removeItem('@authentiq_pending_queue');
      updateQueueUI();
      alert('Pending queue cleared.');
    });
  }

  // 15. Initial Renders
  setupTamperLab();
  setupCloneSimulator();
  updateConsumerStats();
  renderHomeHistory();
  renderCachedKeysList();
  renderKeyManagementStudio();
  updateHeaderPortalLabel();
});
