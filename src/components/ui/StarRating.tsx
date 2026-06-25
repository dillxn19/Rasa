import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@/theme';
import { RText } from './Text';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
  maxStars?: number;
  readonly?: boolean;
  showValue?: boolean;
  compact?: boolean;
  color?: string;
}

export function StarRating({
  value,
  onChange,
  size = 24,
  maxStars = 5,
  readonly = false,
  showValue = false,
  compact = false,
  color = colors.starFilled,
}: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const displayValue = hovered ?? value;

  const handlePress = (star: number) => {
    if (readonly) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Allow half-star: pressing the same star toggles between full and half
    if (star === Math.ceil(value) && value % 1 !== 0) {
      onChange?.(star);
    } else if (star === value) {
      onChange?.(star - 0.5);
    } else {
      onChange?.(star);
    }
  };

  const getStarIcon = (star: number): keyof typeof Ionicons.glyphMap => {
    if (displayValue >= star) return 'star';
    if (displayValue >= star - 0.5) return 'star-half';
    return 'star-outline';
  };

  if (compact) {
    return (
      <View style={styles.compactRow}>
        <Ionicons name="star" size={size * 0.8} color={color} />
        <RText
          variant="titleSmall"
          color={color}
          style={{ marginLeft: 3 }}
        >
          {value.toFixed(1)}
        </RText>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      {Array.from({ length: maxStars }, (_, i) => i + 1).map(star => (
        <TouchableOpacity
          key={star}
          onPress={() => handlePress(star)}
          onPressIn={() => !readonly && setHovered(star)}
          onPressOut={() => setHovered(null)}
          disabled={readonly}
          style={styles.star}
          activeOpacity={0.7}
        >
          <Ionicons
            name={getStarIcon(star)}
            size={size}
            color={displayValue >= star - 0.5 ? color : colors.starEmpty}
          />
        </TouchableOpacity>
      ))}
      {showValue && (
        <RText
          variant="titleMedium"
          color={colors.textSecondary}
          style={{ marginLeft: spacing[2] }}
        >
          {value.toFixed(1)}
        </RText>
      )}
    </View>
  );
}

// Large rating picker for review flow
export function RatingPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const labels: Record<number, string> = {
    0.5: 'Disappointing',
    1: 'Disappointing',
    1.5: 'Not great',
    2: 'Not great',
    2.5: 'It was ok',
    3: 'It was ok',
    3.5: 'Pretty good',
    4: 'Pretty good',
    4.5: 'Really good',
    5: 'Outstanding!',
  };

  return (
    <View style={styles.picker}>
      <StarRating value={value} onChange={onChange} size={40} />
      {value > 0 && (
        <RText
          variant="titleMedium"
          color={colors.textSecondary}
          style={{ marginTop: spacing[2] }}
          align="center"
        >
          {labels[value] ?? ''}
        </RText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    marginRight: 2,
  },
  picker: {
    alignItems: 'center',
  },
});
