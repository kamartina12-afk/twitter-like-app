import React, { useRef, useState } from 'react';
import { PanResponder, StyleSheet, type ViewStyle } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';

type Props = {
  /** When false, touches pass through to layers below (e.g. draggable text). */
  enabled?: boolean;
  strokeColor?: string;
  strokeWidth?: number;
  style?: ViewStyle;
};

export default function DrawingCanvas({
  enabled = true,
  strokeColor = '#ffffff',
  strokeWidth = 4,
  style,
}: Props) {
  const [lines, setLines] = useState<string[][]>([]);
  const [draft, setDraft] = useState<string[]>([]);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => enabledRef.current,
      onMoveShouldSetPanResponder: () => enabledRef.current,

      onPanResponderGrant: (evt) => {
        if (!enabledRef.current) return;
        const { locationX, locationY } = evt.nativeEvent;
        const pt = `${locationX},${locationY}`;
        setDraft([pt]);
      },

      onPanResponderMove: (evt) => {
        if (!enabledRef.current) return;
        const { locationX, locationY } = evt.nativeEvent;
        const pt = `${locationX},${locationY}`;
        setDraft((prev) => [...prev, pt]);
      },

      onPanResponderRelease: () => {
        if (!enabledRef.current) return;
        setDraft((prev) => {
          if (prev.length > 0) {
            setLines((linesPrev) => [...linesPrev, prev]);
          }
          return [];
        });
      },

      onPanResponderTerminate: () => {
        setDraft([]);
      },
    }),
  ).current;

  return (
    <Svg
      pointerEvents={enabled ? 'auto' : 'none'}
      style={[StyleSheet.absoluteFill, style]}
      {...(enabled ? panResponder.panHandlers : {})}
    >
      {lines.map((line, index) => (
        <Polyline
          key={index}
          points={line.join(' ')}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ))}
      {draft.length > 0 ? (
        <Polyline
          points={draft.join(' ')}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ) : null}
    </Svg>
  );
}
