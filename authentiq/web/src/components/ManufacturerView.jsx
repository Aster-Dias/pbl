import React, { useState } from 'react';
import { PlusCircle, ShieldCheck, Key, RefreshCw, Download, Zap, Eye, CheckCircle2, Image as ImageIcon } from 'lucide-react';

export default function ManufacturerView({ 
  mfgOrg, 
  mfgBrand, 
  mfgKeyId, 
  mfgPrivateKeyHex, 
  mfgPublicKeyBase64, 
  products, 
  onAddProduct, 
  onOpenCardSign, 
  onOpenQRView, 
  onGenerateKeyPair, 
  onTestVerify 
}) {
  // Product Creation Form State
  const [prodName, setProdName] = useState('');
  const [category, setCategory] = useState('Pharmaceuticals');
  const [batch, setBatch] = useState('');
  const [customId, setCustomId] = useState('');
  const [mfgDate, setMfgDate] = useState(new Date().toISOString().split('T')[0]);
  const [expDate, setExpDate] = useState(new Date(Date.now() + 2 * 365 * 24 * 3600 * 1000).toISOString().split('T')[0]);

  // Image Selection State
  const [selectedPresetIcon, setSelectedPresetIcon] = useState('💊');
  const [customImageData, setCustomImageData] = useState(null);

  const presets = [
    { icon: '💊', name: 'Pharma' },
    { icon: '⌚', name: 'Watch' },
    { icon: '🧴', name: 'Fragrance' },
    { icon: '📱', name: 'Tech' },
    { icon: '🍏', name: 'Food' },
    { icon: '⚙️', name: 'Auto' },
  ];

  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCustomImageData(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleCreateProductSubmit = (e) => {
    e.preventDefault();
    if (!prodName.trim() || !batch.trim()) {
      alert('Please fill out Product Name and Batch Number.');
      return;
    }

    const pid = customId.trim() || `${mfgOrg || 'AUTH'}-P${Math.floor(100000 + Math.random() * 900000)}`;

    const newProd = {
      productId: pid,
      productName: prodName.trim(),
      brand: mfgBrand || 'Acme Pharma',
      org: mfgOrg || 'AUTH',
      category,
      batchNumber: batch.trim(),
      manufacturingDate: mfgDate,
      expiryDate: expDate,
      productIcon: selectedPresetIcon,
      productImage: customImageData,
      qrStatus: 'PENDING',
      signature: '',
      keyId: mfgKeyId || 'AUTHENTIQ-KEY-001',
    };

    onAddProduct(newProd);

    // Reset Form
    setProdName('');
    setBatch('');
    setCustomId('');
  };

  const registeredCount = products.length;
  const qrReadyCount = products.filter((p) => !!p.signature).length;

  return (
    <div>
      {/* Enterprise KPI Banner */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Registered Products</span>
          <div className="kpi-val">{registeredCount}</div>
          <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 600 }}>Brand Catalog</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">QR Codes Generated</span>
          <div className="kpi-val text-success">{qrReadyCount}</div>
          <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 600 }}>ECDSA P-256 Signed</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Consumer Scans</span>
          <div className="kpi-val text-info">28</div>
          <span style={{ fontSize: '11px', color: '#0EA5E9', fontWeight: 600 }}>Authenticity Verified</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Counterfeit Alerts</span>
          <div className="kpi-val text-danger">0</div>
          <span style={{ fontSize: '11px', color: '#EF4444', fontWeight: 600 }}>Zero Compromise</span>
        </div>
      </div>

      {/* Product Creation Form Card */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3>📦 Register New Product</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Enter product specs and upload/select visual product thumbnail:</p>
          </div>
          <span className="btn-accent btn-xs">
            <PlusCircle size={14} /> Product Registration
          </span>
        </div>

        <form onSubmit={handleCreateProductSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Product Name *</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="e.g. Amoxicillin 500mg" 
                value={prodName} 
                onChange={(e) => setProdName(e.target.value)} 
                required 
              />
            </div>

            <div className="form-group">
              <label>Organization Code</label>
              <input type="text" className="input-field mono" value={mfgOrg || 'AUTH'} readOnly />
            </div>

            <div className="form-group">
              <label>Brand Name</label>
              <input type="text" className="input-field" value={mfgBrand || 'Acme Pharma'} readOnly />
            </div>

            <div className="form-group">
              <label>Category</label>
              <select className="input-field" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="Pharmaceuticals">Pharmaceuticals</option>
                <option value="Electronics & Hardware">Electronics &amp; Hardware</option>
                <option value="Luxury & Fashion">Luxury &amp; Fashion</option>
                <option value="Food & Beverages">Food &amp; Beverages</option>
                <option value="Automotive Parts">Automotive Parts</option>
                <option value="General Goods">General Goods</option>
              </select>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Batch / Lot Number *</label>
              <input 
                type="text" 
                className="input-field mono" 
                placeholder="e.g. LOT-2026-X9" 
                value={batch} 
                onChange={(e) => setBatch(e.target.value)} 
                required 
              />
            </div>

            <div className="form-group">
              <label>Custom Product ID (Optional)</label>
              <input 
                type="text" 
                className="input-field mono" 
                placeholder="Leave blank for auto ID" 
                value={customId} 
                onChange={(e) => setCustomId(e.target.value)} 
              />
            </div>

            <div className="form-group">
              <label>Manufacturing Date *</label>
              <input 
                type="date" 
                className="input-field" 
                value={mfgDate} 
                onChange={(e) => setMfgDate(e.target.value)} 
                required 
              />
            </div>

            <div className="form-group">
              <label>Expiry Date *</label>
              <input 
                type="date" 
                className="input-field" 
                value={expDate} 
                onChange={(e) => setExpDate(e.target.value)} 
                required 
              />
            </div>
          </div>

          {/* Product Image Visual Selection */}
          <div className="form-group" style={{ marginTop: '10px' }}>
            <label>Product Image Visual *</label>
            <div className="image-preset-grid">
              {presets.map((p) => (
                <div 
                  key={p.name}
                  className={`preset-img-btn ${!customImageData && selectedPresetIcon === p.icon ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedPresetIcon(p.icon);
                    setCustomImageData(null);
                  }}
                >
                  <span className="preset-icon">{p.icon}</span>
                  <span className="preset-name">{p.name}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '12px' }}>
              <div style={{ width: '54px', height: '54px', borderRadius: '12px', background: '#0F172A', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {customImageData ? (
                  <img src={customImageData} alt="Custom" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '26px' }}>{selectedPresetIcon}</span>
                )}
              </div>

              <div>
                <label htmlFor="custom-prod-img-upload" className="btn-secondary btn-xs" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <ImageIcon size={14} />
                  <span>Upload Custom Product Image File</span>
                </label>
                <input 
                  type="file" 
                  id="custom-prod-img-upload" 
                  accept="image/*" 
                  onChange={handleImageFileChange} 
                  style={{ display: 'none' }} 
                />
                <small style={{ display: 'block', color: 'var(--text-muted)', fontSize: '11px', marginTop: '4px' }}>
                  Choose an icon preset above or upload a custom image file.
                </small>
              </div>
            </div>
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '14px', padding: '14px' }}>
            <PlusCircle size={18} />
            <span>Create &amp; Add Product to Catalog</span>
          </button>
        </form>
      </div>

      {/* Visual Product Catalog Grid */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3>📋 Registered Product Catalog</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Visual Product Cards with Card-Level Digital Signature &amp; QR Code Generation:</p>
          </div>
        </div>

        {products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
            No products registered yet. Use the form above to register your first product.
          </div>
        ) : (
          <div className="product-grid">
            {products.map((p) => {
              const isSigned = !!p.signature;
              return (
                <div key={p.productId} className="product-card">
                  <div className="product-banner">
                    {p.productImage ? (
                      <img src={p.productImage} alt={p.productName} />
                    ) : (
                      <span className="banner-icon">{p.productIcon || '💊'}</span>
                    )}
                    <span className={`status-pill ${isSigned ? 'ready' : 'pending'}`}>
                      {isSigned ? '✓ QR Ready' : '⚡ QR Pending'}
                    </span>
                  </div>

                  <div className="product-info">
                    <div>
                      <h4 className="product-title">{p.productName}</h4>
                      <div className="product-brand">{p.brand || mfgBrand} • <code className="text-info font-mono">{p.productId}</code></div>
                      <div className="product-meta">
                        <strong>Batch:</strong> {p.batchNumber}<br />
                        <strong>Mfg:</strong> {p.manufacturingDate} | <strong>Exp:</strong> {p.expiryDate}<br />
                        <strong>Category:</strong> {p.category || 'Pharmaceuticals'}
                      </div>
                    </div>

                    <div className="product-actions">
                      {isSigned ? (
                        <button onClick={() => onOpenQRView(p)} className="btn-accent btn-xs" style={{ flex: 1 }}>
                          <Eye size={14} />
                          <span>View / Download QR</span>
                        </button>
                      ) : (
                        <button onClick={() => onOpenCardSign(p)} className="btn-primary btn-xs" style={{ flex: 1 }}>
                          <Zap size={14} />
                          <span>Sign &amp; Generate QR</span>
                        </button>
                      )}

                      <button onClick={() => onTestVerify(JSON.stringify(p.qrPayload || {}))} className="btn-secondary btn-xs">
                        Test Verify
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Key Management Studio */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3>🔑 Manufacturer Cryptographic Key Vault</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Manage your ECDSA P-256 (secp256r1) signing keypair:</p>
          </div>
          <button onClick={onGenerateKeyPair} className="btn-secondary btn-xs">
            <RefreshCw size={14} />
            <span>Generate New Keypair</span>
          </button>
        </div>

        <div className="form-group">
          <label>Manufacturer Private Key (Hex):</label>
          <input type="password" className="input-field mono" value={mfgPrivateKeyHex || ''} readOnly />
          <small style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Kept secure in local environment. Used for signing digital signatures.</small>
        </div>

        <div className="form-group">
          <label>Public Key (Published for Consumer Verification):</label>
          <textarea className="input-field mono" rows={2} value={mfgPublicKeyBase64 || ''} readOnly style={{ fontSize: '11px', color: '#10B981' }} />
        </div>
      </div>
    </div>
  );
}
