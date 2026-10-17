// WGS 84 / UTM using the Krueger series (Karney 2011), accurate to well under 1 mm inside a UTM zone.
const A = 6378137;
const F = 1 / 298.257223563;
const K0 = 0.9996;
const RAD = Math.PI / 180;

export function validLL(a: number, o: number) {
  return Number.isFinite(a) && Number.isFinite(o) && a >= -90 && a <= 90 && o >= -180 && o <= 180;
}

export function zoneFor(lat: number, lon: number) {
  if (!validLL(lat, lon) || lat < -80 || lat > 84) throw Error('UTM supports latitudes from 80°S to 84°N');
  if (lat >= 56 && lat < 64 && lon >= 3 && lon < 12) return 32;
  if (lat >= 72 && lat <= 84) {
    if (lon >= 0 && lon < 9) return 31;
    if (lon >= 9 && lon < 21) return 33;
    if (lon >= 21 && lon < 33) return 35;
    if (lon >= 33 && lon < 42) return 37;
  }
  return Math.max(1, Math.min(60, Math.floor((lon + 180) / 6) + 1));
}

export function utm(lat: number, lon: number, z?: number) {
  if (!validLL(lat, lon)) throw Error('Invalid latitude/longitude');
  if (lat < -80 || lat > 84) throw Error('UTM supports latitudes from 80°S to 84°N');
  const zone = z ?? zoneFor(lat, lon);
  if (!Number.isInteger(zone) || zone < 1 || zone > 60) throw Error('UTM zone must be 1–60');
  const hemi = lat >= 0 ? 'N' : 'S';

  const n = F / (2 - F);
  const n2 = n * n, n3 = n2 * n, n4 = n3 * n;
  const radius = (A / (1 + n)) * (1 + n2 / 4 + n4 / 64);
  const alpha = [
    n / 2 - (2 / 3) * n2 + (5 / 16) * n3 + (41 / 180) * n4,
    (13 / 48) * n2 - (3 / 5) * n3 + (557 / 1440) * n4,
    (61 / 240) * n3 - (103 / 140) * n4,
    (49561 / 161280) * n4
  ];
  const e = Math.sqrt(F * (2 - F));
  let dl = (lon - ((zone - 1) * 6 - 180 + 3)) * RAD;
  dl = Math.atan2(Math.sin(dl), Math.cos(dl));
  const tau = Math.tan(lat * RAD);
  const sigma = Math.sinh(e * Math.atanh((e * tau) / Math.sqrt(1 + tau * tau)));
  const tauP = tau * Math.sqrt(1 + sigma * sigma) - sigma * Math.sqrt(1 + tau * tau);
  const xiP = Math.atan2(tauP, Math.cos(dl));
  const etaP = Math.asinh(Math.sin(dl) / Math.sqrt(tauP * tauP + Math.cos(dl) ** 2));
  let xi = xiP, eta = etaP;
  alpha.forEach((a, i) => {
    const j = 2 * (i + 1);
    xi += a * Math.sin(j * xiP) * Math.cosh(j * etaP);
    eta += a * Math.cos(j * xiP) * Math.sinh(j * etaP);
  });
  const easting = 500000 + K0 * radius * eta;
  const northing = (hemi === 'N' ? 0 : 10000000) + K0 * radius * xi;
  return { zone, hemi, easting, northing, crs: `WGS 84 / UTM zone ${zone}${hemi}` } as const;
}

