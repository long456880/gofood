import { useSignUp } from '@clerk/expo';
import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { AuthScaffold } from '@/components/auth/AuthScaffold';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { OrDivider } from '@/components/auth/OrDivider';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Toast } from '@/components/ui/Toast';
import { spacing } from '@/constants/spacing';
import type { ThemeColors } from '@/constants/theme';
import { fontFamily, typography } from '@/constants/typography';
import { useThemedStyles } from '@/lib/appearance';
import { clerkErrorMessage, clerkFieldMessage } from '@/lib/clerk-errors';
import { useGoogleAuth } from '@/lib/google-sso';
import { isValidEmail, scorePassword } from '@/lib/validation';

export default function SignUpScreen() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const { signInWithGoogle, loading: googleLoading } = useGoogleAuth();
  const styles = useThemedStyles(makeStyles);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [toast, setToast] = useState('');
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirm?: string;
  }>({});
  const loading = fetchStatus === 'fetching';

  function validate() {
    const next: typeof formErrors = {};
    if (!name.trim()) {
      next.name = 'Enter your display name';
    }
    if (!email.trim()) {
      next.email = 'Enter your email';
    } else if (!isValidEmail(email)) {
      next.email = 'Enter a valid email';
    }
    if (!password) {
      next.password = 'Create a password';
    } else if (scorePassword(password).score < 2) {
      next.password = 'Use at least 8 characters';
    }
    if (!confirm) {
      next.confirm = 'Repeat your password';
    } else if (confirm !== password) {
      next.confirm = 'Passwords do not match';
    }
    setFormErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit() {
    if (!validate()) {
      return;
    }
    const { error } = await signUp.password({
      emailAddress: email.trim(),
      password,
      firstName: name.trim(),
    });
    if (error) {
      setToast(clerkErrorMessage(errors, 'Could not create the account.'));
      return;
    }
    const verify = await signUp.verifications.sendEmailCode();
    if (verify.error) {
      setToast(clerkErrorMessage(errors, 'Could not send the verification code.'));
      return;
    }
    router.push({ pathname: '/verify-email', params: { email: email.trim() } });
  }

  return (
    <AuthScaffold
      bodyGap={0}
      footer={
        <>
          <Text style={styles.footer}>
            Already have an account?{' '}
            <Text style={styles.link} onPress={() => router.replace('/sign-in')}>
              Sign In
            </Text>
          </Text>
          <Text style={styles.legal}>
            By joining, you agree to our <Text style={styles.legalLink}>Terms</Text> and{' '}
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </Text>
        </>
      }>
      <Text style={styles.heading}>
        Join Post<Text style={styles.accent}>MyFood</Text>
      </Text>
      <Text style={styles.sub}>Start sharing your taste today.</Text>
      <View style={styles.form}>
        <Input
          label="Display Name"
          placeholder="Username"
          autoCapitalize="words"
          value={name}
          onChangeText={(value) => {
            setName(value);
            if (formErrors.name) {
              setFormErrors((current) => ({ ...current, name: undefined }));
            }
          }}
          error={formErrors.name}
        />
        <Input
          label="Email"
          placeholder="Email Address"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            if (formErrors.email) {
              setFormErrors((current) => ({ ...current, email: undefined }));
            }
          }}
          error={formErrors.email ?? clerkFieldMessage(errors, 'emailAddress')}
        />
        <Input
          label="Password"
          placeholder="Create Password"
          password
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            if (formErrors.password) {
              setFormErrors((current) => ({ ...current, password: undefined }));
            }
          }}
          error={formErrors.password ?? clerkFieldMessage(errors, 'password')}
        />
        <Input
          label="Confirm Password"
          placeholder="Repeat Password"
          password
          value={confirm}
          onChangeText={(value) => {
            setConfirm(value);
            if (formErrors.confirm) {
              setFormErrors((current) => ({ ...current, confirm: undefined }));
            }
          }}
          error={formErrors.confirm}
        />
      </View>
      <Button title="Create Account" style={styles.cta} loading={loading} onPress={() => void submit()} />
      <OrDivider />
      <GoogleButton
        title="Sign in with Google"
        disabled={googleLoading}
        onPress={() => {
          void signInWithGoogle().then((result) => {
            if (result.error) {
              setToast(result.error);
            }
          });
        }}
      />
      <Toast visible={Boolean(toast)} message={toast} onHide={() => setToast('')} />
    </AuthScaffold>
  );
}

const makeStyles = (colors: ThemeColors) => ({
  heading: {
    ...typography.heading,
    color: colors.textPrimary,
    fontSize: 36,
    lineHeight: 42,
  },
  accent: {
    color: colors.accent,
  },
  sub: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: 6,
    marginBottom: spacing.xl,
  },
  form: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  cta: {
    minHeight: 54,
    marginBottom: spacing.md,
  },
  footer: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center' as const,
  },
  link: {
    color: colors.accent,
    textDecorationLine: 'underline' as const,
    fontFamily: fontFamily.heading,
  },
  legal: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center' as const,
  },
  legalLink: {
    textDecorationLine: 'underline' as const,
    color: colors.textSecondary,
  },
});
