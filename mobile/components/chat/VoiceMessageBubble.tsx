import React, { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Audio, type AVPlaybackStatus } from 'expo-av';

import { ThemedText } from '@/components/themed-text';
import { useChatColors } from './chat.utils';

type VoiceMessageBubbleProps = {
  uri: string;
  isOwn?: boolean;
  /** If true, render more compact (e.g. in composer preview). */
  compact?: boolean;
  bubbleColorOverride?: string;
};

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

const VoiceMessageBubble: React.FC<VoiceMessageBubbleProps> = ({
  uri,
  isOwn,
  compact,
  bubbleColorOverride,
}) => {
  const colors = useChatColors() as any;
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [positionMs, setPositionMs] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  const handleStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    if (status.durationMillis != null) {
      setDurationMs(status.durationMillis);
    }
    setPositionMs(status.positionMillis ?? 0);
    setIsPlaying(status.isPlaying);
    if (status.didJustFinish) {
      setIsPlaying(false);
      setPositionMs(status.durationMillis ?? 0);
    }
  };

  const togglePlay = async () => {
    if (!uri) return;
    try {
      if (!soundRef.current) {
        setLoading(true);
        const { sound, status } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: true },
        );
        soundRef.current = sound;
        sound.setOnPlaybackStatusUpdate(handleStatusUpdate);
        if (status.isLoaded && status.durationMillis != null) {
          setDurationMs(status.durationMillis);
        }
        setLoading(false);
        return;
      }

      const status = await soundRef.current.getStatusAsync();
      if (!status.isLoaded) return;

      if (status.isPlaying) {
        await soundRef.current.pauseAsync();
      } else {
        await soundRef.current.playAsync();
      }
    } catch {
      setLoading(false);
    }
  };

  const progress =
    durationMs && durationMs > 0 ? Math.min(positionMs / durationMs, 1) : 0;

  const outerBg = bubbleColorOverride ?? (isOwn ? colors.background : colors.card);
  const accent = isOwn ? colors.tint : colors.tint;
  const textColor = isOwn ? colors.tint : colors.text;

  return (
    <Pressable
      onPress={togglePlay}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: compact ? 4 : 6,
        paddingHorizontal: compact ? 8 : 10,
        borderRadius: 999,
        backgroundColor: outerBg,
        minWidth: compact ? 160 : 220,
        maxWidth: 260,
      }}
    >
      <View
        style={{
          width: compact ? 26 : 32,
          height: compact ? 26 : 32,
          borderRadius: 999,
          backgroundColor: accent,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ThemedText
          style={{
            color: colors.background,
            fontSize: compact ? 12 : 14,
            fontWeight: '600',
          }}
        >
          {loading ? '…' : isPlaying ? '❚❚' : '▶'}
        </ThemedText>
      </View>

      <View style={{ flex: 1 }}>
        <View
          style={{
            height: compact ? 3 : 4,
            borderRadius: 999,
            backgroundColor: colors.border,
            overflow: 'hidden',
            marginBottom: 4,
          }}
        >
          <View
            style={{
              width: `${progress * 100}%`,
              height: '100%',
              backgroundColor: accent,
            }}
          />
        </View>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <ThemedText
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: textColor,
            }}
            numberOfLines={1}
          >
            Voice message
          </ThemedText>
          <ThemedText
            style={{
              fontSize: 10,
              opacity: 0.7,
              color: textColor,
            }}
          >
            {durationMs != null ? (
              <>
                {formatTime(positionMs)} / {formatTime(durationMs)}
              </>
            ) : (
              'Tap to play'
            )}
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );
};

export default VoiceMessageBubble;

