import React from 'react';
import { ShieldCheck, UserCheck, Building2, RefreshCw, LogIn, Wifi, WifiOff } from 'lucide-react';

export default function Header({ 
  currentRole, 
  currentUser, 
  mfgBrand, 
  mfgOrg, 
  isOffline, 
  onToggleOffline, 
  onToggleRole, 
  onOpenAuth 
}) {
  return (
    <header className="header">
      <div className="header-brand">
        <div className="brand-badge">AQ</div>
        <div>
          <h1 className="brand-title">
            Authenti<span className="brand-accent">Q</span>
          </h1>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
            {currentRole === 'manufacturer' ? 'Manufacturer Enterprise' : 'Consumer Trust Defense'}
          </span>
        </div>
      </div>

      <div className="header-actions">
        {/* User Profile Badge */}
        <div className="user-badge">
          {currentRole === 'manufacturer' ? (
            <>
              <Building2 size={16} className="text-info" />
              <span>{mfgBrand || 'Acme Pharma'} ({mfgOrg || 'AUTH'})</span>
            </>
          ) : (
            <>
              <UserCheck size={16} className="text-success" />
              <span>{currentUser?.name || 'Consumer View'}</span>
            </>
          )}
        </div>

        {/* Network Toggle Button */}
        <button 
          onClick={onToggleOffline}
          className={`btn-secondary btn-xs ${isOffline ? 'text-warning' : 'text-success'}`}
          title="Click to toggle simulated Offline Mode"
        >
          {isOffline ? <WifiOff size={14} /> : <Wifi size={14} />}
          <span>{isOffline ? 'OFFLINE' : 'ONLINE'}</span>
        </button>

        {/* Explicit Role Switcher Button */}
        <button 
          onClick={onToggleRole}
          className="btn-primary btn-xs"
          title="Switch between Consumer and Manufacturer Dashboards"
        >
          <RefreshCw size={14} />
          <span>{currentRole === 'manufacturer' ? 'Switch to Consumer' : 'Switch to Manufacturer'}</span>
        </button>

        {/* Account Login Button */}
        <button 
          onClick={onOpenAuth}
          className="btn-secondary btn-xs"
          title="Login / Register or Change Profile"
        >
          <LogIn size={14} />
          <span>Login / Account</span>
        </button>
      </div>
    </header>
  );
}
