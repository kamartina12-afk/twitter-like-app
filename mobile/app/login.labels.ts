export const loginLabels = {
  title: 'Sign in to X',
  description: 'Enter your email and password to continue.',
  email: {
    label: 'Email',
    description: 'Use the email associated with your account.',
    placeholder: 'you@example.com',
    requiredError: 'Please enter your email.',
  },
  password: {
    label: 'Password',
    description: 'Enter your password to sign in.',
    placeholder: '••••••••',
    requiredError: 'Please enter your password.',
  },
  footer: {
    text: "Don't have an account?",
    link: 'Sign up',
  },
  submit: {
    idle: 'Sign in',
    submitting: 'Signing in…',
    genericError: 'Failed to sign in. Please try again.',
    credentialsError: 'Please enter your email and password.',
    resendVerificationIdle: 'Resend verification email',
    resendVerificationSent: 'Verification email sent. Please check your inbox and spam folder.',
    resendVerificationNeedsCredentials: 'Enter your email and password to resend verification.',
  },
  google: {
    idle: 'Continue with Google',
    genericError: 'Failed to sign in with Google. Please try again.',
  },
};

export default function LoginLabelsRoute() {
  return null;
}

