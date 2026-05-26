import { useCallback, useMemo, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  View,
  Image,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector, ScrollView } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { ExpoVideoPlayer } from '@/components/media/ExpoVideoPlayer';
import styles from './PostCard.styles';

function DoubleTapImage({
  uri,
  frameStyle,
  resizeMode,
  onDoubleTap,
}: {
  uri: string;
  frameStyle: StyleProp<ViewStyle>;
  resizeMode: 'contain' | 'cover';
  onDoubleTap: () => void;
}) {
  const onDoubleTapRef = useRef(onDoubleTap);
  onDoubleTapRef.current = onDoubleTap;

  const notifyDoubleTap = useCallback(() => {
    onDoubleTapRef.current?.();
  }, []);

  const gesture = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(2)
        .onEnd(() => {
          runOnJS(notifyDoubleTap)();
        }),
    [notifyDoubleTap],
  );

  return (
    <GestureDetector gesture={gesture}>
      <View style={frameStyle}>
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFillObject}
          resizeMode={resizeMode}
        />
      </View>
    </GestureDetector>
  );
}

export type PostMediaItem =
  | { kind: 'image' | 'gif'; uri: string; aspectRatio?: number | null }
  | { kind: 'video'; uri: string; aspectRatio?: number | null };

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

function isValidImageUri(uri: string | null | undefined) {
  if (!uri || typeof uri !== 'string') return false;
  const trimmed = uri.trim();
  if (!trimmed) return false;
  // Basic guard to avoid JSON blobs or malformed values.
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) return false;
  return /^https?:\/\//i.test(trimmed);
}

export default function PostMedia({
  items,
  autoplay = false,
  onVideoPlayToEnd,
  /** When false, hides native fullscreen/controls so a single custom control (e.g. open reels) can be used. */
  videoNativeControls = true,
  /** Double-tap on image or video to toggle like (feed). */
  onDoubleTapLike,
  onPlaybackStatusUpdate,
}: {
  items: PostMediaItem[];
  autoplay?: boolean;
  onVideoPlayToEnd?: () => void;
  videoNativeControls?: boolean;
  onDoubleTapLike?: () => void;
  onPlaybackStatusUpdate?: (status: any) => void;
}) {
  const [carouselWidth, setCarouselWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  /** Full-screen tap gestures on `VideoView` conflict with native player controls. */
  const videoDoubleTapLike =
    onDoubleTapLike && !videoNativeControls ? onDoubleTapLike : undefined;

  const isSingle = items.length === 1;

  if (isSingle) {
    const item = items[0];
    const aspectRatio = getSafeAspectRatio(item.aspectRatio);
    return (
      item.kind === 'video' ? (
        <ExpoVideoPlayer
          key={item.uri}
          uri={item.uri}
          style={[styles.singleMediaImage, { aspectRatio }]}
          contentFit="contain"
          nativeControls={videoNativeControls}
          feedControls={!videoNativeControls}
          autoplay={autoplay}
          loop
          onDoublePress={videoDoubleTapLike}
          onPlayToEnd={onVideoPlayToEnd}
        />
      ) : (
        <DoubleTapImage
          key={item.uri}
          uri={item.uri}
          frameStyle={[styles.singleMediaImage, { aspectRatio }]}
          resizeMode="contain"
          onDoubleTap={onDoubleTapLike ?? (() => {})}
        />
      )
    );
  }

  const allImages = items.every((item) => item.kind === 'image' || item.kind === 'gif');

  if (allImages) {
    const filteredItems = items.filter((item) => isValidImageUri(item.uri));
    if (filteredItems.length === 0) {
      return null;
    }

    const handleMomentumScrollEnd = useCallback(
      (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const { contentOffset, layoutMeasurement } = event.nativeEvent;
        const width = layoutMeasurement.width || carouselWidth;
        if (!width) return;
        const index = Math.round(contentOffset.x / width);
        setActiveIndex(Math.min(Math.max(index, 0), filteredItems.length - 1));
      },
      [carouselWidth, filteredItems.length],
    );

    return (
      <View
        style={[
          styles.singleMediaContainer,
          { paddingBottom: 0, borderWidth: 0, marginTop: 12 },
        ]}
        onLayout={(event) => {
          const width = event.nativeEvent.layout.width;
          if (width > 0 && width !== carouselWidth) {
            setCarouselWidth(width);
          }
        }}
      >
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={{ width: '100%' }}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          scrollEventThrottle={16}
          scrollEnabled={filteredItems.length > 1}
        >
          {filteredItems.map((item, index) => (
            <View
              key={`${item.uri}-${index}`}
              style={[
                styles.singleMediaImage,
                {
                  width: carouselWidth > 0 ? carouselWidth : undefined,
                  aspectRatio: getSafeAspectRatio(item.aspectRatio),
                  marginTop: 0,
                },
              ]}
            >
              <Image
                source={{ uri: item.uri }}
                style={StyleSheet.absoluteFillObject}
                resizeMode="cover"
              />
            </View>
          ))}
        </ScrollView>
        {filteredItems.length > 1 && (
          <View style={styles.carouselDotsRow} pointerEvents="none">
            {filteredItems.map((_, index) => (
              // eslint-disable-next-line react/no-array-index-key
              <View
                key={index}
                style={[
                  styles.carouselDot,
                  index === activeIndex && styles.carouselDotActive,
                ]}
              />
            ))}
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.mediaGrid}>
      {items.map((item, i) =>
        item.kind === 'video' ? (
          <ExpoVideoPlayer
            key={`video-${item.uri}-${i}`}
            uri={item.uri}
            style={[
              styles.mediaImage,
              { aspectRatio: getSafeAspectRatio(item.aspectRatio) },
            ]}
            contentFit="cover"
            nativeControls={videoNativeControls}
            feedControls={!videoNativeControls}
            autoplay={autoplay}
            loop
            onDoublePress={videoDoubleTapLike}
            onPlayToEnd={onVideoPlayToEnd}
            onPlaybackStatusUpdate={onPlaybackStatusUpdate}
          />
        ) : (
          <Image
            key={`image-${item.uri}-${i}`}
            source={{ uri: item.uri }}
            style={[
              styles.mediaImage,
              { aspectRatio: getSafeAspectRatio(item.aspectRatio) },
            ]}
            resizeMode="cover"
          />
        ),
      )}
    </View>
  );
}
