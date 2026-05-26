import React, { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import { Link, Redirect } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import DateTimePicker from '@react-native-community/datetimepicker';

import Input from '@/components/Input/Input';
import { AuthCard } from '@/components/auth/AuthCard';
import { AuthScreenContainer } from '@/components/auth/AuthScreenContainer';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useAuth } from '@/contexts/AuthContext';
import { registerLabels } from './register.labels';
import { registerStyles } from './register.styles';
import type { RegisterFormValues } from '@/types/register.types';

export default function RegisterScreen() {
  const { register, resendVerificationEmail, isAuthenticated } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [pendingBirthDate, setPendingBirthDate] = useState<Date>(new Date());
  const [notice, setNotice] = useState('');
  const [canResendVerification, setCanResendVerification] = useState(false);

  const {
    control,
    handleSubmit,
    setError,
    watch,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    defaultValues: {
      username: '',
      phonePrefix: '+389',
      phone: '',
      birthDate: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const selectedBirthDate = watch('birthDate');
  const formattedBirthDate = useMemo(() => {
    if (!selectedBirthDate) return '';
    const parsed = new Date(selectedBirthDate);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, [selectedBirthDate]);
  const selectedBirthDateValue = useMemo(() => {
    if (!selectedBirthDate) return new Date();
    const parsed = new Date(selectedBirthDate);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }, [selectedBirthDate]);

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  const onSubmit = async (values: RegisterFormValues) => {
    setNotice('');
    setCanResendVerification(false);
    const trimmedUsername = values.username.trim();
    const trimmedPhone = values.phone.trim();
    const trimmedBirthDate = values.birthDate.trim();
    const trimmedEmail = values.email.trim();

    if (!trimmedUsername) {
      setError('username', {
        type: 'manual',
        message: registerLabels.username.requiredError,
      });
      return;
    }

    if (!trimmedBirthDate) {
      setError('birthDate', {
        type: 'manual',
        message: registerLabels.birthDate.requiredError,
      });
      return;
    }

    const birth = new Date(trimmedBirthDate);
    if (Number.isNaN(birth.getTime())) {
      setError('birthDate', {
        type: 'manual',
        message: registerLabels.birthDate.invalidError,
      });
      return;
    }

    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age -= 1;
    }

    if (age < 10) {
      setError('birthDate', {
        type: 'manual',
        message: registerLabels.birthDate.tooYoungError,
      });
      return;
    }

    if (!trimmedPhone) {
      setError('phone', {
        type: 'manual',
        message: registerLabels.phone.requiredError,
      });
      return;
    }

    if (!trimmedEmail) {
      setError('email', {
        type: 'manual',
        message: registerLabels.email.requiredError,
      });
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(trimmedEmail)) {
      setError('email', {
        type: 'manual',
        message: registerLabels.email.invalidError,
      });
      return;
    }

    if (!values.password) {
      setError('password', {
        type: 'manual',
        message: registerLabels.password.requiredError,
      });
      return;
    }

    if (values.password.length < 6) {
      setError('password', {
        type: 'manual',
        message: registerLabels.password.tooShortError,
      });
      return;
    }

    if (!values.confirmPassword) {
      setError('confirmPassword', {
        type: 'manual',
        message: registerLabels.confirmPassword.requiredError,
      });
      return;
    }

    if (values.password !== values.confirmPassword) {
      setError('confirmPassword', {
        type: 'manual',
        message: registerLabels.confirmPassword.mismatchError,
      });
      return;
    }

    try {
      await register(trimmedEmail, values.password, trimmedUsername, trimmedBirthDate);
      setError('root', { type: 'manual', message: '' });
      setNotice(registerLabels.submit.verifyEmailSent);
      setCanResendVerification(true);
    } catch (e: any) {
      setError('root', {
        type: 'manual',
        message: e?.message || registerLabels.submit.genericError,
      });
    }
  };

  const onResendVerification = async () => {
    setNotice('');
    const trimmedEmail = watch('email')?.trim();
    const password = watch('password');

    if (!trimmedEmail || !password) {
      setError('root', {
        type: 'manual',
        message: registerLabels.submit.resendVerificationNeedsCredentials,
      });
      return;
    }

    try {
      await resendVerificationEmail(trimmedEmail, password);
      setError('root', { type: 'manual', message: '' });
      setNotice(registerLabels.submit.resendVerificationSent);
    } catch (e: any) {
      setError('root', {
        type: 'manual',
        message: e?.message || registerLabels.submit.genericError,
      });
    }
  };

  const formatBirthDate = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const openBirthDatePicker = () => {
    setPendingBirthDate(selectedBirthDateValue);
    setIsDatePickerVisible(true);
  };

  const confirmBirthDateSelection = (onChange: (value: string) => void) => {
    onChange(formatBirthDate(pendingBirthDate));
    setIsDatePickerVisible(false);
  };

  const onNextStep = async () => {
    setError('root', { type: 'manual', message: '' });
    const valid = await trigger(['birthDate']);
    if (!valid) return;

    const currentUsername = watch('username')?.trim();
    const currentPhone = watch('phone')?.trim();
    const currentBirthDate = watch('birthDate');

    if (!currentUsername) {
      setError('username', {
        type: 'manual',
        message: registerLabels.username.requiredError,
      });
      return;
    }

    if (!currentPhone) {
      setError('phone', {
        type: 'manual',
        message: registerLabels.phone.requiredError,
      });
      return;
    }

    if (!currentBirthDate) {
      setError('birthDate', {
        type: 'manual',
        message: registerLabels.birthDate.requiredError,
      });
      return;
    }

    const birth = new Date(currentBirthDate);
    if (Number.isNaN(birth.getTime())) {
      setError('birthDate', {
        type: 'manual',
        message: registerLabels.birthDate.invalidError,
      });
      return;
    }

    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age -= 1;
    }
    if (age < 10) {
      setError('birthDate', {
        type: 'manual',
        message: registerLabels.birthDate.tooYoungError,
      });
      return;
    }

    setStep(2);
  };

  return (
    <AuthScreenContainer variant="register">
      <AuthCard
        title={registerLabels.title}
        description={registerLabels.description}
        footer={
          <View style={registerStyles.footerRow}>
            <Text style={registerStyles.footerText}>{registerLabels.footer.text}</Text>
            <Link href="../login" style={registerStyles.footerLink}>
              {registerLabels.footer.link}
            </Link>
          </View>
        }
      >
        <View style={registerStyles.stepRow}>
          <View style={[registerStyles.stepChip, step === 1 && registerStyles.stepChipActive]}>
            <Text
              style={[registerStyles.stepChipText, step === 1 && registerStyles.stepChipTextActive]}
            >
              {registerLabels.steps.profile}
            </Text>
          </View>
          <View style={[registerStyles.stepChip, step === 2 && registerStyles.stepChipActive]}>
            <Text
              style={[registerStyles.stepChipText, step === 2 && registerStyles.stepChipTextActive]}
            >
              {registerLabels.steps.account}
            </Text>
          </View>
        </View>

        {step === 1 && (
          <>
            <View style={registerStyles.fieldGroup}>
              <Text style={registerStyles.label}>{registerLabels.username.label}</Text>
              <Text style={registerStyles.labelDescription}>{registerLabels.username.description}</Text>
              <Controller
                control={control}
                name="username"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder={registerLabels.username.placeholder}
                    placeholderTextColor="#64748b"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                )}
              />
              {errors.username && (
                <Text style={registerStyles.errorText}>{errors.username.message as string}</Text>
              )}
            </View>

            <View style={registerStyles.fieldGroup}>
              <Text style={registerStyles.label}>{registerLabels.phone.label}</Text>
              <Text style={registerStyles.labelDescription}>{registerLabels.phone.description}</Text>
              <View style={registerStyles.phoneRow}>
                <Controller
                  control={control}
                  name="phonePrefix"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder={registerLabels.phone.prefixPlaceholder}
                      placeholderTextColor="#475569"
                      keyboardType="phone-pad"
                      selectionColor="#0f172a"
                      style={registerStyles.phonePrefixInput}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="phone"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder={registerLabels.phone.placeholder}
                      placeholderTextColor="#64748b"
                      keyboardType="phone-pad"
                      autoCorrect={false}
                      selectionColor="#0f172a"
                      style={registerStyles.phoneInput}
                    />
                  )}
                />
              </View>
              {errors.phone && <Text style={registerStyles.errorText}>{errors.phone.message as string}</Text>}
            </View>

            <View style={registerStyles.fieldGroup}>
              <Text style={registerStyles.label}>{registerLabels.birthDate.label}</Text>
              <Text style={registerStyles.labelDescription}>{registerLabels.birthDate.description}</Text>
              <Controller
                control={control}
                name="birthDate"
                render={({ field: { onChange, value } }) => (
                  <>
                    <Pressable
                      onPress={openBirthDatePicker}
                      style={({ pressed }) => [
                        registerStyles.datePickerButton,
                        !!errors.birthDate && registerStyles.datePickerButtonError,
                        pressed && registerStyles.datePickerButtonPressed,
                      ]}
                    >
                      <View style={registerStyles.datePickerButtonInner}>
                        <View style={registerStyles.datePickerLeading}>
                          <Text style={registerStyles.datePickerLeadingIcon}>DOB</Text>
                        </View>
                        <View style={registerStyles.datePickerCopy}>
                          <Text
                            style={[
                              registerStyles.datePickerButtonText,
                              !value && registerStyles.datePickerButtonTextPlaceholder,
                            ]}
                          >
                            {formattedBirthDate || registerLabels.birthDate.placeholder}
                          </Text>
                          <Text style={registerStyles.datePickerHint}>
                            {value ? registerLabels.birthDate.changeHint : registerLabels.birthDate.tapHint}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                    {Platform.OS === 'android' && isDatePickerVisible && (
                      <DateTimePicker
                        value={pendingBirthDate}
                        mode="date"
                        display="default"
                        maximumDate={new Date()}
                        onChange={(event, date) => {
                          if (event.type === 'dismissed') {
                            setIsDatePickerVisible(false);
                            return;
                          }
                          if (!date) return;
                          onChange(formatBirthDate(date));
                          setIsDatePickerVisible(false);
                        }}
                      />
                    )}
                    {Platform.OS === 'ios' && (
                      <Modal visible={isDatePickerVisible} transparent animationType="fade">
                        <Pressable
                          style={registerStyles.pickerBackdrop}
                          onPress={() => confirmBirthDateSelection(onChange)}
                        >
                          <Pressable
                            style={registerStyles.pickerSheet}
                            onPress={(event) => event.stopPropagation()}
                          >
                            <Text style={registerStyles.pickerTitle}>
                              {registerLabels.birthDate.modalTitle}
                            </Text>
                            <DateTimePicker
                              value={pendingBirthDate}
                              mode="date"
                              display="spinner"
                              themeVariant="light"
                              textColor="#0f172a"
                              maximumDate={new Date()}
                              onChange={(_, date) => {
                                if (date) setPendingBirthDate(date);
                              }}
                            />
                            <View style={registerStyles.pickerActions}>
                              <PrimaryButton
                                label={registerLabels.birthDate.cancelLabel}
                                onPress={() => setIsDatePickerVisible(false)}
                                variant="outline"
                                style={registerStyles.pickerAction}
                              />
                              <PrimaryButton
                                label={registerLabels.birthDate.confirmLabel}
                                onPress={() => confirmBirthDateSelection(onChange)}
                                style={registerStyles.pickerAction}
                              />
                            </View>
                          </Pressable>
                        </Pressable>
                      </Modal>
                    )}
                  </>
                )}
              />
              {errors.birthDate && (
                <Text style={registerStyles.errorText}>{errors.birthDate.message as string}</Text>
              )}
            </View>
          </>
        )}

        {step === 2 && (
          <>
            <View style={registerStyles.fieldGroup}>
              <Text style={registerStyles.label}>{registerLabels.email.label}</Text>
              <Text style={registerStyles.labelDescription}>{registerLabels.email.description}</Text>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder={registerLabels.email.placeholder}
                    placeholderTextColor="#64748b"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                  />
                )}
              />
              {errors.email && <Text style={registerStyles.errorText}>{errors.email.message as string}</Text>}
            </View>

            <View style={registerStyles.fieldGroup}>
              <Text style={registerStyles.label}>{registerLabels.password.label}</Text>
              <Text style={registerStyles.labelDescription}>{registerLabels.password.description}</Text>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder={registerLabels.password.placeholder}
                    placeholderTextColor="#64748b"
                    secureTextEntry
                  />
                )}
              />
              {errors.password && (
                <Text style={registerStyles.errorText}>{errors.password.message as string}</Text>
              )}
            </View>

            <View style={registerStyles.fieldGroup}>
              <Text style={registerStyles.label}>{registerLabels.confirmPassword.label}</Text>
              <Text style={registerStyles.labelDescription}>
                {registerLabels.confirmPassword.description}
              </Text>
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder={registerLabels.confirmPassword.placeholder}
                    placeholderTextColor="#64748b"
                    secureTextEntry
                  />
                )}
              />
              {errors.confirmPassword && (
                <Text style={registerStyles.errorText}>
                  {errors.confirmPassword.message as string}
                </Text>
              )}
            </View>
          </>
        )}

        {errors.root?.message ? (
          <Text style={registerStyles.errorText}>{errors.root.message as string}</Text>
        ) : null}
        {notice ? <Text style={registerStyles.successText}>{notice}</Text> : null}

        {step === 1 ? (
          <PrimaryButton label={registerLabels.submit.next} onPress={onNextStep} />
        ) : (
          <View style={registerStyles.actionsGroup}>
            <View style={registerStyles.actionRow}>
              <PrimaryButton
                label={registerLabels.submit.back}
                onPress={() => setStep(1)}
                variant="outline"
                style={registerStyles.actionBack}
                disabled={isSubmitting}
              />
              <PrimaryButton
                label={isSubmitting ? registerLabels.submit.submitting : registerLabels.submit.idle}
                onPress={handleSubmit(onSubmit)}
                loading={isSubmitting}
                style={registerStyles.actionSubmit}
              />
            </View>
            {canResendVerification ? (
              <PrimaryButton
                label={registerLabels.submit.resendVerificationIdle}
                onPress={onResendVerification}
                variant="outline"
                style={registerStyles.resendButton}
                disabled={isSubmitting}
              />
            ) : null}
          </View>
        )}
      </AuthCard>
    </AuthScreenContainer>
  );
}

