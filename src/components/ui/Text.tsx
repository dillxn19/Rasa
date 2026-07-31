import React from 'react';
import { Text, TextStyle, StyleSheet } from 'react-native';
import { colors, typography, type TypographyVariant } from '@/theme';
import { useTheme } from '@/theme/ThemeProvider';

interface RTextProps {
  variant?: TypographyVariant;
  color?: string;
  align?: 'left' | 'center' | 'right';
  numberOfLines?: number;
  children: React.ReactNode;
  style?: TextStyle | TextStyle[];
  selectable?: boolean;
  onPress?: () => void;
}

// Heading/title variants that a "signature" theme restyles with its display
// font. Body/caption/label variants stay in the system font for readability.
const DISPLAY_VARIANTS = new Set<TypographyVariant>([
  'displayLarge', 'displayMedium', 'h1', 'h2', 'h3', 'h4', 'titleLarge',
]);

export function RText({
  variant = 'bodyMedium',
  color,
  align,
  numberOfLines,
  children,
  style,
  selectable,
  onPress,
}: RTextProps) {
  const theme = useTheme();
  const themedFont =
    theme.displayFontFamily && DISPLAY_VARIANTS.has(variant)
      ? { fontFamily: theme.displayFontFamily }
      : undefined;

  return (
    <Text
      style={[
        typography[variant] as TextStyle,
        { color: color ?? colors.textPrimary },
        align ? { textAlign: align } : undefined,
        themedFont,
        style,
      ]}
      numberOfLines={numberOfLines}
      selectable={selectable}
      onPress={onPress}
    >
      {children}
    </Text>
  );
}

// Convenience wrappers for common patterns. They accept + FORWARD the same
// layout props as RText (align / numberOfLines / color) — otherwise those props
// are silently dropped and truncation/centering never happens.
type WrapProps = {
  children: React.ReactNode;
  style?: TextStyle | TextStyle[];
  color?: string;
  align?: 'left' | 'center' | 'right';
  numberOfLines?: number;
};

export const H1 = ({ children, ...p }: WrapProps) => <RText variant="h1" {...p}>{children}</RText>;
export const H2 = ({ children, ...p }: WrapProps) => <RText variant="h2" {...p}>{children}</RText>;
export const H3 = ({ children, ...p }: WrapProps) => <RText variant="h3" {...p}>{children}</RText>;
export const H4 = ({ children, ...p }: WrapProps) => <RText variant="h4" {...p}>{children}</RText>;
export const Body = ({ children, ...p }: WrapProps) => <RText variant="bodyMedium" {...p}>{children}</RText>;
export const Caption = ({ children, color, ...p }: WrapProps) => (
  <RText variant="caption" color={color ?? colors.textSecondary} {...p}>{children}</RText>
);
export const Label = ({ children, ...p }: WrapProps) => <RText variant="labelMedium" {...p}>{children}</RText>;
