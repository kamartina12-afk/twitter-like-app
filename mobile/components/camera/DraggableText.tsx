import React, { useEffect, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';

import { TextItem } from '@/types/camera.types';

type Props = {
  data: TextItem;
};

export default function DraggableText({ data }: Props) {
  const [position, setPosition] = useState({ x: data.x, y: data.y });
  const positionRef = useRef(position);
  const dragOrigin = useRef({ x: data.x, y: data.y });

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,

      onPanResponderGrant: () => {
        dragOrigin.current = { ...positionRef.current };
      },

      onPanResponderMove: (_, gesture) => {
        setPosition({
          x: dragOrigin.current.x + gesture.dx,
          y: dragOrigin.current.y + gesture.dy,
        });
      },
    }),
  ).current;

  return (
    <View
      {...panResponder.panHandlers}
      style={[
        styles.wrap,
        {
          left: position.x,
          top: position.y,
        },
      ]}
      collapsable={false}
    >
      <Text style={styles.label}>{data.value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    paddingHorizontal: 10,
    paddingVertical: 8,
    maxWidth: '92%',
  },
  label: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
