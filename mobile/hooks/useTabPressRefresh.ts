import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useEffect } from 'react';

type TabParamList = Record<string, object | undefined>;

/**
 * Runs `onRefresh` when the user taps the same bottom tab again while that screen is focused.
 */
export function useTabPressRefresh(onRefresh: () => void) {
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();

  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', () => {
      if (navigation.isFocused()) {
        onRefresh();
      }
    });
    return unsubscribe;
  }, [navigation, onRefresh]);
}
