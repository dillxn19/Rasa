import React, { useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { colors, radius as themeRadius } from '@/theme';

interface PhotoCarouselProps {
  photos: string[];
  height?: number;
  /** Corner radius (0 for full-bleed feed images). */
  radius?: number;
  onPressPhoto?: (index: number) => void;
}

/**
 * Shared, swipeable photo pager with dot indicator. Used by both the feed and
 * review cards so multi-photo posts look and behave identically everywhere.
 * Measures its own width so it works full-bleed (feed) or inside padding (reviews).
 */
export function PhotoCarousel({ photos, height = 220, radius = themeRadius.lg, onPressPhoto }: PhotoCarouselProps) {
  const [idx, setIdx] = useState(0);
  const [w, setW] = useState(0);

  if (!photos || photos.length === 0) return null;

  const imgStyle = { width: w || '100%' as const, height, borderRadius: radius, backgroundColor: colors.gray100 };

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {photos.length === 1 || w === 0 ? (
        <Pressable onPress={() => onPressPhoto?.(0)}>
          <Image source={{ uri: photos[0] }} style={imgStyle} contentFit="cover" transition={200} />
        </Pressable>
      ) : (
        <>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={{ width: w }}
            onScroll={(e) => setIdx(Math.round(e.nativeEvent.contentOffset.x / w))}
            scrollEventThrottle={16}
          >
            {photos.map((p, i) => (
              <Pressable key={i} onPress={() => onPressPhoto?.(i)}>
                <Image source={{ uri: p }} style={{ width: w, height, borderRadius: radius, backgroundColor: colors.gray100 }} contentFit="cover" transition={200} />
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.dots} pointerEvents="none">
            {photos.map((_, i) => (
              <View key={i} style={[styles.dot, i === idx && styles.dotActive]} />
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dots: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.55)' },
  dotActive: { backgroundColor: colors.white, width: 16 },
});
