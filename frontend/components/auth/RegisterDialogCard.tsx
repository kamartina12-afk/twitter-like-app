'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
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
import { RegisterFormData, RegisterDialogCardProps, countryCodes } from './types/types';

export function RegisterDialogCard({ onSuccess }: RegisterDialogCardProps) {
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [phonePrefix, setPhonePrefix] = useState('+389');
  const {
    register: registerField,
    handleSubmit,
    watch,
    trigger,
    formState: { isSubmitting },
  } = useForm<RegisterFormData>();

  const { register: registerUser } = useAuth();

  const onSubmit = async (data: RegisterFormData) => {
    setError('');
    setNotice('');

    if (!data.birthDate) {
      setError('Please enter your date of birth');
      return;
    }

    const birth = new Date(data.birthDate);
    if (Number.isNaN(birth.getTime())) {
      setError('Invalid date of birth');
      return;
    }

    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    if (age < 10) {
      setError('You must be at least 10 years old to register');
      return;
    }

    const email = data.email?.trim();
    if (!email) {
      setError('Please enter your email');
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!data.password) {
      setError('Please enter a password');
      return;
    }

    if (data.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (data.password !== data.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      await registerUser(email, data.password, data.username, data.birthDate);
      onSuccess?.();
      setNotice('Verification email sent. Check your inbox to confirm your address—you stay signed in.');
    } catch (err: any) {
      setError(err.message || 'Failed to create account. Please try again.');
    }
  };

  return (
    <Card className="w-full border border-border bg-white shadow-2xl dark:bg-zinc-900">
      <CardHeader>
        <CardTitle>Create your profile</CardTitle>
        <CardDescription>Sign up in just a few steps to start posting.</CardDescription>
        {error && (
          <p className="mt-2 rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        {notice && (
          <p className="mt-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-600 dark:text-emerald-400">
            {notice}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <FieldGroup>
            {step === 1 && (
              <>
                <Field>
                  <FieldContent>
                    <FieldTitle>Username</FieldTitle>
                    <FieldDescription>This is how others will see you on X.</FieldDescription>
                    <Input
                      id="username"
                      type="text"
                      placeholder="your_handle"
                      autoComplete="username"
                      {...registerField('username', { required: true })}
                    />
                  </FieldContent>
                </Field>

                <Field>
                  <FieldContent>
                    <FieldTitle>Phone</FieldTitle>
                    <FieldDescription>Add a phone number so friends can find you.</FieldDescription>
                    <div className="flex gap-2">
                      <select
                        className="w-28 rounded-md border border-input bg-background px-2 py-2 text-sm text-foreground shadow-sm"
                        value={phonePrefix}
                        onChange={(e) => setPhonePrefix(e.target.value)}
                      >
                        {/* make it dynamic based on the country code */}
                        {countryCodes.map((country) => (
                          <option key={country.code} value={country.code}>
                            {country.name} +{country.code}
                          </option>
                        ))}
                      </select>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="70 000 000"
                        autoComplete="tel"
                        {...registerField('phone', { required: true })}
                      />
                    </div>
                  </FieldContent>
                </Field>

                <Field>
                  <FieldContent>
                    <FieldTitle>Date of birth</FieldTitle>
                    <FieldDescription>
                      You must be at least 10 years old to use this app.
                    </FieldDescription>
                    <Input
                      id="birthDate"
                      type="date"
                      {...registerField('birthDate', { required: true })}
                    />
                  </FieldContent>
                </Field>
              </>
            )}

            {step === 2 && (
              <>
                <Field>
                  <FieldContent>
                    <FieldTitle>Email</FieldTitle>
                    <FieldDescription>
                      We&apos;ll send confirmations and updates here.
                    </FieldDescription>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      {...registerField('email', { required: true })}
                    />
                  </FieldContent>
                </Field>

                <Field>
                  <FieldContent>
                    <FieldTitle>Password</FieldTitle>
                    <FieldDescription>Use at least 6 characters.</FieldDescription>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      {...registerField('password', {
                        required: true,
                        minLength: 6,
                      })}
                    />
                  </FieldContent>
                </Field>

                <Field>
                  <FieldContent>
                    <FieldTitle>Confirm password</FieldTitle>
                    <FieldDescription>Re-enter your password to confirm.</FieldDescription>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      {...registerField('confirmPassword', { required: true })}
                    />
                  </FieldContent>
                </Field>
              </>
            )}

            <Field>
              <FieldError errors={error ? [{ message: error }] : []} />
            </Field>
          </FieldGroup>

          {step === 1 && (
            <Button
              type="button"
              className="w-full rounded-full text-base font-semibold"
              onClick={async () => {
                setError('');
                const valid = await trigger(['username', 'phone', 'birthDate']);
                if (!valid) return;

                const birthDate = watch('birthDate');
                if (!birthDate) {
                  setError('Please enter your date of birth');
                  return;
                }

                const birth = new Date(birthDate);
                if (Number.isNaN(birth.getTime())) {
                  setError('Invalid date of birth');
                  return;
                }

                const today = new Date();
                let age = today.getFullYear() - birth.getFullYear();
                const m = today.getMonth() - birth.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
                  age--;
                }

                if (age < 10) {
                  setError('You must be at least 10 years old to register');
                  return;
                }

                setStep(2);
              }}
            >
              Next
            </Button>
          )}

          {step === 2 && (
            <div className="flex w-full gap-3">
              <Button
                type="button"
                variant="outline"
                className="w-1/3 rounded-full text-base font-semibold"
                onClick={() => setStep(1)}
                disabled={isSubmitting}
              >
                Back
              </Button>
              <Button
                type="submit"
                className="w-2/3 rounded-full text-base font-semibold"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating profile…' : 'Create profile'}
              </Button>
            </div>
          )}
        </form>
      </CardContent>
      <CardFooter className="justify-center space-x-2 text-sm">
        <span className="text-muted-foreground">Already have an account?</span>
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </CardFooter>
    </Card>
  );
}
