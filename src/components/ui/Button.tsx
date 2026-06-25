import React from 'react';
import {
  TouchableOpacity,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, spacing, radius, typography } from '@/theme';
import { RText } from './Text';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps {
  onPress?: () => void;
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  isDisabled?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  haptic?: boolean;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function Button({
  onPress,
  label,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  isDisabled = false,
  icon,
  iconRight,
  fullWidth = false,
  style,
  textStyle,
  haptic = true,
}: ButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const handlePress = () => {
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.();
  };

  const buttonStyle = [
    styles.base,
    styles[`size_${size}`],
    styles[`variant_${variant}`],
    fullWidth && styles.fullWidth,
    (isDisabled || isLoading) && styles.disabled,
    style,
  ];

  const labelStyle = [
    styles.label,
    styles[`labelSize_${size}`],
    styles[`labelVariant_${variant}`],
    (isDisabled || isLoading) && styles.labelDisabled,
    textStyle,
  ];

  return (
    <AnimatedTouchable
      style={[animatedStyle, buttonStyle]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled || isLoading}
      activeOpacity={1}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? colors.white : colors.primary}
        />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.iconLeft}>{icon}</View>}
          <RText style={labelStyle}>{label}</RText>
          {iconRight && <View style={styles.iconRight}>{iconRight}</View>}
        </View>
      )}
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },

  // Sizes
  size_sm: {
    height: 36,
    paddingHorizontal: spacing[4],
  },
  size_md: {
    height: 48,
    paddingHorizontal: spacing[6],
  },
  size_lg: {
    height: 56,
    paddingHorizontal: spacing[8],
  },
  size_xl: {
    height: 60,
    paddingHorizontal: spacing[8],
  },

  // Variants
  variant_primary: {
    backgroundColor: colors.primary,
  },
  variant_secondary: {
    backgroundColor: colors.secondary,
  },
  variant_outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  variant_ghost: {
    backgroundColor: 'transparent',
  },
  variant_danger: {
    backgroundColor: colors.error,
  },
  variant_success: {
    backgroundColor: colors.success,
  },

  // Label sizes
  label: {
    ...typography.buttonMedium,
  },
  labelSize_sm: {
    ...typography.buttonSmall,
  },
  labelSize_md: {
    ...typography.buttonMedium,
  },
  labelSize_lg: {
    ...typography.buttonLarge,
  },
  labelSize_xl: {
    ...typography.buttonLarge,
    fontSize: 18,
  },

  // Label variants
  labelVariant_primary: {
    color: colors.white,
  },
  labelVariant_secondary: {
    color: colors.white,
  },
  labelVariant_outline: {
    color: colors.textPrimary,
  },
  labelVariant_ghost: {
    color: colors.primary,
  },
  labelVariant_danger: {
    color: colors.white,
  },
  labelVariant_success: {
    color: colors.white,
  },
  labelDisabled: {
    opacity: 0.7,
  },

  iconLeft: {
    marginRight: spacing[2],
  },
  iconRight: {
    marginLeft: spacing[2],
  },
});
