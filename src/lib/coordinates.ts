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
