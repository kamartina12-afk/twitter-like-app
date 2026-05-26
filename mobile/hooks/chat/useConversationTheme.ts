import { useEffect, useState } from 'react';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { ChatThemeKey } from '@/services/chatTheme.service';
import { getConversationTheme, setConversationTheme } from '@/services/chatTheme.service';

type BubbleColors = {
  ownBubble: string;
  otherBubble: string;
};

const themeOrder: ChatThemeKey[] = ['default', 'sunset', 'forest'];

function getBubbleColors(themeKey: ChatThemeKey, mode: 'light' | 'dark'): BubbleColors {
  const base = Colors[mode];

  switch (themeKey) {
    case 'sunset':
      return {
        ownBubble: mode === 'light' ? '#FCA5A5' : '#7F1D1D',
        otherBubble: mode === 'light' ? '#FFEDD5' : '#9A3412',
      };
    case 'forest':
      return {
        ownBubble: mode === 'light' ? '#86EFAC' : '#065F46',
        otherBubble: mode === 'light' ? '#D1FAE5' : '#064E3B',
      };
    case 'default':
    default:
      return {
        ownBubble: mode === 'light' ? '#DBEAFE' : '#1E3A8A',
        otherBubble: mode === 'light' ? '#E5E7EB' : '#1F2937',
      };
  }
}

export function useConversationTheme(conversationId: string | null) {
  const colorScheme = useColorScheme();
  const mode = (colorScheme ?? 'light') === 'dark' ? 'dark' : 'light';
  const [themeKey, setThemeKey] = useState<ChatThemeKey>('default');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!conversationId) {
      setThemeKey('default');
      return;
    }

    setLoading(true);
    getConversationTheme(conversationId)
      .then((key) => {
        if (!cancelled) setThemeKey(key);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  const cycleTheme = async () => {
    if (!conversationId) return;
    const idx = themeOrder.indexOf(themeKey);
    const nextKey = themeOrder[(idx + 1) % themeOrder.length];
    setThemeKey(nextKey);
    try {
      await setConversationTheme(conversationId, nextKey);
    } catch {
      // ignore
    }
  };

  const bubbles = getBubbleColors(themeKey, mode);

  return {
    themeKey,
    loading,
    bubbleColors: bubbles,
    cycleTheme,
  };
}

