import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { colors, radius, typography } from '@/theme';
import { RText } from './Text';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: AvatarSize;
  onPress?: () => void;
  style?: ViewStyle;
  showBorder?: boolean;
  borderColor?: string;
}

const SIZES: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
  '2xl': 80,
};

const FONT_SIZES: Record<AvatarSize, number> = {
  xs: 9,
  sm: 12,
  md: 15,
  lg: 18,
  xl: 24,
  '2xl': 30,
};

function getInitials(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase();
}

function getAvatarColor(name?: string): string {
  const palette = [
    '#E8452A', '#FF6B4A', '#F5A623', '#34C759',
    '#007AFF', '#5856D6', '#FF2D55', '#FF9500',
  ];
  if (!name) return palette[0];
  const idx = name.charCodeAt(0) % palette.length;
  return palette[idx];
}

export function Avatar({
  uri,
  name,
  size = 'md',
  onPress,
  style,
  showBorder = false,
  borderColor,
}: AvatarProps) {
  const dim = SIZES[size];
  const fontSize = FONT_SIZES[size];
  const bg = getAvatarColor(name);

  const containerStyle = [
    styles.container,
    {
      width: dim,
      height: dim,
      borderRadius: dim / 2,
      backgroundColor: bg,
    },
    showBorder && {
      borderWidth: 2,
      borderColor: borderColor ?? colors.white,
    },
    style,
  ];

  const content = uri ? (
    <Image
      source={{ uri }}
      style={[styles.image, { width: dim, height: dim, borderRadius: dim / 2 }]}
      contentFit="cover"
      transition={200}
    />
  ) : (
    <RText
      style={{
        fontSize,
        fontWeight: '700',
        color: colors.white,
        lineHeight: fontSize * 1.2,
      }}
    >
      {getInitials(name)}
    </RText>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={containerStyle} onPress={onPress} activeOpacity={0.85}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={containerStyle}>{content}</View>;
}

// Stacked avatars (for "3 friends visited" etc.)
interface AvatarStackProps {
  users: Array<{ avatar_url?: string | null; display_name?: string }>;
  size?: AvatarSize;
  max?: number;
  label?: string;
}

export function AvatarStack({ users, size = 'sm', max = 3, label }: AvatarStackProps) {
  const visible = users.slice(0, max);
  const remaining = users.length - max;
  const dim = SIZES[size];

  return (
    <View style={styles.stackContainer}>
      {visible.map((user, i) => (
        <View
          key={i}
          style={[
            styles.stackItem,
            { marginLeft: i > 0 ? -(dim * 0.3) : 0, zIndex: visible.length - i },
          ]}
        >
          <Avatar uri={user.avatar_url} name={user.display_name} size={size} showBorder />
        </View>
      ))}
      {remaining > 0 && (
        <View
          style={[
            styles.stackItem,
            styles.remainingBadge,
            {
              width: dim,
              height: dim,
              borderRadius: dim / 2,
              marginLeft: -(dim * 0.3),
            },
          ]}
        >
          <RText style={{ fontSize: FONT_SIZES[size] - 2, color: colors.white, fontWeight: '700' }}>
            +{remaining}
          </RText>
        </View>
      )}
      {label && (
        <RText
          variant="bodySmall"
          color={colors.textSecondary}
          style={{ marginLeft: 8 }}
        >
          {label}
        </RText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    position: 'absolute',
  },
  stackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackItem: {
    position: 'relative',
  },
  remainingBadge: {
    backgroundColor: colors.gray500,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
});
