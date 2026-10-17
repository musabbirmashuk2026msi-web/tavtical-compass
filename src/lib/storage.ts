import { utm, btm } from './coordinates';

export type Loc = {
  id: string; name: string; latitude: number; longitude: number; notes: string;
  createdAt: string; updatedAt: string; accuracy?: number; source: 'gps' | 'manual';
  zone?: number; hemi?: 'N' | 'S'; easting?: number; northing?: number; crs?: string;
  btmEasting?: number; btmNorthing?: number; btmInBounds?: boolean;
};

const KEY = 'tactical-compass.locations.v1';

// crypto.randomUUID only exists in secure contexts (HTTPS / localhost); fall back for LAN http dev.
export function uid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

export function load(): Loc[] {
  try {
    const x = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(x) ? x : [];
  } catch {
    return [];
  }
}

export function persist(x: Loc[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(x));
    return true;
  } catch {
    return false;
  }
}

export function exportData(x: Loc[]) {
  return JSON.stringify({ app: 'TACTICAL COMPASS', schemaVersion: 1, exportedAt: new Date().toISOString(), locations: x }, null, 2);
}

export function parseData(s: string): Loc[] {
  const d = JSON.parse(s);
  const a = Array.isArray(d) ? d : d?.locations;
  if (!Array.isArray(a)) throw Error('No locations array found');
  return a.map((x: Record<string, unknown>) => {
    const latitude = Number(x.latitude), longitude = Number(x.longitude), name = String(x.name || '').trim();
    if (!name || !Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180)
      throw Error('Import contains invalid data');
    const now = new Date().toISOString();
    const acc = Number(x.accuracy);
    const loc: Loc = {
      id: uid(), name, latitude, longitude, notes: String(x.notes || ''),
      createdAt: String(x.createdAt || now), updatedAt: now,
      source: x.source === 'gps' ? 'gps' : 'manual'
    };
    if (x.accuracy !== undefined && x.accuracy !== null && x.accuracy !== '' && Number.isFinite(acc)) loc.accuracy = acc;
    try {
      const u = utm(latitude, longitude);
      loc.zone = u.zone; loc.hemi = u.hemi; loc.easting = u.easting; loc.northing = u.northing; loc.crs = u.crs;
    } catch { /* outside UTM limits */ }
    try {
      const b = btm(latitude, longitude);
      loc.btmEasting = b.easting; loc.btmNorthing = b.northing; loc.btmInBounds = b.inBounds;
    } catch { /* invalid lat/lon */ }
    return loc;
  });
}
