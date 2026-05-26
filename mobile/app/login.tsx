import React from 'react';
import { Text, View } from 'react-native';
import { Link, Redirect } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';

import Input from '@/components/Input/Input';
import { AuthCard } from '@/components/auth/AuthCard';
import { AuthScreenContainer } from '@/components/auth/AuthScreenContainer';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useAuth } from '@/contexts/AuthContext';
import { useGoogleSignIn } from '@/services/google-signin';
import { loginLabels } from './login.labels';
import { loginStyles } from './login.styles';
import type { LoginFormValues } from '@/types/login.types';

export default function LoginScreen() {
  const { login, signInWithGoogle, isAuthenticated } = useAuth();
  const { promptGoogleSignIn, isGoogleReady, missingGoogleConfig } = useGoogleSignIn();

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  const onSubmit = async (values: LoginFormValues) => {
    const trimmedEmail = values.email.trim();

    if (!trimmedEmail || !values.password) {
      setError('root', {
        type: 'manual',
        message: loginLabels.submit.credentialsError,
      });
      return;
    }

    try {
      await login(trimmedEmail, values.password);
    } catch (e: any) {
      setError('root', {
        type: 'manual',
        message: e?.message || loginLabels.submit.genericError,
      });
    }
  };

  const onGoogleSubmit = async () => {
    try {
      const didSignIn = await promptGoogleSignIn();
      if (!didSignIn) {
        return;
      }
      await signInWithGoogle();
    } catch (e: any) {
      setError('root', {
        type: 'manual',
        message: e?.message || loginLabels.google.genericError,
      });
    }
  };

  return (
    <AuthScreenContainer variant="login">
      <AuthCard
        title={loginLabels.title}
        description={loginLabels.description}
        footer={
          <View style={loginStyles.footerRow}>
            <Text style={loginStyles.footerText}>{loginLabels.footer.text}</Text>
            <Link href="../register" asChild>
              <Text style={loginStyles.footerLink}>{loginLabels.footer.link}</Text>
            </Link>
          </View>
        }
      >
        <View style={loginStyles.fieldGroup}>
          <Text style={loginStyles.label}>{loginLabels.email.label}</Text>
          <Text style={loginStyles.labelDescription}>{loginLabels.email.description}</Text>
          <Controller
            control={control}
            name="email"
            rules={{
              required: loginLabels.email.requiredError,
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder={loginLabels.email.placeholder}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
            )}
          />
          {errors.email && (
            <Text style={loginStyles.errorText}>{errors.email.message as string}</Text>
          )}
        </View>

        <View style={loginStyles.fieldGroup}>
          <Text style={loginStyles.label}>{loginLabels.password.label}</Text>
          <Text style={loginStyles.labelDescription}>{loginLabels.password.description}</Text>
          <Controller
            control={control}
            name="password"
            rules={{
              required: loginLabels.password.requiredError,
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder={loginLabels.password.placeholder}
                secureTextEntry
              />
            )}
          />
          {errors.password && (
            <Text style={loginStyles.errorText}>{errors.password.message as string}</Text>
          )}
        </View>

        {errors.root?.message ? (
          <Text style={loginStyles.errorText}>{errors.root.message as string}</Text>
        ) : null}
        {missingGoogleConfig ? (
          <Text style={loginStyles.labelDescription}>
            Google sign-in is disabled until Google client IDs are set in `mobile/.env`.
          </Text>
        ) : null}

        <PrimaryButton
          label={isSubmitting ? loginLabels.submit.submitting : loginLabels.submit.idle}
          onPress={handleSubmit(onSubmit)}
          loading={isSubmitting}
        />
        <PrimaryButton
          label={loginLabels.google.idle}
          onPress={onGoogleSubmit}
          variant="outline"
          disabled={isSubmitting || !isGoogleReady}
        />
      </AuthCard>
    </AuthScreenContainer>
  );
}

