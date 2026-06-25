import React from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, spacing, radius, typography } from '@/theme';
import { Button } from '@/components/ui/Button';
import { RText } from '@/components/ui/Text';

const { width, height } = Dimensions.get('window');

// Feature highlights
const FEATURES = [
  { icon: '🍜', label: 'Track every restaurant you visit' },
  { icon: '👥', label: 'Discover through friends you trust' },
  { icon: '💯', label: 'Find your perfect taste match' },
];

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      {/* Background: collage of food photos */}
      <Image
        source={{ uri: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800' }}
        style={styles.backgroundImage}
        contentFit="cover"
      />

      <LinearGradient
        colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.9)']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safe}>
        {/* Logo / Brand */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <RText style={styles.logoText}>Rasa</RText>
          </View>
          <RText variant="bodyMedium" color="rgba(255,255,255,0.7)" style={{ marginTop: spacing[1] }}>
            Social food discovery for Malaysia
          </RText>
        </View>

        {/* Tagline */}
        <View style={styles.taglineContainer}>
          <RText style={styles.tagline} color={colors.white}>
            The best recommendations come from people{' '}
            <RText style={[styles.tagline, { color: colors.accent }]}>
              whose taste you trust.
            </RText>
          </RText>
        </View>

        {/* Features */}
        <View style={styles.features}>
          {FEATURES.map(f => (
            <View key={f.label} style={styles.featureRow}>
              <RText style={{ fontSize: 20 }}>{f.icon}</RText>
              <RText variant="bodyMedium" color="rgba(255,255,255,0.85)" style={styles.featureText}>
                {f.label}
              </RText>
            </View>
          ))}
        </View>

        {/* CTA */}
        <View style={styles.cta}>
          <Button
            label="Get Started"
            onPress={() => router.push('/(auth)/register')}
            fullWidth
            size="lg"
          />
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => router.push('/(auth)/login')}
          >
            <RText variant="bodyMedium" color="rgba(255,255,255,0.7)">
              Already have an account?{' '}
              <RText variant="bodyMedium" color={colors.white} style={{ fontWeight: '600' }}>
                Sign in
              </RText>
            </RText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  backgroundImage: {
    position: 'absolute',
    width,
    height,
  },
  safe: {
    flex: 1,
    paddingHorizontal: spacing[6],
    justifyContent: 'space-between',
    paddingBottom: spacing[8],
    paddingTop: spacing[8],
  },
  header: {
    alignItems: 'flex-start',
  },
  logoContainer: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radius.lg,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: -1,
  },
  taglineContainer: {
    flex: 1,
    justifyContent: 'center',
    maxWidth: 320,
  },
  tagline: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  features: {
    gap: spacing[4],
    marginBottom: spacing[10],
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  featureText: {
    flex: 1,
  },
  cta: {
    gap: spacing[4],
  },
  loginBtn: {
    alignItems: 'center',
    padding: spacing[3],
  },
});
