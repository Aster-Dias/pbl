-- =========================================================================
-- AuthentiQ - Database Schema (PostgreSQL)
-- Offline-First Counterfeit Product Detection System
-- =========================================================================

CREATE TABLE IF NOT EXISTS manufacturers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    organization_code VARCHAR(50) NOT NULL UNIQUE,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mfg_email ON manufacturers(email);
CREATE INDEX IF NOT EXISTS idx_mfg_org_code ON manufacturers(organization_code);

CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    product_id VARCHAR(64) NOT NULL UNIQUE,
    product_name VARCHAR(200) NOT NULL,
    brand VARCHAR(100) NOT NULL,
    category VARCHAR(100),
    batch_number VARCHAR(100) NOT NULL,
    manufacturing_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    manufacturer_id BIGINT NOT NULL REFERENCES manufacturers(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_pid ON products(product_id);
CREATE INDEX IF NOT EXISTS idx_product_mfg_id ON products(manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_product_batch ON products(batch_number);

CREATE TABLE IF NOT EXISTS product_signatures (
    id BIGSERIAL PRIMARY KEY,
    product_id VARCHAR(64) NOT NULL UNIQUE REFERENCES products(product_id) ON DELETE CASCADE,
    algorithm VARCHAR(32) NOT NULL DEFAULT 'ES256',
    key_version INT NOT NULL DEFAULT 1,
    canonical_payload TEXT NOT NULL,
    signature TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sig_pid ON product_signatures(product_id);

CREATE TABLE IF NOT EXISTS public_keys (
    id BIGSERIAL PRIMARY KEY,
    manufacturer_id BIGINT NOT NULL REFERENCES manufacturers(id) ON DELETE CASCADE,
    key_id VARCHAR(64) NOT NULL UNIQUE,
    key_version INT NOT NULL DEFAULT 1,
    algorithm VARCHAR(32) NOT NULL DEFAULT 'SHA256withECDSA',
    curve VARCHAR(32) NOT NULL DEFAULT 'secp256r1',
    public_key TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pk_key_id ON public_keys(key_id);
CREATE INDEX IF NOT EXISTS idx_pk_mfg_id ON public_keys(manufacturer_id);

CREATE TABLE IF NOT EXISTS scan_events (
    id BIGSERIAL PRIMARY KEY,
    product_id VARCHAR(64) NOT NULL,
    device_identifier_hash VARCHAR(64) NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    network_status VARCHAR(20) NOT NULL DEFAULT 'ONLINE',
    verification_result VARCHAR(30) NOT NULL DEFAULT 'VALID',
    ip_hash VARCHAR(64),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scan_pid ON scan_events(product_id);
CREATE INDEX IF NOT EXISTS idx_scan_timestamp ON scan_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_scan_device ON scan_events(device_identifier_hash);

CREATE TABLE IF NOT EXISTS scan_summaries (
    id BIGSERIAL PRIMARY KEY,
    product_id VARCHAR(64) NOT NULL UNIQUE,
    total_scans INT NOT NULL DEFAULT 0,
    unique_devices INT NOT NULL DEFAULT 0,
    last_scanned_at TIMESTAMP,
    risk_level VARCHAR(20) NOT NULL DEFAULT 'LOW',
    status VARCHAR(30) NOT NULL DEFAULT 'NORMAL',
    risk_reason VARCHAR(255),
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_summary_pid ON scan_summaries(product_id);
CREATE INDEX IF NOT EXISTS idx_summary_risk ON scan_summaries(risk_level);
