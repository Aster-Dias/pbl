import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import OnboardingModal from './components/OnboardingModal';
import ManufacturerView from './components/ManufacturerView';
import ConsumerView from './components/ConsumerView';
import CardSigningModal from './components/CardSigningModal';
import QRViewModal from './components/QRViewModal';
import { generateECDSAKeypair, p256, hexToBytes, encodeX509PublicKey, verifyOfflineEcdsa, buildCanonicalString } from './crypto';

// Initial Demo Key & Products
const INITIAL_DEMO_KEY_ID = 'AUTHENTIQ-KEY-001';
const INITIAL_DEMO_PRIVKEY = 'e8b7c4a123f859218654a9c80d452179b4561029384756102938475610293847';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => JSON.parse(localStorage.getItem('@authentiq_user_profile') || 'null'));
  const [currentRole, setCurrentRole] = useState(() => {
    const saved = localStorage.getItem('@authentiq_current_role');
    const user = JSON.parse(localStorage.getItem('@authentiq_user_profile') || 'null');
    return (saved && user) ? saved : 'manufacturer';
  });
  const [isOffline, setIsOffline] = useState(false);

  const [mfgOrg, setMfgOrg] = useState(() => localStorage.getItem('@authentiq_user_org') || 'AUTH');
  const [mfgBrand, setMfgBrand] = useState(() => localStorage.getItem('@authentiq_user_brand') || 'Acme Pharma');
  const [mfgKeyId, setMfgKeyId] = useState(() => localStorage.getItem('@authentiq_mfg_keyid') || INITIAL_DEMO_KEY_ID);
  const [mfgPrivateKeyHex, setMfgPrivateKeyHex] = useState(() => localStorage.getItem('@authentiq_mfg_privkey') || INITIAL_DEMO_PRIVKEY);
  const [mfgPublicKeyBase64, setMfgPublicKeyBase64] = useState(() => localStorage.getItem('@authentiq_mfg_pubkey') || '');

  const [cachedKeys, setCachedKeys] = useState(() => {
    const saved = localStorage.getItem('@authentiq_cached_keys');
    return saved ? JSON.parse(saved) : {};
  });

  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem('@authentiq_mfg_products');
    if (saved) return JSON.parse(saved);
    return [
      {
        productId: 'AUTH-P001',
        productName: 'Acme Paracetamol 500mg',
        brand: 'Acme Pharma',
        org: 'AUTH',
        category: 'Pharmaceuticals',
        batchNumber: 'BATCH001',
        manufacturingDate: '2026-08-01',
        expiryDate: '2028-08-01',
        productIcon: '💊',
        keyId: INITIAL_DEMO_KEY_ID,
        signature: 'QEaVANmsfG9rmSWLY6MRy9Jx/z6v1Zhv5iCDpH402btKuUUJJA0rlGzc9qBbQcMsTjQLcpYxNkmvH5Pob04qYg==',
        qrStatus: 'GENERATED',
      },
      {
        productId: 'AUTH-P002',
        productName: 'UltraFit Pro Smartwatch',
        brand: 'PulseTech',
        org: 'AUTH',
        category: 'Electronics & Hardware',
        batchNumber: 'PT-2026-X1',
        manufacturingDate: '2026-09-15',
        expiryDate: '2029-09-15',
        productIcon: '⌚',
        keyId: INITIAL_DEMO_KEY_ID,
        signature: 'iQC65DY1YRmhDsN8I4/jPGie73L9RebZ/nBy96ElTjFGFM0kfs4eLVBBMdrol2AZe9MuvAq/E4QOZswvkQHBsw==',
        qrStatus: 'GENERATED',
      },
    ];
  });

  const [scanHistory, setScanHistory] = useState(() => {
    const saved = localStorage.getItem('@authentiq_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [lastResult, setLastResult] = useState(null);

  // Modals state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(() => !localStorage.getItem('@authentiq_user_profile'));
  const [activeCardSignProduct, setActiveCardSignProduct] = useState(null);
  const [activeQRViewProduct, setActiveQRViewProduct] = useState(null);

  // Initialize Public Keys
  useEffect(() => {
    if (mfgPrivateKeyHex && !mfgPublicKeyBase64) {
      try {
        const privBytes = hexToBytes(mfgPrivateKeyHex);
        const pubBytes = p256.getPublicKey(privBytes, false);
        const pubBase64 = encodeX509PublicKey(pubBytes);
        setMfgPublicKeyBase64(pubBase64);
        localStorage.setItem('@authentiq_mfg_pubkey', pubBase64);
      } catch (e) {}
    }
  }, [mfgPrivateKeyHex]);

  // Seed default demo key into cached keys
  useEffect(() => {
    if (!cachedKeys[mfgKeyId] && mfgPublicKeyBase64) {
      const updated = {
        ...cachedKeys,
        [mfgKeyId]: {
          keyId: mfgKeyId,
          keyVersion: 1,
          curve: 'secp256r1',
          algorithm: 'SHA256withECDSA',
          publicKey: mfgPublicKeyBase64,
          active: true,
        },
      };
      setCachedKeys(updated);
      localStorage.setItem('@authentiq_cached_keys', JSON.stringify(updated));
    }
  }, [mfgKeyId, mfgPublicKeyBase64]);

  // Save state helpers
  const handleSaveProfile = (profile) => {
    setCurrentUser(profile);
    setCurrentRole(profile.role);
    localStorage.setItem('@authentiq_user_profile', JSON.stringify(profile));
    localStorage.setItem('@authentiq_current_role', profile.role);

    if (profile.role === 'manufacturer') {
      if (profile.brand) { setMfgBrand(profile.brand); localStorage.setItem('@authentiq_user_brand', profile.brand); }
      if (profile.org)   { setMfgOrg(profile.org);     localStorage.setItem('@authentiq_user_org',   profile.org); }
      if (profile.keyId) { setMfgKeyId(profile.keyId); localStorage.setItem('@authentiq_mfg_keyid',  profile.keyId); }
    }
    setIsAuthModalOpen(false);
  };

  const handleToggleRole = () => {
    const nextRole = currentRole === 'manufacturer' ? 'consumer' : 'manufacturer';
    if (nextRole === 'manufacturer' && (!currentUser || currentUser.role !== 'manufacturer')) {
      setIsAuthModalOpen(true);
    } else {
      setCurrentRole(nextRole);
      localStorage.setItem('@authentiq_current_role', nextRole);
    }
  };

  const handleGenerateKeyPair = () => {
    const kp = generateECDSAKeypair();
    const newKeyId = 'AUTH-KEY-' + Math.floor(100 + Math.random() * 900);
    setMfgPrivateKeyHex(kp.privateKeyHex);
    setMfgPublicKeyBase64(kp.publicKeyBase64);
    setMfgKeyId(newKeyId);

    localStorage.setItem('@authentiq_mfg_privkey', kp.privateKeyHex);
    localStorage.setItem('@authentiq_mfg_pubkey', kp.publicKeyBase64);
    localStorage.setItem('@authentiq_mfg_keyid', newKeyId);

    const updated = {
      ...cachedKeys,
      [newKeyId]: { keyId: newKeyId, keyVersion: 1, curve: 'secp256r1', algorithm: 'SHA256withECDSA', publicKey: kp.publicKeyBase64, active: true },
    };
    setCachedKeys(updated);
    localStorage.setItem('@authentiq_cached_keys', JSON.stringify(updated));

    alert(`✨ New ECDSA P-256 Keypair Generated!\nKey ID: ${newKeyId}\nPublic key registered in offline cache.`);
  };

  const handleAddProduct = (newProd) => {
    const updated = [newProd, ...products];
    setProducts(updated);
    localStorage.setItem('@authentiq_mfg_products', JSON.stringify(updated));
  };

  const handleProductSigned = (signedProd) => {
    const updated = products.map((p) => (p.productId === signedProd.productId ? signedProd : p));
    setProducts(updated);
    localStorage.setItem('@authentiq_mfg_products', JSON.stringify(updated));

    if (signedProd.publicKeyBase64) {
      const updatedKeys = {
        ...cachedKeys,
        [signedProd.keyId]: { keyId: signedProd.keyId, keyVersion: 1, curve: 'secp256r1', algorithm: 'SHA256withECDSA', publicKey: signedProd.publicKeyBase64, active: true },
      };
      setCachedKeys(updatedKeys);
      localStorage.setItem('@authentiq_cached_keys', JSON.stringify(updatedKeys));
    }
  };

  const handleAddScanResult = (res) => {
    setLastResult(res);
    const updated = [res, ...scanHistory].slice(0, 50);
    setScanHistory(updated);
    localStorage.setItem('@authentiq_history', JSON.stringify(updated));
  };

  const handleTestVerifyFromMfg = (qrJsonString) => {
    setCurrentRole('consumer');
    localStorage.setItem('@authentiq_current_role', 'consumer');
    try {
      const payload = JSON.parse(qrJsonString);
      let keyRecord = cachedKeys[payload.kid] || Object.values(cachedKeys)[0];
      const canonical = buildCanonicalString(
        payload.v || 1, payload.mid || 'AUTH', payload.pid,
        payload.name, payload.brand, payload.batch, payload.mfg, payload.exp
      );
      let isCryptoValid = false;
      if (keyRecord && keyRecord.publicKey && payload.sig) {
        isCryptoValid = verifyOfflineEcdsa(canonical, payload.sig, keyRecord.publicKey);
      }
      const res = {
        status: isCryptoValid ? 'GENUINE' : 'INVALID',
        cryptographicallyValid: isCryptoValid,
        payload,
        canonicalPayload: canonical,
        keyId: payload.kid,
        timestamp: new Date().toISOString(),
        riskLevel: isCryptoValid ? 'LOW' : 'CRITICAL',
        riskReason: isCryptoValid ? 'Valid ECDSA P-256 Signature' : 'Digital Signature Verification Failed',
      };
      handleAddScanResult(res);
    } catch (e) {}
  };

  const handleAddBulkProducts = (newProds) => {
    const updated = [...newProds, ...products];
    setProducts(updated);
    localStorage.setItem('@authentiq_mfg_products', JSON.stringify(updated));
  };

  return (
    <div className="app-container">
      <Header
        currentRole={currentRole}
        currentUser={currentUser}
        mfgBrand={mfgBrand}
        mfgOrg={mfgOrg}
        isOffline={isOffline}
        onToggleOffline={() => setIsOffline(!isOffline)}
        onToggleRole={handleToggleRole}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      {currentRole === 'manufacturer' ? (
        <ManufacturerView
          mfgOrg={mfgOrg}
          mfgBrand={mfgBrand}
          mfgKeyId={mfgKeyId}
          mfgPrivateKeyHex={mfgPrivateKeyHex}
          mfgPublicKeyBase64={mfgPublicKeyBase64}
          products={products}
          onAddProduct={handleAddProduct}
          onAddBulkProducts={handleAddBulkProducts}
          onOpenCardSign={(p) => setActiveCardSignProduct(p)}
          onOpenQRView={(p) => setActiveQRViewProduct(p)}
          onGenerateKeyPair={handleGenerateKeyPair}
          onTestVerify={handleTestVerifyFromMfg}
        />
      ) : (
        <ConsumerView
          cachedKeys={cachedKeys}
          scanHistory={scanHistory}
          onAddScanResult={handleAddScanResult}
          lastResult={lastResult}
          onSelectScanResult={(res) => setLastResult(res)}
        />
      )}

      <OnboardingModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSaveProfile={handleSaveProfile}
        initialRole={currentRole}
      />

      <CardSigningModal
        isOpen={!!activeCardSignProduct}
        onClose={() => setActiveCardSignProduct(null)}
        product={activeCardSignProduct}
        mfgOrg={mfgOrg}
        mfgBrand={mfgBrand}
        mfgKeyId={mfgKeyId}
        defaultPrivKey={mfgPrivateKeyHex}
        onProductSigned={handleProductSigned}
      />

      <QRViewModal
        isOpen={!!activeQRViewProduct}
        onClose={() => setActiveQRViewProduct(null)}
        product={activeQRViewProduct}
        onTestVerify={handleTestVerifyFromMfg}
      />
    </div>
  );
}