export function distance(a: number, o: number, b: number, p: number) {
  const x = a * RAD, y = b * RAD, dp = (b - a) * RAD, dl = (p - o) * RAD;
  const h = Math.sin(dp / 2) ** 2 + Math.cos(x) * Math.cos(y) * Math.sin(dl / 2) ** 2;
  return 6371008.8 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function bearing(a: number, o: number, b: number, p: number) {
  const x = a * RAD, y = b * RAD, l = (p - o) * RAD;
  const t = Math.atan2(Math.sin(l) * Math.cos(y), Math.cos(x) * Math.sin(y) - Math.sin(x) * Math.cos(y) * Math.cos(l)) / RAD;
  return ((t % 360) + 360) % 360;
}

// EPSG:3106 — Gulshan 303 / TM 90 NE, the Bangladesh single-zone Transverse Mercator
// used by the Survey of Bangladesh 1995–2009. Ellipsoid: Everest 1830 (1937 Adjustment).
// Datum shift is the EPSG-published 3-parameter Gulshan 303 -> WGS 84 Helmert (code 9679).
const A_EVEREST = 6377276.345;
const F_EVEREST = 1 / 300.8017;
const BTM_DX = 283.729, BTM_DY = 735.942, BTM_DZ = 261.143;
const BTM_LON0 = 90, BTM_K0 = 0.9996, BTM_FE = 500000, BTM_FN = 0;
const BTM_BOUNDS = { minLat: 20.5, maxLat: 26.7, minLon: 88.0, maxLon: 92.7 };

function geodeticToGeocentric(lat: number, lon: number, h: number, a: number, f: number) {
  const e2 = f * (2 - f);
  const la = lat * RAD, lo = lon * RAD;
  const n = a / Math.sqrt(1 - e2 * Math.sin(la) ** 2);
  return {
    x: (n + h) * Math.cos(la) * Math.cos(lo),
    y: (n + h) * Math.cos(la) * Math.sin(lo),
    z: (n * (1 - e2) + h) * Math.sin(la)
  };
}

function geocentricToGeodetic(x: number, y: number, z: number, a: number, f: number) {
  const e2 = f * (2 - f);
  const lon = Math.atan2(y, x);
  const p = Math.sqrt(x * x + y * y);
  let lat = Math.atan2(z, p * (1 - e2));
  for (let i = 0; i < 8; i++) {
    const n = a / Math.sqrt(1 - e2 * Math.sin(lat) ** 2);
    const h = p / Math.cos(lat) - n;
    lat = Math.atan2(z, p * (1 - (e2 * n) / (n + h)));
  }
  return { lat: lat / RAD, lon: lon / RAD };
}

function tmForward(lat: number, lon: number, a: number, f: number, k0: number, lon0: number, fe: number, fn: number) {
  const n = f / (2 - f);
  const n2 = n * n, n3 = n2 * n, n4 = n3 * n;
  const radius = (a / (1 + n)) * (1 + n2 / 4 + n4 / 64);
  const alpha = [
    n / 2 - (2 / 3) * n2 + (5 / 16) * n3 + (41 / 180) * n4,
    (13 / 48) * n2 - (3 / 5) * n3 + (557 / 1440) * n4,
    (61 / 240) * n3 - (103 / 140) * n4,
    (49561 / 161280) * n4
  ];
  const e = Math.sqrt(f * (2 - f));
  let dl = (lon - lon0) * RAD;
  dl = Math.atan2(Math.sin(dl), Math.cos(dl));
  const tau = Math.tan(lat * RAD);
  const sigma = Math.sinh(e * Math.atanh((e * tau) / Math.sqrt(1 + tau * tau)));
  const tauP = tau * Math.sqrt(1 + sigma * sigma) - sigma * Math.sqrt(1 + tau * tau);
  const xiP = Math.atan2(tauP, Math.cos(dl));
  const etaP = Math.asinh(Math.sin(dl) / Math.sqrt(tauP * tauP + Math.cos(dl) ** 2));
  let xi = xiP, eta = etaP;
  alpha.forEach((al, i) => {
    const j = 2 * (i + 1);
    xi += al * Math.sin(j * xiP) * Math.cosh(j * etaP);
    eta += al * Math.cos(j * xiP) * Math.sinh(j * etaP);
  });
  return { easting: fe + k0 * radius * eta, northing: fn + k0 * radius * xi };
}

export function btm(lat: number, lon: number) {
  if (!validLL(lat, lon)) throw Error('Invalid latitude/longitude');
  const wgs = geodeticToGeocentric(lat, lon, 0, A, F);
  const gul = geocentricToGeodetic(wgs.x - BTM_DX, wgs.y - BTM_DY, wgs.z - BTM_DZ, A_EVEREST, F_EVEREST);
  const { easting, northing } = tmForward(gul.lat, gul.lon, A_EVEREST, F_EVEREST, BTM_K0, BTM_LON0, BTM_FE, BTM_FN);
  const inBounds = lat >= BTM_BOUNDS.minLat && lat <= BTM_BOUNDS.maxLat && lon >= BTM_BOUNDS.minLon && lon <= BTM_BOUNDS.maxLon;
  return { easting, northing, crs: 'Gulshan 303 / TM 90 NE (EPSG:3106)', inBounds } as const;
}
