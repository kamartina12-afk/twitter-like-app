export const registerLabels = {
  title: 'Create your profile',
  description: 'Sign up in a few steps to start posting.',
  steps: {
    profile: 'Profile',
    account: 'Account',
  },
  username: {
    label: 'Username',
    description: 'This is how others will see you on X.',
    placeholder: 'your_handle',
    requiredError: 'Please enter a username.',
  },
  phone: {
    label: 'Phone',
    description: 'Add a phone number so friends can find you.',
    prefixPlaceholder: '+389',
    placeholder: '70 000 000',
    requiredError: 'Please enter your phone number.',
  },
  birthDate: {
    label: 'Date of birth',
    description: 'You must be at least 10 years old to use this app.',
    placeholder: 'Select your date of birth',
    tapHint: 'Tap to choose date',
    changeHint: 'Tap to change date',
    modalTitle: 'Select date of birth',
    cancelLabel: 'Cancel',
    confirmLabel: 'Confirm',
    requiredError: 'Please enter your date of birth.',
    invalidError: 'Invalid date of birth.',
    tooYoungError: 'You must be at least 10 years old to register.',
  },
  email: {
    label: 'Email',
    description: "We'll send confirmations and updates here.",
    placeholder: 'you@example.com',
    requiredError: 'Please enter your email.',
    invalidError: 'Please enter a valid email address.',
  },
  password: {
    label: 'Password',
    description: 'Use at least 6 characters.',
    placeholder: '••••••••',
    requiredError: 'Please enter a password.',
    tooShortError: 'Password must be at least 6 characters.',
  },
  confirmPassword: {
    label: 'Confirm password',
    description: 'Re-enter your password to confirm.',
    placeholder: '••••••••',
    requiredError: 'Please confirm your password.',
    mismatchError: 'Passwords do not match.',
  },
  footer: {
    text: 'Already have an account?',
    link: 'Sign in',
  },
  submit: {
    next: 'Next',
    back: 'Back',
    idle: 'Create profile',
    submitting: 'Creating profile…',
    genericError: 'Failed to create account. Please try again.',
    verifyEmailSent:
      'Verification email sent. Check your inbox to confirm your address. You are signed in.',
    resendVerificationIdle: 'Resend verification email',
    resendVerificationNeedsCredentials:
      'Enter your email and password first to resend the verification email.',
    resendVerificationSent: 'Verification email sent again. Please check your inbox and spam folder.',
  },
};

export default function RegisterLabelsRoute() {
  return null;
}

