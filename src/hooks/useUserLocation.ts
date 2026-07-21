import { useCallback, useState } from 'react';
import * as Location from 'expo-location';
import type { Coords } from '@/lib/geo';

type Status = 'idle' | 'loading' | 'granted' | 'denied';

/**
 * Lazily resolves the device's current coordinates. Nothing happens until
 * `request()` is called (e.g. when the user first taps "Distance"), so we never
 * prompt for location on screen load. Result is cached for the session.
 */
export function useUserLocation() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [status, setStatus] = useState<Status>('idle');

  const request = useCallback(async (): Promise<Coords | null> => {
    if (coords) return coords;
    setStatus('loading');
    try {
      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm !== 'granted') {
        setStatus('denied');
        return null;
      }
      const pos = await Location.getLastKnownPositionAsync()
        ?? await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (!pos) {
        setStatus('denied');
        return null;
      }
      const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setCoords(next);
      setStatus('granted');
      return next;
    } catch {
      setStatus('denied');
      return null;
    }
  }, [coords]);

  return { coords, status, request };
}
