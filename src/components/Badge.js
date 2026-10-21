import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SIZES } from '../constants/theme';

export default function Badge({ label, type = 'primary', size = 'medium', style }) {
  let badgeBg = COLORS.primarySubtle;
  let textColor = COLORS.primary;
  let borderColor = COLORS.primaryBorder;

  switch (type) {
    case 'success':
      badgeBg = COLORS.successLight;
      textColor = COLORS.successDark;
      borderColor = COLORS.successBorder;
      break;
    case 'danger':
      badgeBg = COLORS.dangerLight;
      textColor = COLORS.dangerDark;
      borderColor = COLORS.dangerBorder;
      break;
    case 'warning':
      badgeBg = COLORS.warningLight;
      textColor = COLORS.warningDark;
      borderColor = COLORS.warningBorder;
      break;
    case 'info':
      badgeBg = COLORS.infoLight;
      textColor = COLORS.info;
      borderColor = COLORS.primaryBorder;
      break;
    case 'neutral':
      badgeBg = COLORS.surface;
      textColor = COLORS.textSecondary;
      borderColor = COLORS.surfaceBorder;
      break;
    default:
      break;
  }

  const isSmall = size === 'small';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: badgeBg, borderColor },
        isSmall && styles.badgeSmall,
        style,
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          { color: textColor },
          isSmall && styles.badgeTextSmall,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
  badgeTextSmall: {
    fontSize: SIZES.xs,
  },
});
