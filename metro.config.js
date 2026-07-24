// Sentry-wrapped Expo Metro config (adds source-map support for readable crash
// traces). Falls back to the plain Expo config if Sentry isn't resolvable.
let config;
try {
  const { getSentryExpoConfig } = require('@sentry/react-native/metro');
  config = getSentryExpoConfig(__dirname);
} catch {
  const { getDefaultConfig } = require('expo/metro-config');
  config = getDefaultConfig(__dirname);
}

module.exports = config;
