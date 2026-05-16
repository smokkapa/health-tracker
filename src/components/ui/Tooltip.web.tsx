import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';

interface TooltipProps {
  tip: string;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

// Web: render a div with native `title` attribute → browser tooltip on hover
export function Tooltip({ tip, style, children }: TooltipProps) {
  return (
    <div title={tip} style={style as any}>
      {children}
    </div>
  );
}
