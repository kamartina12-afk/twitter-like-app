'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldTitle,
} from '@/components/ui/field';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { LoginFormData, LoginDialogCardProps } from './types/types';

export function LoginDialogCard({ onSuccess }: LoginDialogCardProps) {
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginFormData>();

  const { login, signInWithGoogle } = useAuth();
  const router = useRouter();

  const onSubmit = async (data: LoginFormData) => {
    setError('');

    try {
      await login(data.email, data.password);
      onSuccess?.();
      router.push('/home');
    } catch (err: any) {
      setError(err.message || 'Failed to login. Please try again.');
    }
  };

  const onGoogleSignIn = async () => {
    setError('');
    try {
      await signInWithGoogle();
      onSuccess?.();
      router.push('/home');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google. Please try again.');
    }
  };

  return (
    <Card className="w-full border border-border bg-white shadow-2xl dark:bg-zinc-900">
      <CardHeader>
        <CardTitle>Sign in to X</CardTitle>
        <CardDescription>Enter your email and password to continue.</CardDescription>
        {error && (
          <p className="mt-2 rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <Button
          type="button"
          variant="outline"
          className="mb-4 w-full rounded-full text-base font-semibold"
          onClick={onGoogleSignIn}
          disabled={isSubmitting}
        >
          Continue with Google
        </Button>
        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <FieldGroup>
            <Field>
              <FieldContent>
                <FieldTitle>Email</FieldTitle>
                <FieldDescription>Use the email associated with your account.</FieldDescription>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  {...register('email', { required: true })}
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldContent>
                <FieldTitle>Password</FieldTitle>
                <FieldDescription>Enter your password to sign in.</FieldDescription>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register('password', { required: true })}
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldError errors={error ? [{ message: error }] : []} />
            </Field>
          </FieldGroup>

          <Button
            type="submit"
            className="w-full rounded-full text-base font-semibold"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center space-x-2 text-sm">
        <span className="text-muted-foreground">Don&apos;t have an account?</span>
        <Link href="/register" className="font-semibold text-primary hover:underline">
          Sign up
        </Link>
      </CardFooter>
    </Card>
  );
}
