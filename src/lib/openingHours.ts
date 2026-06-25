// Utility for checking if a restaurant is open based on Malaysia time (UTC+8)

type DayHours = { open: string; close: string } | 'closed';
type OpeningHours = Record<string, DayHours>;

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function getMalaysiaTime(): { day: string; hour: number; minute: number } {
  // Malaysia is UTC+8
  const now = new Date();
  const myt = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  const dayIndex = myt.getUTCDay();
  return {
    day: DAYS[dayIndex],
    hour: myt.getUTCHours(),
    minute: myt.getUTCMinutes(),
  };
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m ?? 0);
}

export function isOpenNow(openingHours: OpeningHours | null | undefined): boolean | null {
  if (!openingHours || Object.keys(openingHours).length === 0) return null;

  const { day, hour, minute } = getMalaysiaTime();
  const todayKey = Object.keys(openingHours).find(k => k.toLowerCase() === day);
  if (!todayKey) return null;

  const todayHours = openingHours[todayKey];
  if (todayHours === 'closed') return false;

  const nowMinutes = hour * 60 + minute;
  const openMinutes = timeToMinutes(todayHours.open);
  let closeMinutes = timeToMinutes(todayHours.close);

  // Handle past-midnight close (e.g., closes at 02:00 next day)
  if (closeMinutes < openMinutes) closeMinutes += 24 * 60;

  return nowMinutes >= openMinutes && nowMinutes < closeMinutes;
}

export function getOpenStatus(openingHours: OpeningHours | null | undefined): {
  isOpen: boolean | null;
  label: string;
  color: string;
} {
  const open = isOpenNow(openingHours);
  if (open === null) return { isOpen: null, label: '', color: '' };
  if (open) return { isOpen: true, label: 'Open now', color: '#4F8A5B' };

  // Try to figure out when it opens next
  const { day } = getMalaysiaTime();
  const todayHours = openingHours?.[day];
  if (todayHours && todayHours !== 'closed') {
    return { isOpen: false, label: `Opens ${todayHours.open}`, color: '#D97706' };
  }
  return { isOpen: false, label: 'Closed today', color: '#EF4444' };
}
