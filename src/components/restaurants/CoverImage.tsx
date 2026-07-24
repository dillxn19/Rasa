import React from 'react';
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { RText } from '@/components/ui/Text';
import { categoryVisual } from '@/theme/categoryVisuals';
import type { RestaurantCategory } from '@/types';

interface CoverImageProps {
  uri?: string | null;
  category?: RestaurantCategory | string | null;
  /** Emoji glyph size for the fallback. */
  emojiSize?: number;
  /** Fill the parent (absolute) — for headers/hero backgrounds. */
  fill?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Overlays rendered on top (badges, gradients, content). */
  children?: React.ReactNode;
  transition?: number;
}

/**
 * The single source of truth for restaurant imagery. When a real photo exists it
 * renders it; otherwise it falls back to a premium category gradient + emoji so
 * the surface never looks broken or empty. Drop-in for cards, hero headers and
 * dish tiles — real assets slot in later with zero layout rework.
 */
export function CoverImage({
  uri, category, emojiSize = 40, fill = false, style, children, transition = 250,
}: CoverImageProps) {
  const visual = categoryVisual(category);
  const containerStyle = [fill ? styles.fill : styles.block, style];

  return (
    <View style={containerStyle}>
      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={transition} />
      ) : (
        <LinearGradient colors={visual.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill}>
          <View style={styles.center}>
            {/* Soft echo of the glyph for a subtle "texture" behind the main emoji. */}
            <RText style={{ fontSize: emojiSize * 2.4, lineHeight: emojiSize * 2.8, opacity: 0.12 }}>
              {visual.emoji}
            </RText>
            <RText style={[styles.emoji, { fontSize: emojiSize, lineHeight: emojiSize * 1.25 }]}>
              {visual.emoji}
            </RText>
          </View>
        </LinearGradient>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { width: '100%', height: '100%', overflow: 'hidden' },
  fill: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  emoji: { position: 'absolute' },
});
