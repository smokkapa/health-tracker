import { useWindowDimensions } from 'react-native';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
} as const;

/**
 * Returns the current breakpoint based on window width.
 * - mobile: width < 768
 * - tablet: 768 <= width < 1024
 * - desktop: width >= 1024
 *
 * Uses useWindowDimensions so it reacts to resize events on web/desktop.
 */
export function useBreakpoint(): Breakpoint {
  const { width } = useWindowDimensions();
  if (width >= BREAKPOINTS.tablet) return 'desktop';
  if (width >= BREAKPOINTS.mobile) return 'tablet';
  return 'mobile';
}

/**
 * Returns true when the viewport is at least tablet width (>= 768px).
 */
export function isWideScreen(): boolean {
  const { width } = useWindowDimensions();
  return width >= BREAKPOINTS.mobile;
}

/**
 * Returns true when the viewport is at least desktop width (>= 1024px).
 */
export function useIsDesktop(): boolean {
  const { width } = useWindowDimensions();
  return width >= BREAKPOINTS.tablet;
}
