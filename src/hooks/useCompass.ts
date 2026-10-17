import { useCallback, useEffect, useState } from 'react';

type IOSOrientation = DeviceOrientationEvent & { webkitCompassHeading?: number };
type OrientationCtor = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> };

export function useCompass() {
  const [heading, setHeading] = useState<number | null>(null);
  const [status, setStatus] = useState('Waiting for Data');
  const [source, setSource] = useState('Not yet available');
  const [run, setRun] = useState(0);

  // Call from a tap: iOS only shows the sensor permission prompt inside a user gesture.
  const enable = useCallback(async () => {
    if (typeof DeviceOrientationEvent === 'undefined') {
      setStatus('Sensor Unavailable');
      setSource('Device orientation API not supported');
      return;
    }
    try {
      const D = DeviceOrientationEvent as OrientationCtor;
      if (typeof D.requestPermission === 'function' && (await D.requestPermission()) !== 'granted') {
        setStatus('Permission Denied');
        return;
      }
    } catch {
      setStatus('Permission Denied');
      return;
    }
    setHeading(null);
    setStatus('Waiting for Data');
    setSource('Not yet available');
    setRun((n) => n + 1);
  }, []);

  useEffect(() => {
    if (run === 0) return;
    let prev: number | null = null;
    let sawRelative = false;
    const accept = (raw: number, src: string) => {
      let n = ((raw % 360) + 360) % 360;
      if (prev !== null) n = (prev + (((n - prev + 540) % 360) - 180) * 0.32 + 360) % 360;
      prev = n;
      setHeading(n);
      setStatus('Sensor Active');
      setSource(src);
    };
    const onOrientation = (e: DeviceOrientationEvent) => {
      const w = e as IOSOrientation;
      if (typeof w.webkitCompassHeading === 'number' && Number.isFinite(w.webkitCompassHeading) && w.webkitCompassHeading >= 0) {
        accept(w.webkitCompassHeading, 'Platform compass heading');
        return;
      }
      if (e.absolute && e.alpha !== null && Number.isFinite(e.alpha)) {
        accept(360 - e.alpha, 'Absolute orientation sensor');
        return;
      }
      sawRelative = true;
    };
    const onAbsolute = (e: DeviceOrientationEvent) => {
      if (e.alpha !== null && Number.isFinite(e.alpha)) accept(360 - e.alpha, 'Absolute orientation sensor');
    };
    window.addEventListener('deviceorientation', onOrientation, true);
    window.addEventListener('deviceorientationabsolute', onAbsolute as EventListener, true);
    const timer = window.setTimeout(() => {
      if (prev === null) {
        setStatus(sawRelative ? 'Relative Orientation Only' : 'Sensor Unavailable');
        setSource(sawRelative ? 'Relative orientation only; no magnetic reference' : 'No orientation events received');
      }
    }, 3500);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('deviceorientation', onOrientation, true);
      window.removeEventListener('deviceorientationabsolute', onAbsolute as EventListener, true);
    };
  }, [run]);

  return { heading, status, source, enable };
}
