import { Share, Linking, Platform } from 'react-native';

const APP_URL = 'https://rasa.my';

export async function shareRestaurant(restaurantId: string, name: string): Promise<void> {
  const url = `${APP_URL}/restaurant/${restaurantId}`;
  const message = `🍜 Check out ${name} on Rasa!\n${url}`;

  try {
    await Share.share({ message, url: Platform.OS === 'ios' ? url : undefined });
  } catch { /* dismissed */ }
}

export async function shareViaWhatsApp(message: string): Promise<void> {
  const encoded = encodeURIComponent(message);
  const waUrl = `whatsapp://send?text=${encoded}`;
  const canOpen = await Linking.canOpenURL(waUrl);
  if (canOpen) {
    await Linking.openURL(waUrl);
  } else {
    // Fallback to system share if WhatsApp not installed
    await Share.share({ message });
  }
}

export async function shareReviewToWhatsApp(
  restaurantName: string,
  rating: number,
  content?: string
): Promise<void> {
  const stars = '⭐'.repeat(Math.round(rating));
  const lines = [
    `${stars} ${restaurantName}`,
    content ? `"${content}"` : null,
    `— via Rasa 🍜 rasa.my`,
  ].filter(Boolean).join('\n');

  await shareViaWhatsApp(lines);
}

export function getWazeUrl(lat: number, lng: number): string {
  return `waze://?ll=${lat},${lng}&navigate=yes`;
}

export function getGrabFoodUrl(restaurantName: string, city: string): string {
  const q = encodeURIComponent(`${restaurantName} ${city}`);
  return `grab://open?screenType=FOOD&keyword=${q}`;
}
