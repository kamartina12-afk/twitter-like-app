import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { Pause, Play } from 'lucide-react-native';
import { ExpoVideoPlayerProps } from './types';

function formatPlaybackTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0:00';
  }
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function ExpoVideoPlayer({
  uri,
  style,
  contentFit = 'contain',
  nativeControls = true,
  autoplay = false,
  loop = false,
  muted = false,
  onPress,
  onDoublePress,
  onPlayToEnd,
  feedControls = false,
  onPlaybackStatusUpdate,
}: ExpoVideoPlayerProps) {
  const player = useVideoPlayer(uri, (p) => {
    p.muted = muted;
    p.loop = loop;
  });

  const [feedOverlayVisible, setFeedOverlayVisible] = useState(false);
  const [displayTime, setDisplayTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playingUi, setPlayingUi] = useState(false);
  /** While parent says autoplay, user can pause; do not force `play()` again until they resume or leave the cell. */
  const [manualPause, setManualPause] = useState(false);

  const feedControlsActive = feedControls && !nativeControls;

  const onPlayToEndRef = useRef(onPlayToEnd);
  onPlayToEndRef.current = onPlayToEnd;

  const onPressRef = useRef(onPress);
  const onDoublePressRef = useRef(onDoublePress);
  onPressRef.current = onPress;
  onDoublePressRef.current = onDoublePress;
  const onPlaybackStatusUpdateRef = useRef(onPlaybackStatusUpdate);
  onPlaybackStatusUpdateRef.current = onPlaybackStatusUpdate;

  // 1. when video ends
useEventListener(player, 'playToEnd', () => {
  onPlayToEndRef.current?.();

  if (loop) {
    onPlaybackStatusUpdateRef.current?.({ didLoop: true });
  }
});

// 2. fallback loop detection
useEventListener(player, 'timeUpdate', ({ currentTime }) => {
  if (currentTime < 0.2 && player.playing) {
    onPlaybackStatusUpdateRef.current?.({ didLoop: true });
  }
});

  

  const toggleFeedOverlay = useCallback(() => {
    setFeedOverlayVisible((v) => !v);
  }, []);

  const notifyDoublePress = useCallback(() => {
    onDoublePressRef.current?.();
  }, []);

  const notifyPress = useCallback(() => {
    onPressRef.current?.();
  }, []);

  const tapGesture = useMemo(() => {
    if (feedControlsActive) {
      const singleTap = Gesture.Tap()
        .numberOfTaps(1)
        .onEnd(() => {
          runOnJS(toggleFeedOverlay)();
        });
      if (onDoublePress) {
        const doubleTap = Gesture.Tap()
          .numberOfTaps(2)
          .onEnd(() => {
            runOnJS(notifyDoublePress)();
          });
        return Gesture.Exclusive(doubleTap, singleTap);
      }
      return singleTap;
    }
    if (!onDoublePress) {
      return null;
    }
    const doubleTap = Gesture.Tap()
      .numberOfTaps(2)
      .onEnd(() => {
        runOnJS(notifyDoublePress)();
      });
    if (!onPress) {
      return doubleTap;
    }
    const singleTap = Gesture.Tap()
      .numberOfTaps(1)
      .onEnd(() => {
        runOnJS(notifyPress)();
      });
    return Gesture.Exclusive(doubleTap, singleTap);
  }, [
    feedControlsActive,
    notifyDoublePress,
    notifyPress,
    onDoublePress,
    onPress,
    toggleFeedOverlay,
  ]);

  const feedControlsActiveRef = useRef(feedControlsActive);
  feedControlsActiveRef.current = feedControlsActive;

  useEventListener(player, 'playToEnd', () => {
    onPlayToEndRef.current?.();
  });

  useEventListener(player, 'playingChange', ({ isPlaying }) => {
    if (feedControlsActiveRef.current) {
      setPlayingUi(isPlaying);
    }
  });

  useEventListener(player, 'timeUpdate', ({ currentTime: t }) => {
    if (!feedControlsActiveRef.current) {
      return;
    }
    setDisplayTime(t);
    const d = player.duration;
    if (d > 0) {
      setDuration((prev) => (Math.abs(prev - d) < 0.05 ? prev : d));
    }
  });

  useEffect(() => {
    if (!feedControlsActive) {
      return;
    }
    player.timeUpdateEventInterval = 0.35;
    return () => {
      try {
        player.timeUpdateEventInterval = 0;
      } catch {
        // Native shared object may already be released on unmount / player swap.
      }
    };
  }, [feedControlsActive, player]);

  useEffect(() => {
    if (!feedControlsActive || !feedOverlayVisible) {
      return;
    }
    setDisplayTime(player.currentTime);
    const d = player.duration;
    if (d > 0) {
      setDuration(d);
    }
    setPlayingUi(player.playing);
  }, [feedControlsActive, feedOverlayVisible, player]);

  useEffect(() => {
    if (!feedControlsActive || !feedOverlayVisible) {
      return;
    }
    const hide = setTimeout(() => setFeedOverlayVisible(false), 5500);
    return () => clearTimeout(hide);
  }, [feedControlsActive, feedOverlayVisible]);

  useEffect(() => {
    if (!autoplay) {
      setManualPause(false);
    }
  }, [autoplay]);

  useEffect(() => {
    setManualPause(false);
  }, [uri]);

  useEffect(() => {
    player.muted = muted;
    player.loop = loop;
    if (!autoplay) {
      player.pause();
      return;
    }
    if (feedControlsActive && manualPause) {
      player.pause();
      return;
    }
    player.play();
  }, [autoplay, feedControlsActive, loop, manualPause, muted, player]);

  const hasGestureWrapper = !!tapGesture;

  const videoView = (
    <VideoView
      player={player}
      style={hasGestureWrapper ? StyleSheet.absoluteFill : style}
      contentFit={contentFit}
      nativeControls={nativeControls}
      allowsVideoFrameAnalysis={false}
      onTouchEnd={hasGestureWrapper ? undefined : onPress}
      surfaceType={Platform.OS === 'android' ? 'textureView' : undefined}
    />
  );

  const handleTogglePlay = useCallback(() => {
    if (player.playing) {
      setManualPause(true);
      player.pause();
    } else {
      setManualPause(false);
      player.play();
    }
  }, [player]);

  const overlay =
    feedControlsActive && feedOverlayVisible ? (
      <View style={styles.feedOverlay} pointerEvents="box-none">
        <View style={styles.feedCenterWrap} pointerEvents="box-none">
          <Pressable
            onPress={handleTogglePlay}
            style={({ pressed }) => [
              styles.feedCenterPlayBtn,
              !playingUi && styles.feedCenterPlayBtnPlayIcon,
              pressed && styles.feedCenterPlayBtnPressed,
            ]}
            accessibilityLabel={playingUi ? 'Pause' : 'Play'}
            accessibilityRole="button"
          >
            {playingUi ? (
              <Pause size={34} color="#fff" fill="#fff" strokeWidth={2.5} />
            ) : (
              <Play size={38} color="#fff" fill="#fff" />
            )}
          </Pressable>
        </View>
        <View style={styles.feedTimeRow} pointerEvents="none">
          <Text style={styles.feedTimeText}>
            {formatPlaybackTime(displayTime)} / {formatPlaybackTime(duration)}
          </Text>
        </View>
      </View>
    ) : null;

  if (hasGestureWrapper) {
    return (
      <GestureHandlerRootView style={style}>
        <GestureDetector gesture={tapGesture}>
          <View style={styles.gestureInner}>{videoView}</View>
        </GestureDetector>
        {overlay}
      </GestureHandlerRootView>
    );
  }

  return videoView;
}

const styles = StyleSheet.create({
  gestureInner: {
    flex: 1,
  },
  feedOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 4,
    pointerEvents: 'box-none',
  },
  feedCenterWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  /** Instagram-style: soft dark disc + white glyph in the visual center of the video. */
  feedCenterPlayBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  /** Nudge play triangle slightly right so it looks centered (optical balance). */
  feedCenterPlayBtnPlayIcon: {
    paddingLeft: 5,
  },
  feedCenterPlayBtnPressed: {
    opacity: 0.85,
  },
  feedTimeRow: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    right: 12,
    alignItems: 'center',
  },
  feedTimeText: {
    color: '#fff',
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
