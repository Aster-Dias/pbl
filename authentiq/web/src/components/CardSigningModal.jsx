import React, { useState, useEffect } from 'react';
import { Key, ShieldCheck, X, Zap } from 'lucide-react';
import { p256, signWithPrivateKey, buildCanonicalString, hexToBytes, encodeX509PublicKey } from '../crypto';

export default function CardSigningModal({ isOpen, onClose, product, mfgOrg, mfgBrand, mfgKeyId, defaultPrivKey, onProductSigned }) {
  const [privKey, setPrivKey] = useState(defaultPrivKey || '');
  const [pubKeyPreview, setPubKeyPreview] = useState('');

  useEffect(() => {
    if (privKey) {
      try {
        const privBytes = hexToBytes(privKey);
        const pubBytes = p256.getPublicKey(privBytes, false);
        setPubKeyPreview(encodeX509PublicKey(pubBytes));
      } catch (e) {
        setPubKeyPreview('Invalid Private Key Hex format');
      }
    }
  }, [privKey]);

  if (!isOpen || !product) return null;

  const handleSign = (e) => {
    e.preventDefault();
    if (!privKey || privKey.length < 64) {
      alert('Please enter a valid 32-byte Hex Private Key (64 hex characters).');
      return;
    }

    try {
      const canonical = buildCanonicalString(
        1,
        product.org || mfgOrg || 'AUTH',
        product.productId,
        product.productName,
        product.brand || mfgBrand || 'Acme Pharma',
        product.batchNumber,
        product.manufacturingDate,
        product.expiryDate
      );

      const signature = signWithPrivateKey(canonical, privKey);

      // Derive matching public key
      const privBytes = hexToBytes(privKey);
      const pubBytes = p256.getPublicKey(privBytes, false);
      const publicKeyBase64 = encodeX509PublicKey(pubBytes);

      const qrPayload = {
        v: 1,
        alg: 'ES256',
        kid: mfgKeyId || 'AUTHENTIQ-KEY-001',
        mid: product.org || mfgOrg || 'AUTH',
        pid: product.productId,
        name: product.productName,
        brand: product.brand || mfgBrand || 'Acme Pharma',
        batch: product.batchNumber,
        mfg: product.manufacturingDate,
        exp: product.expiryDate,
        sig: signature,
      };

      onProductSigned({
        ...product,
        signature,
        publicKeyBase64,
        qrPayload,
        keyId: mfgKeyId || 'AUTHENTIQ-KEY-001',
        qrStatus: 'GENERATED',
      });

      onClose();
    } catch (err) {
      alert('Signing error: ' + err.message);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', background: 'rgba(16, 185, 129, 0.2)', borderRadius: '10px', color: '#10B981' }}>
              <Zap size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFF' }}>Sign Product & Generate QR</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Cryptographic ECDSA P-256 Digital Signature</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Product Details Overview */}
        <div style={{ background: 'rgba(8, 13, 26, 0.7)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '14px', marginBottom: '16px', fontSize: '13px', lineHeight: 1.6 }}>
          <div><strong>Product ID:</strong> <code className="text-info font-mono">{product.productId}</code></div>
          <div><strong>Product Name:</strong> <span style={{ color: '#FFF', fontWeight: 700 }}>{product.productName}</span></div>
          <div><strong>Brand / Org:</strong> {product.brand || mfgBrand} ({product.org || mfgOrg})</div>
          <div><strong>Batch Number:</strong> <code className="font-mono">{product.batchNumber}</code></div>
        </div>

        <form onSubmit={handleSign}>
          <div className="form-group">
            <label>Manufacturer Private Key (Hex):</label>
            <input 
              type="password"
              className="input-field mono" 
              value={privKey} 
              onChange={(e) => setPrivKey(e.target.value.trim())} 
              placeholder="Enter 32-byte Hex Private Key..." 
              required 
            />
            <small style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Used to sign payload with ECDSA P-256 secp256r1 curve.</small>
          </div>

          <div className="form-group">
            <label>Derived Public Key (Published for Verification):</label>
            <textarea 
              className="input-field mono" 
              rows={2} 
              value={pubKeyPreview} 
              readOnly 
              style={{ fontSize: '11px', color: '#10B981' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button type="submit" className="btn-accent" style={{ flex: 1 }}>
              <ShieldCheck size={18} />
              <span>Confirm & Generate Signed QR</span>
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
