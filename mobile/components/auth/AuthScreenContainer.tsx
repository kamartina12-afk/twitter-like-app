import React from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View, Text } from 'react-native';

type AuthScreenContainerProps = {
  children: React.ReactNode;
  variant?: 'login' | 'register';
};

export function AuthScreenContainer({ children, variant = 'login' }: AuthScreenContainerProps) {
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
    >
      <View style={styles.logoRow}>
        <Text style={styles.logoMark}>𝕏</Text>
        <Text style={styles.logoText}>{variant === 'login' ? 'Sign in to X' : 'Join X today'}</Text>
      </View>
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    backgroundColor: '#020617',
    justifyContent: 'center',
  },
  logoRow: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoMark: {
    fontSize: 40,
    color: '#e5e7eb',
    marginBottom: 4,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#e5e7eb',
  },
});

