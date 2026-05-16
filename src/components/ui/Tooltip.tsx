import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';

interface TooltipProps {
  tip: string;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

// Native: no hover concept; pass through. (Could be expanded to long-press popover later.)
export function Tooltip({ style, children }: TooltipProps) {
  return <View style={style}>{children}</View>;
}
