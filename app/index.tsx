import { Redirect } from 'expo-router';
import { useAuthStore, selectIsAuthenticated, selectOnboardingCompleted } from '@/stores/authStore';

export default function Index() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const onboardingCompleted = useAuthStore(selectOnboardingCompleted);
  const isLoading = useAuthStore(s => s.isLoading);

  if (isLoading) return null;

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (!onboardingCompleted) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}
