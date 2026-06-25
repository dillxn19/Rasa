import React from 'react';
import { Text, TextStyle, StyleSheet } from 'react-native';
import { colors, typography, type TypographyVariant } from '@/theme';

interface RTextProps {
  variant?: TypographyVariant;
  color?: string;
  align?: 'left' | 'center' | 'right';
  numberOfLines?: number;
  children: React.ReactNode;
  style?: TextStyle | TextStyle[];
  selectable?: boolean;
}

export function RText({
  variant = 'bodyMedium',
  color,
  align,
  numberOfLines,
  children,
  style,
  selectable,
}: RTextProps) {
  return (
    <Text
      style={[
        typography[variant] as TextStyle,
        { color: color ?? colors.textPrimary },
        align ? { textAlign: align } : undefined,
        style,
      ]}
      numberOfLines={numberOfLines}
      selectable={selectable}
    >
      {children}
    </Text>
  );
}

// Convenience wrappers for common patterns
export const H1 = ({ children, style }: { children: React.ReactNode; style?: TextStyle }) => (
  <RText variant="h1" style={style}>{children}</RText>
);
export const H2 = ({ children, style }: { children: React.ReactNode; style?: TextStyle }) => (
  <RText variant="h2" style={style}>{children}</RText>
);
export const H3 = ({ children, style }: { children: React.ReactNode; style?: TextStyle }) => (
  <RText variant="h3" style={style}>{children}</RText>
);
export const H4 = ({ children, style }: { children: React.ReactNode; style?: TextStyle }) => (
  <RText variant="h4" style={style}>{children}</RText>
);
export const Body = ({ children, style, color, numberOfLines }: {
  children: React.ReactNode; style?: TextStyle; color?: string; numberOfLines?: number;
}) => (
  <RText variant="bodyMedium" color={color} style={style} numberOfLines={numberOfLines}>{children}</RText>
);
export const Caption = ({ children, style, color }: {
  children: React.ReactNode; style?: TextStyle; color?: string;
}) => (
  <RText variant="caption" color={color ?? colors.textSecondary} style={style}>{children}</RText>
);
export const Label = ({ children, style, color }: {
  children: React.ReactNode; style?: TextStyle; color?: string;
}) => (
  <RText variant="labelMedium" color={color} style={style}>{children}</RText>
);
