import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type PrimaryButtonProps = PressableProps & {
  label: string;
  loading?: boolean;
  variant?: 'primary' | 'outline';
};

export function PrimaryButton({
  label,
  loading,
  disabled,
  variant = 'primary',
  style,
  ...rest
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;
  const isOutline = variant === 'outline';

  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }): StyleProp<ViewStyle> => {
        const composed: StyleProp<ViewStyle>[] = [
          styles.base,
          isOutline ? styles.outline : styles.primary,
        ];
        if (pressed && !isDisabled) composed.push(styles.pressed);
        if (isDisabled) composed.push(styles.disabled);
        if (style) composed.push(style as StyleProp<ViewStyle>);
        return composed;
      }}
      disabled={isDisabled}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={isOutline ? '#020617' : '#ffffff'} />
      ) : (
        <Text style={[styles.label, isOutline ? styles.outlineLabel : styles.primaryLabel]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    flexDirection: 'row',
  },
  primary: {
    backgroundColor: '#0f172a',
  },
  outline: {
    borderWidth: 1,
    borderColor: '#4b5563',
    backgroundColor: '#ffffff',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.6,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryLabel: {
    color: '#f9fafb',
  },
  outlineLabel: {
    color: '#111827',
  },
});

