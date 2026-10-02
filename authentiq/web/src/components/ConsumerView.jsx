import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, AlertTriangle, XCircle, CheckCircle2, Upload, History, Zap, Camera, CameraOff, Image as ImageIcon, X } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { verifyOfflineEcdsa, buildCanonicalString } from '../crypto';

export default function ConsumerView({ cachedKeys, scanHistory, onAddScanResult, lastResult, onSelectScanResult }) {
  const [qrInput, setQrInput] = useState('');
  const [presetActive, setPresetActive] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [scanMode, setScanMode] = useState('paste'); // 'paste' | 'image' | 'camera'
  const html5QrcodeRef = useRef(null);
  const fileInputRef = useRef(null);

  // Sample presets for demo
  const presets = {
    genuine: {
      title: 'Genuine Product (Valid Signature)',
      payload: {
        v: 1, alg: 'ES256', kid: 'AUTHENTIQ-KEY-001', mid: 'AUTH',
        pid: 'AUTH-P001', name: 'Acme Paracetamol 500mg', brand: 'Acme Pharma',
        batch: 'BATCH001', mfg: '2026-08-01', exp: '2028-08-01',
        sig: 'MEUCIQDV7Rz4qOWaxnEQBaOwPQMVYrwEREeBI02CSiXsgmT5vwIgcaOgCxlPDZQ1B3jEPd/3YdSTwFXpWtTN8cLSP+zTehA=',
      }
    },
    tampered: {
      title: 'Tampered Name (Signature Fails)',
      payload: {
        v: 1, alg: 'ES256', kid: 'AUTHENTIQ-KEY-001', mid: 'AUTH',
        pid: 'AUTH-P001', name: 'Acme Fake Tablet 500mg', brand: 'Acme Pharma',
        batch: 'BATCH001', mfg: '2026-08-01', exp: '2028-08-01',
        sig: 'MEUCIQDV7Rz4qOWaxnEQBaOwPQMVYrwEREeBI02CSiXsgmT5vwIgcaOgCxlPDZQ1B3jEPd/3YdSTwFXpWtTN8cLSP+zTehA=',
      }
    },
    clone: {
      title: 'Duplicate / Physical Clone Alert',
      payload: {
        v: 1, alg: 'ES256', kid: 'AUTHENTIQ-KEY-001', mid: 'AUTH',
        pid: 'AUTH-P001', name: 'Acme Paracetamol 500mg', brand: 'Acme Pharma',
        batch: 'BATCH001', mfg: '2026-08-01', exp: '2028-08-01',
        sig: 'MEUCIQDV7Rz4qOWaxnEQBaOwPQMVYrwEREeBI02CSiXsgmT5vwIgcaOgCxlPDZQ1B3jEPd/3YdSTwFXpWtTN8cLSP+zTehA=',
      },
      isClone: true
    }
  };

  // Stop camera on unmount or mode change
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = async () => {
    if (html5QrcodeRef.current) {
      try {
        await html5QrcodeRef.current.stop();
        html5QrcodeRef.current.clear();
      } catch (_) {}
      html5QrcodeRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    setCameraError('');
    try {
      const scanner = new Html5Qrcode('qr-camera-region');
      html5QrcodeRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          stopCamera();
          setScanMode('paste');
          executeVerification(decodedText);
        },
        () => {} // ignore scan errors
      );
      setCameraActive(true);
    } catch (err) {
      setCameraError('Camera access denied or not available. Please allow camera permission.');
      setCameraActive(false);
      html5QrcodeRef.current = null;
    }
  };

  const handleImageFileScan = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const scanner = new Html5Qrcode('qr-file-scan-region');
      const result = await scanner.scanFile(file, false);
      scanner.clear();
      executeVerification(result);
    } catch (err) {
      alert('Could not read QR code from image. Make sure the image is clear and contains a valid QR code.');
    }
    // Reset file input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const executeVerification = (rawString, forceClone = false) => {
    const timestamp = new Date().toISOString();
    let payload;

    try {
      payload = JSON.parse(rawString.trim());
      if (!payload.pid || !payload.sig || !payload.kid) {
        throw new Error('Missing essential fields (pid, sig, kid)');
      }
    } catch (e) {
      const res = {
        status: 'INVALID', cryptographicallyValid: false,
        message: 'Malformed QR code payload. Missing signature or product metadata.',
        payload: null, timestamp, riskLevel: 'CRITICAL', riskReason: 'Unparseable QR Format'
      };
      onAddScanResult(res);
      return;
    }

    let keyRecord = cachedKeys[payload.kid] || Object.values(cachedKeys)[0];
    const canonical = buildCanonicalString(
      payload.v || 1, payload.mid || 'AUTH', payload.pid,
      payload.name, payload.brand, payload.batch, payload.mfg, payload.exp
    );

    let isCryptoValid = false;
    if (keyRecord && keyRecord.publicKey) {
      isCryptoValid = verifyOfflineEcdsa(canonical, payload.sig, keyRecord.publicKey);
    }

    let status = 'INVALID';
    let riskLevel = 'CRITICAL';
    let riskReason = 'Digital Signature Verification Failed';

    if (isCryptoValid) {
      if (forceClone) {
        status = 'SUSPICIOUS'; riskLevel = 'HIGH';
        riskReason = 'Impossible Travel Velocity: 10,200 km/h detected between consecutive scans (Physical QR Clone Alert)';
      } else {
        status = 'GENUINE'; riskLevel = 'LOW';
        riskReason = 'Valid ECDSA P-256 Signature';
      }
    }

    const result = {
      status, cryptographicallyValid: isCryptoValid,
      payload, canonicalPayload: canonical,
      keyId: payload.kid, timestamp, riskLevel, riskReason,
    };

    onAddScanResult(result);
    setQrInput('');
    setPresetActive('');
  };

  const handleRunPreset = (key) => {
    setPresetActive(key);
    const p = presets[key];
    executeVerification(JSON.stringify(p.payload), p.isClone);
  };

  const handleManualVerify = (e) => {
    e.preventDefault();
    if (!qrInput.trim()) return;
    executeVerification(qrInput);
  };

  const tabStyle = (mode) => ({
    flex: 1,
    padding: '10px 14px',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '13px',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '7px',
    background: scanMode === mode
      ? 'linear-gradient(135deg, rgba(14,165,233,0.25), rgba(16,185,129,0.18))'
      : 'transparent',
    color: scanMode === mode ? '#FFF' : 'var(--text-muted)',
    border: scanMode === mode ? '1px solid rgba(14,165,233,0.4)' : '1px solid transparent',
  });

  return (
    <div>
      {/* Consumer Hero Banner */}
      <div className="hero-card">
        <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px auto' }}>
          <ShieldCheck size={28} />
        </div>
        <h1 className="hero-title">Verify Any Product Instantly</h1>
        <p className="hero-subtitle">
          100% offline mathematical verification using manufacturer ECDSA P-256 digital signatures with real-time clone detection.
        </p>

        {/* Demo Presets Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', maxWidth: '800px', margin: '0 auto' }}>
          <button
            onClick={() => handleRunPreset('genuine')}
            className={`btn-secondary ${presetActive === 'genuine' ? 'text-success' : ''}`}
            style={{ padding: '12px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '2px' }}
          >
            <strong style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} className="text-success" /> Genuine Product
            </strong>
            <small style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Valid Signature + Safe Location</small>
          </button>

          <button
            onClick={() => handleRunPreset('tampered')}
            className={`btn-secondary ${presetActive === 'tampered' ? 'text-danger' : ''}`}
            style={{ padding: '12px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '2px' }}
          >
            <strong style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <XCircle size={16} className="text-danger" /> Tampered Data
            </strong>
            <small style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Altered Name → Signature Fails</small>
          </button>

          <button
            onClick={() => handleRunPreset('clone')}
            className={`btn-secondary ${presetActive === 'clone' ? 'text-warning' : ''}`}
            style={{ padding: '12px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '2px' }}
          >
            <strong style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={16} className="text-warning" /> Duplicate / Clone
            </strong>
            <small style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Valid Signature + Rapid Distant Scans</small>
          </button>
        </div>
      </div>

      {/* Scan Input Card */}
      <div className="card">
        <div className="card-header">
          <h3>🔍 Scan or Input Product QR Code</h3>
        </div>

        {/* Mode Tabs */}
        <div style={{ display: 'flex', gap: '6px', background: 'rgba(8,13,26,0.6)', padding: '6px', borderRadius: '14px', marginBottom: '20px' }}>
          <button
            style={tabStyle('paste')}
            onClick={() => { setScanMode('paste'); stopCamera(); }}
          >
            <Zap size={15} /> Paste JSON
          </button>
          <button
            style={tabStyle('image')}
            onClick={() => { setScanMode('image'); stopCamera(); }}
          >
            <ImageIcon size={15} /> Upload QR Image
          </button>
          <button
            style={tabStyle('camera')}
            onClick={() => { setScanMode('camera'); }}
          >
            <Camera size={15} /> Camera Scan
          </button>
        </div>

        {/* ── Paste JSON Mode ── */}
        {scanMode === 'paste' && (
          <form onSubmit={handleManualVerify}>
            <div className="form-group">
              <label>Paste Raw QR Code JSON String:</label>
              <textarea
                className="input-field mono"
                rows={4}
                placeholder='{"v":1, "alg":"ES256", "kid":"...", "pid":"...", "sig":"..."}'
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary" style={{ width: '100%' }}>
              <Zap size={16} />
              <span>Verify Digital Signature &amp; Authenticity</span>
            </button>
          </form>
        )}

        {/* ── Image Upload Mode ── */}
        {scanMode === 'image' && (
          <div>
            {/* Hidden region required by html5-qrcode for file scanning */}
            <div id="qr-file-scan-region" style={{ display: 'none' }} />

            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed rgba(14,165,233,0.4)',
                borderRadius: '16px',
                padding: '40px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: 'rgba(14,165,233,0.04)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(14,165,233,0.8)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(14,165,233,0.4)'}
            >
              <ImageIcon size={48} style={{ color: '#0EA5E9', marginBottom: '12px' }} />
              <p style={{ fontSize: '16px', fontWeight: 700, color: '#FFF', marginBottom: '6px' }}>
                Upload QR Code Image
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Click to select a PNG, JPG, or screenshot containing a QR code
              </p>
              <div className="btn-primary" style={{ display: 'inline-flex', marginTop: '16px', padding: '10px 24px' }}>
                <Upload size={16} /> Choose Image File
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageFileScan}
              style={{ display: 'none' }}
            />

            <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '12px' }}>
              Supports PNG, JPG, WebP, BMP. The QR code must be clearly visible in the image.
            </p>
          </div>
        )}

        {/* ── Camera Scan Mode ── */}
        {scanMode === 'camera' && (
          <div>
            {cameraError && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '14px', marginBottom: '14px', color: '#EF4444', fontSize: '13px' }}>
                ⚠️ {cameraError}
              </div>
            )}

            <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', background: '#000', minHeight: '300px' }}>
              <div id="qr-camera-region" style={{ width: '100%' }} />

              {!cameraActive && !cameraError && (
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: '16px', background: 'rgba(8,13,26,0.95)',
                }}>
                  <Camera size={52} style={{ color: '#0EA5E9' }} />
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Camera not started</p>
                  <button onClick={startCamera} className="btn-primary" style={{ padding: '12px 28px' }}>
                    <Camera size={18} /> Start Camera Scan
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
              {!cameraActive ? (
                <button onClick={startCamera} className="btn-primary" style={{ flex: 1 }}>
                  <Camera size={16} /> Start Camera
                </button>
              ) : (
                <button onClick={stopCamera} className="btn-secondary" style={{ flex: 1, color: '#EF4444', borderColor: 'rgba(239,68,68,0.3)' }}>
                  <CameraOff size={16} /> Stop Camera
                </button>
              )}
            </div>

            {cameraActive && (
              <p style={{ fontSize: '12px', color: '#10B981', textAlign: 'center', marginTop: '10px', fontWeight: 600 }}>
                🟢 Camera active — point at a QR code to scan automatically
              </p>
            )}
          </div>
        )}
      </div>

      {/* Verification Result */}
      {lastResult && (
        <div className={`result-card ${lastResult.status.toLowerCase()}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
            {lastResult.status === 'GENUINE' ? (
              <CheckCircle2 size={36} className="text-success" />
            ) : lastResult.status === 'SUSPICIOUS' ? (
              <AlertTriangle size={36} className="text-warning" />
            ) : (
              <XCircle size={36} className="text-danger" />
            )}

            <div>
              <h3 style={{ fontSize: '22px', fontWeight: 800 }}>
                {lastResult.status === 'GENUINE'
                  ? 'VERIFIED GENUINE PRODUCT'
                  : lastResult.status === 'SUSPICIOUS'
                  ? 'PHYSICAL CLONE ALERT DETECTED'
                  : 'COUNTERFEIT / INVALID SIGNATURE'}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{lastResult.riskReason}</p>
            </div>
          </div>

          {lastResult.payload && (
            <div style={{ background: 'rgba(8, 13, 26, 0.7)', padding: '16px', borderRadius: '14px', fontSize: '13px', lineHeight: 1.6 }}>
              <div><strong>Product Name:</strong> <span style={{ color: '#FFF', fontWeight: 700 }}>{lastResult.payload.name}</span></div>
              <div><strong>Product ID:</strong> <code className="text-info font-mono">{lastResult.payload.pid}</code></div>
              <div><strong>Brand / Manufacturer:</strong> {lastResult.payload.brand} ({lastResult.payload.mid})</div>
              <div><strong>Batch Number:</strong> <code className="font-mono">{lastResult.payload.batch}</code></div>
              <div><strong>Mfg / Exp Dates:</strong> {lastResult.payload.mfg} | {lastResult.payload.exp}</div>
              <div style={{ marginTop: '8px' }}>
                <strong>Cryptographic Signature Check:</strong>{' '}
                <span className={lastResult.cryptographicallyValid ? 'text-success' : 'text-danger'} style={{ fontWeight: 700 }}>
                  {lastResult.cryptographicallyValid ? 'MATH VERIFIED (✓ ECDSA P-256 PASS)' : 'SIGNATURE MISMATCH (✕ FAIL)'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Scan History */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-header">
          <h3>📜 Recent Scan History</h3>
        </div>

        {scanHistory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
            No scan events recorded yet. Click a demo preset above or scan a QR code.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {scanHistory.map((s, idx) => (
              <div
                key={idx}
                onClick={() => onSelectScanResult(s)}
                style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid var(--border-color)',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
              >
                <div>
                  <strong style={{ color: '#FFF', fontSize: '14px' }}>{s.payload ? s.payload.name : 'Unknown QR'}</strong>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    PID: <code className="font-mono">{s.payload ? s.payload.pid : 'N/A'}</code> • {new Date(s.timestamp).toLocaleTimeString()}
                  </div>
                </div>
                <span className={`status-pill ${s.status === 'GENUINE' ? 'ready' : 'pending'}`}>
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
