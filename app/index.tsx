import { Redirect } from 'expo-router';
import { useAuthStore, selectIsAuthenticated, selectOnboardingCompleted } from '@/stores/authStore';

export default function Index() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const onboardingCompleted = useAuthStore(selectOnboardingCompleted);
  const isLoading = useAuthStore(s => s.isLoading);
  // email_confirmed_at is always set for Google users and when confirmations are
  // off, so this gate only bites unconfirmed email/password signups.
  const emailConfirmed = useAuthStore(s => !!s.supabaseUser?.email_confirmed_at);

  if (isLoading) return null;

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (!emailConfirmed) {
    return <Redirect href="/(auth)/verify-email" />;
  }

  if (!onboardingCompleted) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}
