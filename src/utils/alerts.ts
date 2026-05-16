import { Alert, Platform } from 'react-native';

/**
 * Cross-platform alert utilities.
 *
 * Why this exists: React Native Web's `Alert.alert` only supports the
 * single-button form. Calling it with multiple buttons silently no-ops on web,
 * so destructive/confirm flows never fire their callbacks. These helpers fall
 * back to the browser's native `window.alert` / `window.confirm` on web while
 * keeping the proper native UX on iOS/Android.
 */

export function notify(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

export interface ConfirmOptions {
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export function confirm(
  title: string,
  message: string,
  options: ConfirmOptions = {},
): Promise<boolean> {
  const { confirmLabel = 'OK', cancelLabel = 'Cancel', destructive = false } = options;

  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      {
        text: confirmLabel,
        style: destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}

/**
 * Show a choice list. Returns the selected option or `null` if cancelled.
 */
export function choose(
  title: string,
  message: string,
  options: string[],
): Promise<string | null> {
  if (Platform.OS === 'web') {
    const ans = window.prompt(`${title}\n\n${message}\n\nOptions: ${options.join(', ')}`, options[0] ?? '');
    if (ans == null) return Promise.resolve(null);
    const match = options.find((o) => o.toLowerCase() === ans.trim().toLowerCase());
    return Promise.resolve(match ?? null);
  }
  return new Promise((resolve) => {
    const buttons = options.map((o) => ({ text: o, onPress: () => resolve(o) }));
    buttons.push({ text: 'Cancel', onPress: () => resolve(null) } as any);
    Alert.alert(title, message, buttons, {
      cancelable: true,
      onDismiss: () => resolve(null),
    });
  });
}
