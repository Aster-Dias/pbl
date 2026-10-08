import React, { useState, useEffect } from 'react';
import { X, Layers, Printer, Download, CheckCircle2, Zap, PackageCheck, Image as ImageIcon, Sparkles, RefreshCw, ChevronDown } from 'lucide-react';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import { p256, signWithPrivateKey, buildCanonicalString, hexToBytes, encodeX509PublicKey } from '../crypto';

export default function BulkGenerationModal({
  isOpen,
  onClose,
  mfgOrg,
  mfgBrand,
  mfgKeyId,
  mfgPrivateKeyHex,
  mfgPublicKeyBase64,
  products = [],
  initialProduct = null,
  onAddBulkProducts,
}) {
  const [selectedProdId, setSelectedProdId] = useState('');
  const [prodName, setProdName] = useState('');
  const [category, setCategory] = useState('Electronics & Hardware');
  const [batch, setBatch] = useState('PT-2026-X100');
  const [quantity, setQuantity] = useState(100);
  const [idPrefix, setIdPrefix] = useState('AUTH-WATCH-');
  const [mfgDate, setMfgDate] = useState(new Date().toISOString().split('T')[0]);
  const [expDate, setExpDate] = useState(new Date(Date.now() + 3 * 365 * 24 * 3600 * 1000).toISOString().split('T')[0]);
  const [privKey, setPrivKey] = useState(mfgPrivateKeyHex || '');
  const [selectedPresetIcon, setSelectedPresetIcon] = useState('⌚');
  const [customImageData, setCustomImageData] = useState(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [generatedBatchResult, setGeneratedBatchResult] = useState(null);

  // Deduplicate products list for dropdown selection
  const catalogTemplates = React.useMemo(() => {
    const map = new Map();
    products.forEach((p) => {
      const key = (p.productName || '').trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, p);
      }
    });
    return Array.from(map.values());
  }, [products]);

  // Load selected product template into form
  const applyProductTemplate = (p) => {
    if (!p) return;
    setProdName(p.productName || '');
    setCategory(p.category || 'Pharmaceuticals');
    setSelectedPresetIcon(p.productIcon || '⌚');
    setCustomImageData(p.productImage || null);
    if (p.expiryDate) setExpDate(p.expiryDate);
    
    // Auto prefix derived from product ID
    const baseId = p.productId ? p.productId.replace(/-\d+$/, '') : 'AUTH-PROD';
    setIdPrefix(`${baseId}-`);
    setBatch(`${p.batchNumber || 'BATCH'}-B100`);
  };

  useEffect(() => {
    if (isOpen) {
      if (initialProduct) {
        setSelectedProdId(initialProduct.productId);
        applyProductTemplate(initialProduct);
      } else if (catalogTemplates.length > 0) {
        setSelectedProdId(catalogTemplates[0].productId);
        applyProductTemplate(catalogTemplates[0]);
      } else {
        setProdName('UltraFit Pro Smartwatch');
        setIdPrefix('AUTH-WATCH-');
        setBatch('PT-2026-X100');
      }
    }
  }, [isOpen, initialProduct, catalogTemplates]);

  useEffect(() => {
    if (mfgPrivateKeyHex && !privKey) {
      setPrivKey(mfgPrivateKeyHex);
    }
  }, [mfgPrivateKeyHex]);

  if (!isOpen) return null;

  const handleDropdownChange = (e) => {
    const val = e.target.value;
    setSelectedProdId(val);

    if (val === 'CUSTOM') {
      setProdName('');
      setIdPrefix('AUTH-UNIT-');
      setBatch(`BATCH-${new Date().getFullYear()}-01`);
    } else {
      const found = products.find((p) => p.productId === val) || catalogTemplates.find((p) => p.productId === val);
      if (found) {
        applyProductTemplate(found);
      }
    }
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCustomImageData(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const generatePDFSheet = async (items, batchNo, productName, brandName, orgCode) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const total = items.length;
    const labelsPerPage = 12; // 3 cols x 4 rows
    const totalPages = Math.ceil(total / labelsPerPage);

    for (let i = 0; i < total; i++) {
      const item = items[i];
      const pageIndex = Math.floor(i / labelsPerPage);
      const itemOnPage = i % labelsPerPage;

      if (itemOnPage === 0 && i > 0) {
        doc.addPage();
      }

      // Draw top header banner on each new page
      if (itemOnPage === 0) {
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, 210, 18, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('AUTHENTIQ ECDSA P-256 PRODUCT VERIFICATION LABELS', 12, 8);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `${brandName || 'PulseTech'} (${orgCode || 'AUTH'})  |  ${productName}  |  Batch: ${batchNo}  |  Page ${pageIndex + 1} of ${totalPages}`,
          12,
          14
        );
      }

      const col = itemOnPage % 3;
      const row = Math.floor(itemOnPage / 3);

      const x = 12 + col * (58 + 6);
      const y = 24 + row * (60 + 6);

      // Label background card
      doc.setDrawColor(203, 213, 225);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(x, y, 58, 60, 2, 2, 'FD');

      // Top cyan accent bar
      doc.setFillColor(14, 165, 233);
      doc.rect(x, y, 58, 2, 'F');

      // Product Name
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      const truncatedName = productName.length > 26 ? productName.substring(0, 24) + '...' : productName;
      doc.text(truncatedName, x + 29, y + 6, { align: 'center' });

      // Product ID / Serial Number
      doc.setTextColor(14, 165, 233);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text(item.productId, x + 29, y + 10, { align: 'center' });

      // QR Code Image
      if (item.qrDataUrl) {
        doc.addImage(item.qrDataUrl, 'PNG', x + 13, y + 12, 32, 32);
      }

      // Batch & Expiry
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`Batch: ${batchNo}  |  Exp: ${item.expiryDate}`, x + 29, y + 48, { align: 'center' });

      // ECDSA Verified Badge
      doc.setTextColor(16, 185, 129);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.text('✓ ECDSA P-256 Verified', x + 29, y + 54, { align: 'center' });
    }

    const pdfFileName = `${productName.replace(/[^a-zA-Z0-9]/g, '_')}_${total}_QRs_${batchNo}.pdf`;
    doc.save(pdfFileName);
    return doc;
  };

  const handleStartBulkGeneration = async (e) => {
    e.preventDefault();

    const count = parseInt(quantity, 10);
    if (!count || count < 1 || count > 500) {
      alert('Please enter a valid quantity between 1 and 500.');
      return;
    }

    if (!prodName.trim() || !batch.trim()) {
      alert('Please enter Product Name and Batch Number.');
      return;
    }

    if (!privKey || privKey.length < 64) {
      alert('Please enter a valid 32-byte Manufacturer Private Key Hex.');
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setProgressText('Initializing cryptographic keys...');

    try {
      const privBytes = hexToBytes(privKey);
      const pubBytes = p256.getPublicKey(privBytes, false);
      const publicKeyBase64 = encodeX509PublicKey(pubBytes);
      const keyId = mfgKeyId || 'AUTHENTIQ-KEY-001';

      const prefix = idPrefix.trim() || 'AUTH-PROD-';
      const newProducts = [];
      const pdfItems = [];

      const digits = count > 99 ? 3 : 2;

      for (let i = 1; i <= count; i++) {
        const serialStr = String(i).padStart(digits, '0');
        const productId = `${prefix}${serialStr}`;

        const canonical = buildCanonicalString(
          1,
          mfgOrg || 'AUTH',
          productId,
          prodName.trim(),
          mfgBrand || 'Acme Pharma',
          batch.trim(),
          mfgDate,
          expDate
        );

        const signature = signWithPrivateKey(canonical, privKey);

        const qrPayload = {
          v: 1,
          alg: 'ES256',
          kid: keyId,
          mid: mfgOrg || 'AUTH',
          pid: productId,
          name: prodName.trim(),
          brand: mfgBrand || 'Acme Pharma',
          batch: batch.trim(),
          mfg: mfgDate,
          exp: expDate,
          sig: signature,
        };

        const jsonString = JSON.stringify(qrPayload);
        const qrDataUrl = await QRCode.toDataURL(jsonString, {
          width: 300,
          margin: 1,
          color: { dark: '#030712', light: '#FFFFFF' },
        });

        const prodItem = {
          productId,
          productName: prodName.trim(),
          brand: mfgBrand || 'Acme Pharma',
          org: mfgOrg || 'AUTH',
          category,
          batchNumber: batch.trim(),
          manufacturingDate: mfgDate,
          expiryDate: expDate,
          productIcon: selectedPresetIcon,
          productImage: customImageData,
          qrStatus: 'GENERATED',
          signature,
          keyId,
          qrPayload,
          publicKeyBase64,
          qrDataUrl,
        };

        newProducts.push(prodItem);
        pdfItems.push(prodItem);

        if (i % 5 === 0 || i === count) {
          const p = Math.round((i / count) * 80);
          setProgress(p);
          setProgressText(`Generating & Cryptographically Signing QR Code ${i} of ${count}...`);
          await new Promise((resolve) => setTimeout(resolve, 5));
        }
      }

      setProgressText('Compiling Printable A4 PDF Label Sheet...');
      setProgress(90);

      onAddBulkProducts(newProducts);

      await generatePDFSheet(pdfItems, batch.trim(), prodName.trim(), mfgBrand || 'Acme Pharma', mfgOrg || 'AUTH');

      setProgress(100);
      setProgressText('Done!');

      setGeneratedBatchResult({
        count,
        productName: prodName.trim(),
        batch: batch.trim(),
        pdfItems,
      });

      setIsGenerating(false);
    } catch (err) {
      alert('Error during bulk generation: ' + err.message);
      setIsGenerating(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', background: 'linear-gradient(135deg, rgba(14,165,233,0.25), rgba(16,185,129,0.2))', borderRadius: '12px', color: '#0EA5E9' }}>
              <PackageCheck size={26} />
            </div>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#FFF' }}>⚡ Bulk Batch QR Generator &amp; PDF Sheet</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Select a registered product model from your catalog, enter quantity needed, and generate printable ECDSA signed QR codes.
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {!generatedBatchResult ? (
          <form onSubmit={handleStartBulkGeneration}>
            {/* Step 1: Select Registered Product from Catalog Dropdown */}
            <div style={{ background: 'rgba(8, 13, 26, 0.7)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '16px', marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#FFF', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Sparkles size={16} className="text-info" /> Step 1: Select Registered Product Model from Catalog *
              </label>

              <select
                className="input-field"
                value={selectedProdId}
                onChange={handleDropdownChange}
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  background: 'rgba(15, 23, 42, 0.95)',
                  borderColor: '#0EA5E9',
                  color: '#FFF',
                  padding: '12px',
                }}
              >
                <option value="">-- Choose a Registered Product Model --</option>
                {catalogTemplates.map((p) => (
                  <option key={p.productId} value={p.productId}>
                    {p.productIcon || '📦'} {p.productName} ({p.brand || mfgBrand}) — [{p.productId}]
                  </option>
                ))}
                <option value="CUSTOM">+ Register / Enter New Product Model</option>
              </select>

              {selectedProdId && selectedProdId !== 'CUSTOM' && (
                <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(14,165,233,0.1)', borderRadius: '10px', fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span style={{ fontSize: '24px' }}>{selectedPresetIcon}</span>
                  <div>
                    <strong style={{ color: '#FFF' }}>{prodName}</strong> — Category: <span className="text-info">{category}</span><br />
                    <span>Auto ID Prefix: <code className="font-mono text-success">{idPrefix}</code></span>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Quantity Selector */}
            <div style={{ background: 'rgba(8, 13, 26, 0.7)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '16px', marginBottom: '18px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#FFF', display: 'block', marginBottom: '10px' }}>
                Step 2: How many items (QR codes) do you need for this batch?
              </label>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
                {[10, 25, 50, 100, 200, 500].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setQuantity(num)}
                    style={{
                      flex: 1,
                      minWidth: '70px',
                      padding: '10px',
                      borderRadius: '10px',
                      border: quantity === num ? '2px solid #0EA5E9' : '1px solid var(--border-color)',
                      background: quantity === num ? 'rgba(14, 165, 233, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                      color: quantity === num ? '#FFF' : 'var(--text-muted)',
                      fontWeight: 800,
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {num} Units
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Or Enter Custom Quantity (1 - 500):</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    className="input-field mono"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Product ID Prefix:</label>
                  <input
                    type="text"
                    className="input-field mono"
                    placeholder="e.g. AUTH-WATCH-"
                    value={idPrefix}
                    onChange={(e) => setIdPrefix(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Product Details Form */}
            <div className="form-grid">
              <div className="form-group">
                <label>Product Name *</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. UltraFit Pro Smartwatch"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Batch / Lot Number *</label>
                <input
                  type="text"
                  className="input-field mono"
                  placeholder="e.g. PT-2026-X100"
                  value={batch}
                  onChange={(e) => setBatch(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <select className="input-field" value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="Electronics & Hardware">Electronics &amp; Hardware</option>
                  <option value="Pharmaceuticals">Pharmaceuticals</option>
                  <option value="Luxury & Fashion">Luxury &amp; Fashion</option>
                  <option value="Food & Beverages">Food &amp; Beverages</option>
                  <option value="Automotive Parts">Automotive Parts</option>
                  <option value="General Goods">General Goods</option>
                </select>
              </div>

              <div className="form-group">
                <label>Brand / Manufacturer</label>
                <input type="text" className="input-field" value={`${mfgBrand || 'PulseTech'} (${mfgOrg || 'AUTH'})`} readOnly />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Manufacturing Date *</label>
                <input type="date" className="input-field" value={mfgDate} onChange={(e) => setMfgDate(e.target.value)} required />
              </div>

              <div className="form-group">
                <label>Expiry Date *</label>
                <input type="date" className="input-field" value={expDate} onChange={(e) => setExpDate(e.target.value)} required />
              </div>
            </div>

            {/* Manufacturer Signing Key */}
            <div className="form-group">
              <label>Manufacturer Private Key (Hex):</label>
              <input
                type="password"
                className="input-field mono"
                value={privKey}
                onChange={(e) => setPrivKey(e.target.value.trim())}
                placeholder="32-byte Hex Private Key..."
                required
              />
              <small style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Each item will receive a unique cryptographic ECDSA P-256 signature.</small>
            </div>

            {/* Progress Bar during generation */}
            {isGenerating && (
              <div style={{ background: 'rgba(8,13,26,0.9)', padding: '16px', borderRadius: '12px', border: '1px solid #0EA5E9', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#FFF', fontWeight: 700, marginBottom: '8px' }}>
                  <span>{progressText}</span>
                  <span>{progress}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #0EA5E9, #10B981)', transition: 'width 0.2s' }} />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button
                type="submit"
                className="btn-accent"
                disabled={isGenerating}
                style={{ flex: 1, padding: '14px', fontSize: '15px', fontWeight: 800 }}
              >
                <Zap size={18} />
                <span>
                  {isGenerating
                    ? `Generating ${quantity} Products...`
                    : `⚡ Generate ${quantity} ${prodName || 'Product'}s & Export PDF`}
                </span>
              </button>
              <button type="button" onClick={onClose} disabled={isGenerating} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          /* Success Screen & Result Grid */
          <div>
            <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '16px', padding: '20px', textAlign: 'center', marginBottom: '20px' }}>
              <CheckCircle2 size={48} className="text-success" style={{ margin: '0 auto 10px auto' }} />
              <h4 style={{ fontSize: '22px', fontWeight: 800, color: '#FFF', marginBottom: '6px' }}>
                Successfully Generated {generatedBatchResult.count} Products!
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Batch <code className="font-mono text-info">{generatedBatchResult.batch}</code> ({generatedBatchResult.productName}) has been cryptographically signed &amp; added to your catalog.
              </p>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => generatePDFSheet(generatedBatchResult.pdfItems, generatedBatchResult.batch, generatedBatchResult.productName, mfgBrand, mfgOrg)}
                  className="btn-primary"
                >
                  <Download size={16} /> Download A4 PDF Sheet (.pdf)
                </button>

                <button
                  onClick={() => setGeneratedBatchResult(null)}
                  className="btn-secondary"
                >
                  <RefreshCw size={16} /> Generate Another Batch
                </button>

                <button onClick={onClose} className="btn-accent">
                  Done &amp; View Catalog
                </button>
              </div>
            </div>

            <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#FFF', marginBottom: '12px' }}>
              📦 Preview of Generated Batch Items (First 12 of {generatedBatchResult.count}):
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
              {generatedBatchResult.pdfItems.slice(0, 12).map((item) => (
                <div key={item.productId} style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '10px', textAlign: 'center' }}>
                  <img src={item.qrDataUrl} alt={item.productId} style={{ width: '90px', height: '90px', margin: '0 auto 6px auto', display: 'block', borderRadius: '6px', background: '#FFF' }} />
                  <code style={{ fontSize: '11px', color: '#0EA5E9', fontWeight: 700, display: 'block' }}>{item.productId}</code>
                  <span style={{ fontSize: '10px', color: '#10B981', fontWeight: 600, display: 'block', marginTop: '2px' }}>✓ ECDSA Signed</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
