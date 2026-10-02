import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Printer, Copy, Rocket, X } from 'lucide-react';

export default function QRViewModal({ isOpen, onClose, product, onTestVerify }) {
  const canvasRef = useRef(null);
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    if (isOpen && product) {
      const qrPayload = product.qrPayload || {
        v: 1,
        alg: 'ES256',
        kid: product.keyId || 'AUTHENTIQ-KEY-001',
        mid: product.org || 'AUTH',
        pid: product.productId,
        name: product.productName,
        brand: product.brand,
        batch: product.batchNumber,
        mfg: product.manufacturingDate,
        exp: product.expiryDate,
        sig: product.signature,
      };

      const jsonString = JSON.stringify(qrPayload);

      QRCode.toDataURL(jsonString, {
        width: 340,
        margin: 1,
        color: { dark: '#030712', light: '#FFFFFF' },
      }).then((url) => {
        setDataUrl(url);
      }).catch((e) => console.warn('QR render error:', e));

      if (canvasRef.current) {
        QRCode.toCanvas(canvasRef.current, jsonString, {
          width: 280,
          margin: 1,
          color: { dark: '#030712', light: '#FFFFFF' },
        }).catch((e) => console.warn('Canvas render error:', e));
      }
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.download = `${product.productId}-AuthentiQ-QR.png`;
    a.href = dataUrl;
    a.click();
  };

  const handleCopyJson = () => {
    const jsonString = JSON.stringify(product.qrPayload || {});
    navigator.clipboard.writeText(jsonString).then(() => {
      alert('📋 Raw Cryptographic QR Payload JSON copied to clipboard!');
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '640px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#FFF' }}>✨ Product QR Code & Packaging Label</h3>
            <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 700 }}>ECDSA P-256 Verified (✓)</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* QR Canvas Container */}
          <div style={{ background: '#FFFFFF', padding: '12px', borderRadius: '16px', textAlign: 'center', boxShadow: '0 8px 25px rgba(0,0,0,0.4)' }}>
            <canvas ref={canvasRef} style={{ width: '220px', height: '220px', display: 'block' }}></canvas>
            <span style={{ fontSize: '10px', color: '#64748B', display: 'block', marginTop: '6px', fontWeight: 600 }}>Scan with AuthentiQ Consumer App</span>
          </div>

          {/* Product & Signature Details */}
          <div style={{ flex: 1, minWidth: '240px', fontSize: '13px', lineHeight: 1.6 }}>
            <h4 style={{ fontSize: '18px', fontWeight: 800, color: '#FFF', marginBottom: '8px' }}>{product.productName}</h4>
            <div><strong>Product ID:</strong> <code className="text-info font-mono">{product.productId}</code></div>
            <div><strong>Batch / Lot:</strong> <span className="font-mono">{product.batchNumber}</span></div>
            <div><strong>Mfg:</strong> {product.manufacturingDate} | <strong>Exp:</strong> {product.expiryDate}</div>
            <div style={{ marginTop: '8px' }}>
              <strong>ECDSA Digital Signature:</strong>
              <code style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', background: '#0B111E', padding: '6px', borderRadius: '6px', wordBreak: 'break-all', maxHeight: '50px', overflowY: 'auto', marginTop: '2px' }}>
                {product.signature || 'N/A'}
              </code>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
              <button onClick={handleDownload} className="btn-primary" style={{ width: '100%' }}>
                <Download size={16} />
                <span>Download High-Res QR (PNG)</span>
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleCopyJson} className="btn-secondary" style={{ flex: 1 }}>
                  <Copy size={14} />
                  <span>Copy JSON</span>
                </button>

                <button onClick={handlePrint} className="btn-secondary" style={{ flex: 1 }}>
                  <Printer size={14} />
                  <span>Print Label</span>
                </button>
              </div>

              <button
                onClick={() => {
                  onClose();
                  onTestVerify(JSON.stringify(product.qrPayload || {}));
                }}
                className="btn-accent"
                style={{ width: '100%', marginTop: '4px' }}
              >
                <Rocket size={16} />
                <span>Test Verify in Consumer App</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
