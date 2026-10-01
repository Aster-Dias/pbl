import { QrPayload } from '../types';

export const PREFIX = 'AUTHENTIQ';
export const DELIMITER = '|';

export function buildCanonicalPayload(qr: QrPayload): string {
  const sanitize = (val: string | undefined | null) => (val ? String(val).trim() : '');

  return [
    PREFIX,
    qr.v || 1,
    sanitize(qr.mid),
    sanitize(qr.pid),
    sanitize(qr.name),
    sanitize(qr.brand),
    sanitize(qr.batch),
    sanitize(qr.mfg),
    sanitize(qr.exp),
  ].join(DELIMITER);
}
