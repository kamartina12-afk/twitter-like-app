/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const xPrimary = '#1D9BF0';

export const Colors = {
  light: {
    text: '#0F1419',
    background: '#FFFFFF',
    tint: xPrimary,
    icon: '#536471',
    tabIconDefault: '#536471',
    tabIconSelected: xPrimary,
    // chat-specific extensions
    border: '#E5E7EB',
    card: '#F9FAFB',
    muted: '#6B7280',
  },
  dark: {
    text: '#E7E9EA',
    background: '#000000',
    tint: xPrimary,
    icon: '#71767B',
    tabIconDefault: '#71767B',
    tabIconSelected: xPrimary,
    // chat-specific extensions
    border: '#1F2933',
    card: '#111827',
    muted: '#9CA3AF',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
