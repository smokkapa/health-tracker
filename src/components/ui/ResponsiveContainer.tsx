import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { isWideScreen } from '../../utils/responsive';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  maxWidth?: number;
  style?: StyleProp<ViewStyle>;
  innerStyle?: StyleProp<ViewStyle>;
}

/**
 * Constrains content to a maximum width and centers it horizontally on wide screens.
 * On mobile (< 768px) it renders as a pass-through full-width container.
 */
export function ResponsiveContainer({
  children,
  maxWidth = 1200,
  style,
  innerStyle,
}: ResponsiveContainerProps) {
  const wide = isWideScreen();

  if (!wide) {
    return <View style={[styles.fullWidth, style]}>{children}</View>;
  }

  return (
    <View style={[styles.outer, style]}>
      <View style={[styles.inner, { maxWidth }, innerStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullWidth: {
    flex: 1,
    width: '100%',
  },
  outer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  inner: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 24,
  },
});
