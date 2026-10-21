import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';

export default function CustomButton({
  title,
  onPress,
  variant = 'primary', // 'primary' | 'secondary' | 'success' | 'danger' | 'outline' | 'subtle'
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  style,
  textStyle,
  size = 'medium', // 'small' | 'medium' | 'large'
}) {
  let btnStyle = styles.primary;
  let txtStyle = styles.primaryText;
  let iconColor = COLORS.white;

  if (variant === 'secondary') {
    btnStyle = styles.secondary;
    txtStyle = styles.secondaryText;
    iconColor = COLORS.primary;
  } else if (variant === 'success') {
    btnStyle = styles.success;
    txtStyle = styles.successText;
    iconColor = COLORS.white;
  } else if (variant === 'danger') {
    btnStyle = styles.danger;
    txtStyle = styles.dangerText;
    iconColor = COLORS.white;
  } else if (variant === 'outline') {
    btnStyle = styles.outline;
    txtStyle = styles.outlineText;
    iconColor = COLORS.primary;
  } else if (variant === 'subtle') {
    btnStyle = styles.subtle;
    txtStyle = styles.subtleText;
    iconColor = COLORS.primary;
  }

  const isSmall = size === 'small';
  const isLarge = size === 'large';

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        btnStyle,
        isSmall && styles.baseSmall,
        isLarge && styles.baseLarge,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={iconColor} />
      ) : (
        <View style={styles.contentRow}>
          {icon && iconPosition === 'left' && (
            <Ionicons
              name={icon}
              size={isSmall ? 14 : isLarge ? 20 : 16}
              color={iconColor}
              style={{ marginRight: 6 }}
            />
          )}
          <Text
            style={[
              styles.baseText,
              txtStyle,
              isSmall && styles.textSmall,
              isLarge && styles.textLarge,
              disabled && styles.disabledText,
              textStyle,
            ]}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <Ionicons
              name={icon}
              size={isSmall ? 14 : isLarge ? 20 : 16}
              color={iconColor}
              style={{ marginLeft: 6 }}
            />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    ...SHADOWS.small,
  },
  baseSmall: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    elevation: 0,
    shadowOpacity: 0,
  },
  baseLarge: {
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 12,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  baseText: {
    fontSize: SIZES.md,
    fontWeight: '600',
  },
  textSmall: {
    fontSize: SIZES.sm,
  },
  textLarge: {
    fontSize: SIZES.lg,
  },
  primary: {
    backgroundColor: COLORS.primary,
  },
  primaryText: {
    color: COLORS.white,
  },
  secondary: {
    backgroundColor: COLORS.primarySubtle,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  secondaryText: {
    color: COLORS.primary,
  },
  success: {
    backgroundColor: COLORS.success,
  },
  successText: {
    color: COLORS.white,
  },
  danger: {
    backgroundColor: COLORS.danger,
  },
  dangerText: {
    color: COLORS.white,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    elevation: 0,
    shadowOpacity: 0,
  },
  outlineText: {
    color: COLORS.primary,
  },
  subtle: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    elevation: 0,
    shadowOpacity: 0,
  },
  subtleText: {
    color: COLORS.textPrimary,
  },
  disabled: {
    opacity: 0.5,
    elevation: 0,
    shadowOpacity: 0,
  },
  disabledText: {
    color: COLORS.textMuted,
  },
});
