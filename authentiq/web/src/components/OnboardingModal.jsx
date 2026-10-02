import React, { useState } from 'react';
import { Building2, User, CheckCircle2, X } from 'lucide-react';

export default function OnboardingModal({ isOpen, onClose, onSaveProfile, initialRole = 'manufacturer' }) {
  const [selectedRole, setSelectedRole] = useState(initialRole);
  
  // Manufacturer fields
  const [mfgEmail, setMfgEmail] = useState('admin@authentiq.demo');
  const [mfgBrand, setMfgBrand] = useState('Acme Pharma');
  const [mfgOrg, setMfgOrg] = useState('AUTH');
  const [mfgKeyId, setMfgKeyId] = useState('AUTHENTIQ-KEY-001');

  // Consumer fields
  const [consumerName, setConsumerName] = useState('Consumer Alex');
  const [consumerEmail, setConsumerEmail] = useState('alex@consumer.org');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedRole === 'manufacturer') {
      onSaveProfile({
        role: 'manufacturer',
        email: mfgEmail,
        brand: mfgBrand,
        org: mfgOrg.toUpperCase(),
        keyId: mfgKeyId,
      });
    } else {
      onSaveProfile({
        role: 'consumer',
        name: consumerName,
        email: consumerEmail,
      });
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-title">
          <h2>Welcome to AuthentiQ</h2>
          <p>Login or register by selecting your workspace role:</p>
        </div>

        {/* Role Selection Grid */}
        <div className="role-grid">
          <div 
            className={`role-btn ${selectedRole === 'manufacturer' ? 'active' : ''}`}
            onClick={() => setSelectedRole('manufacturer')}
          >
            <span className="role-icon">🏢</span>
            <h4 style={{ color: '#FFF', fontSize: '15px', fontWeight: 700 }}>Manufacturer</h4>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Register products, sign ECDSA QR codes, publish public keys
            </p>
          </div>

          <div 
            className={`role-btn ${selectedRole === 'consumer' ? 'active' : ''}`}
            onClick={() => setSelectedRole('consumer')}
          >
            <span className="role-icon">👤</span>
            <h4 style={{ color: '#FFF', fontSize: '15px', fontWeight: 700 }}>Consumer</h4>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Scan QR codes, verify ECDSA digital signatures offline
            </p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          {selectedRole === 'manufacturer' ? (
            <>
              <div className="form-group">
                <label>Manufacturer Email ID *</label>
                <input 
                  type="email" 
                  className="input-field" 
                  value={mfgEmail} 
                  onChange={(e) => setMfgEmail(e.target.value)} 
                  required 
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Brand Name *</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={mfgBrand} 
                    onChange={(e) => setMfgBrand(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>Organization Code *</label>
                  <input 
                    type="text" 
                    className="input-field mono" 
                    value={mfgOrg} 
                    onChange={(e) => setMfgOrg(e.target.value)} 
                    required 
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Signing Key Version / ID</label>
                <input 
                  type="text" 
                  className="input-field mono" 
                  value={mfgKeyId} 
                  onChange={(e) => setMfgKeyId(e.target.value)} 
                  required 
                />
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '10px', padding: '14px' }}>
                <CheckCircle2 size={18} />
                <span>Sign In as Manufacturer</span>
              </button>
            </>
          ) : (
            <>
              <div className="form-group">
                <label>Consumer Full Name *</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={consumerName} 
                  onChange={(e) => setConsumerName(e.target.value)} 
                  required 
                />
              </div>

              <div className="form-group">
                <label>Email Address (Optional)</label>
                <input 
                  type="email" 
                  className="input-field" 
                  value={consumerEmail} 
                  onChange={(e) => setConsumerEmail(e.target.value)} 
                />
              </div>

              <button type="submit" className="btn-accent" style={{ width: '100%', marginTop: '10px', padding: '14px' }}>
                <CheckCircle2 size={18} />
                <span>Enter Consumer Dashboard</span>
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
