import React, { useCallback, useMemo, useState } from 'react';
import {
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

type CarouselItem = {
  uri: string;
  aspectRatio?: number | null;
};

type Props = {
  items: CarouselItem[];
  /** Optional handler for double-tap like (feed-style). */
  onDoubleTapLike?: () => void;
  /** Optional clear handler (used by composer to remove all selected photos). */
  onClearAll?: () => void;
};

const MIN_MEDIA_ASPECT_RATIO = 0.6;
const MAX_MEDIA_ASPECT_RATIO = 1.8;
const DEFAULT_MEDIA_ASPECT_RATIO = 1.2;

function getSafeAspectRatio(aspectRatio?: number | null) {
  if (!aspectRatio || !Number.isFinite(aspectRatio) || aspectRatio <= 0) {
    return DEFAULT_MEDIA_ASPECT_RATIO;
  }
  return Math.max(
    MIN_MEDIA_ASPECT_RATIO,
    Math.min(MAX_MEDIA_ASPECT_RATIO, aspectRatio),
  );
}

export function ImageCarousel({ items, onDoubleTapLike, onClearAll }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const effectiveAspectRatio = getSafeAspectRatio(items[0]?.aspectRatio);

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, layoutMeasurement } = event.nativeEvent;
      if (!layoutMeasurement.width) return;
      const index = Math.round(contentOffset.x / layoutMeasurement.width);
      setActiveIndex(Math.min(Math.max(index, 0), items.length - 1));
    },
    [items.length],
  );

  const notifyDoubleTap = useCallback(() => {
    onDoubleTapLike?.();
  }, [onDoubleTapLike]);

  const doubleTapGesture = useMemo(
    () =>
      onDoubleTapLike
        ? Gesture.Tap()
            .numberOfTaps(2)
            .onEnd(() => {
              runOnJS(notifyDoubleTap)();
            })
        : null,
    [notifyDoubleTap, onDoubleTapLike],
  );

  const scrollContent = (
    <ScrollView
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      onMomentumScrollEnd={handleMomentumScrollEnd}
      style={styles.scroll}
    >
      {items.map((item, index) => (
        <View key={`${item.uri}-${index}`} style={styles.slide}>
          <Image source={{ uri: item.uri }} style={styles.image} resizeMode="cover" />
        </View>
      ))}
    </ScrollView>
  );

  return (
    <View
      style={[
        styles.container,
        {
          aspectRatio: effectiveAspectRatio,
        },
      ]}
    >
      {onClearAll ? (
        <View style={styles.clearWrap}>
          <View />
          <View style={styles.counterPill}>
            <View style={styles.counterDot} />
          </View>
        </View>
      ) : null}
      {doubleTapGesture ? (
        <GestureDetector gesture={doubleTapGesture}>
          <View style={styles.gestureWrapper}>{scrollContent}</View>
        </GestureDetector>
      ) : (
        scrollContent
      )}

      {items.length > 1 && (
        <View style={styles.dotsRow} pointerEvents="none">
          {items.map((_, index) => (
            <View
              // eslint-disable-next-line react/no-array-index-key
              key={index}
              style={[
                styles.dot,
                index === activeIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
    minHeight: 220,
  },
  scroll: {
    flex: 1,
  },
  gestureWrapper: {
    width: '100%',
    height: '100%',
  },
  slide: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#020617',
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: '#020617',
  },
  dotsRow: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(148, 163, 184, 0.6)',
  },
  dotActive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f9fafb',
  },
  clearWrap: {
    position: 'absolute',
    top: 8,
    left: 10,
    right: 10,
    zIndex: 4,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  counterPill: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#f9fafb',
  },
});

