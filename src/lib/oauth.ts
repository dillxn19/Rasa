import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from './supabase';

// Dismiss any auth session that was left open (e.g. after a reload).
WebBrowser.maybeCompleteAuthSession();

/**
 * Native Google OAuth for Expo. supabase-js does NOT open a browser or capture
 * the callback in React Native — it only returns the provider URL. So we open it
 * with WebBrowser, catch the rasa:// redirect, and set the session ourselves.
 *
 * Handles both auth flows: PKCE (a `code` param → exchangeCodeForSession) and
 * implicit (`access_token`/`refresh_token` in the URL fragment → setSession),
 * so it works regardless of the client's flowType.
 *
 * Requires a DEV/PRODUCTION build (native modules) — will not work in Expo Go.
 * The redirect (rasa://auth-callback) must be in Supabase Auth → URL Configuration.
 */

function extractParams(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  const grab = (s: string) =>
    s.split('&').forEach((pair) => {
      if (!pair) return;
      const eq = pair.indexOf('=');
      const k = eq >= 0 ? pair.slice(0, eq) : pair;
      const v = eq >= 0 ? pair.slice(eq + 1) : '';
      out[decodeURIComponent(k)] = decodeURIComponent(v);
    });
  const q = url.indexOf('?');
  const h = url.indexOf('#');
  if (q >= 0) grab(url.slice(q + 1, h >= 0 ? h : undefined));
  if (h >= 0) grab(url.slice(h + 1));
  return out;
}

async function completeFromUrl(url: string): Promise<void> {
  const p = extractParams(url);
  if (p.error) throw new Error(p.error_description || p.error);
  if (p.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(p.code);
    if (error) throw error;
    return;
  }
  if (p.access_token && p.refresh_token) {
    const { error } = await supabase.auth.setSession({
      access_token: p.access_token,
      refresh_token: p.refresh_token,
    });
    if (error) throw error;
    return;
  }
  throw new Error('Google sign-in did not return a session.');
}

/** Returns true if a session was established, false if the user cancelled. */
async function runOAuth(
  start: (redirectTo: string) => Promise<string | undefined>,
): Promise<boolean> {
  const redirectTo = Linking.createURL('auth-callback');
  const url = await start(redirectTo);
  if (!url) throw new Error('Could not start Google sign-in.');

  const result = await WebBrowser.openAuthSessionAsync(url, redirectTo);
  // User dismissed the browser — treat as a silent cancel, not an error.
  if (result.type !== 'success' || !result.url) return false;

  await completeFromUrl(result.url);
  return true;
}

export async function signInWithGoogle(): Promise<boolean> {
  return runOAuth(async (redirectTo) => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;
    return data?.url;
  });
}

export async function linkGoogleIdentity(): Promise<boolean> {
  return runOAuth(async (redirectTo) => {
    const { data, error } = await supabase.auth.linkIdentity({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;
    return (data as { url?: string })?.url;
  });
}
