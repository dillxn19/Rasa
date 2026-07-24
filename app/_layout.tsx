import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { StyleSheet } from 'react-native';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/authStore';
import { ToastHost } from '@/components/ui/Toast';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { useReferralCapture } from '@/hooks/useReferralCapture';
import { initAnalytics } from '@/lib/analytics';
import { initMonitoring, wrapWithMonitoring } from '@/lib/monitoring';

// Initialise crash reporting as early as possible (before first render).
initMonitoring();

function RootLayout() {
  const { initialize, isInitialized } = useAuthStore();
  useReferralCapture();

  useEffect(() => {
    initAnalytics();
    initialize();
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="restaurant/[id]/index"
              options={{
                presentation: 'card',
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="restaurant/[id]/tags"
              options={{
                presentation: 'card',
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="user/[username]/index"
              options={{
                presentation: 'card',
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="user/[username]/followers"
              options={{
                presentation: 'card',
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="user/[username]/following"
              options={{
                presentation: 'card',
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="list/[id]"
              options={{
                presentation: 'card',
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen name="list/new" options={{ presentation: 'modal' }} />
            <Stack.Screen name="list/add" options={{ presentation: 'modal' }} />
            <Stack.Screen name="list/share" options={{ presentation: 'modal' }} />
            <Stack.Screen
              name="dish/[id]"
              options={{
                presentation: 'card',
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="trail/[id]"
              options={{
                presentation: 'card',
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="edit-profile"
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="shop"
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="review/[id]"
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="recap"
              options={{
                presentation: 'fullScreenModal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="nearby"
              options={{
                presentation: 'card',
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="taste-match"
              options={{
                presentation: 'card',
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="taste-analytics"
              options={{
                presentation: 'card',
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="recommendations"
              options={{ presentation: 'card', animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="referrals"
              options={{ presentation: 'card', animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="legal/privacy"
              options={{ presentation: 'card', animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="legal/terms"
              options={{ presentation: 'card', animation: 'slide_from_right' }}
            />
          </Stack>
          <ToastHost />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});

export default wrapWithMonitoring(RootLayout);
