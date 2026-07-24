import * as Sentry from '@sentry/react-native';

/**
 * Crash + error monitoring via Sentry. Inert until EXPO_PUBLIC_SENTRY_DSN is
 * set, and never throws — monitoring must not break app startup. Native crash
 * capture requires a dev/native build (Expo Go captures JS errors only).
 */

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
const ENV = process.env.EXPO_PUBLIC_APP_ENV || 'development';

let initialized = false;

export function initMonitoring(): void {
  if (initialized || !DSN || DSN.startsWith('your-')) return;
  try {
    Sentry.init({
      dsn: DSN,
      // Tag events by env so you can filter dev vs prod in the Sentry UI.
      environment: ENV,
      // Modest performance sampling; tune once real traffic lands.
      tracesSampleRate: 0.2,
      sendDefaultPii: false,
    });
    initialized = true;
  } catch {
    initialized = false;
  }
}

/** Manually report a handled error with optional context. */
export function captureError(error: unknown, context?: Record<string, unknown>): void {
  try {
    if (initialized) Sentry.captureException(error, context ? { extra: context } : undefined);
  } catch {
    /* noop */
  }
}

/** Wrap the root component so uncaught render/runtime errors are reported. */
export const wrapWithMonitoring = Sentry.wrap;
