import React, { useEffect, useRef, useState } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius } from '@/theme';

/**
 * Ghost placeholder matching a RestaurantCard's footprint, with a shimmer sweep
 * (a light band that flickers across, like most content-loading skeletons).
 * Shown while more results are still loading so a sparse grid reads as "loading"
 * rather than "frozen".
 */
export function RestaurantCardSkeleton() {
  const shimmer = useRef(new Animated.Value(0)).current;
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1100,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  return (
    <View style={styles.card} onLayout={e => setWidth(e.nativeEvent.layout.width)}>
      <View style={styles.image} />
      <View style={styles.lineWide} />
      <View style={styles.lineNarrow} />

      {width > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { transform: [{ translateX }] }]}
        >
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.55)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flex: 1, width }}
          />
        </Animated.View>
      )}
    </View>
  );
}

const BASE = colors.gray300; // a bit darker than the surface so it reads clearly

const styles = StyleSheet.create({
  card: { width: '100%', overflow: 'hidden', borderRadius: radius.lg },
  image: {
    width: '100%',
    height: 140,
    borderRadius: radius.lg,
    backgroundColor: BASE,
  },
  lineWide: {
    height: 12,
    borderRadius: 6,
    backgroundColor: BASE,
    marginTop: spacing[3],
    width: '80%',
  },
  lineNarrow: {
    height: 10,
    borderRadius: 5,
    backgroundColor: BASE,
    marginTop: spacing[2],
    width: '50%',
  },
});
