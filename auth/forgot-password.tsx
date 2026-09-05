import { useSignIn } from '@clerk/expo';
import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { AuthScaffold } from '@/components/auth/AuthScaffold';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { spacing } from '@/constants/spacing';
import type { ThemeColors } from '@/constants/theme';
import { typography } from '@/constants/typography';
import { useThemedStyles } from '@/lib/appearance';
import { clerkErrorMessage, clerkFieldMessage } from '@/lib/clerk-errors';
import { isValidEmail } from '@/lib/validation';

export default function ForgotPasswordScreen() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const styles = useThemedStyles(makeStyles);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const loading = fetchStatus === 'fetching';

  async function submit() {
    if (!email.trim()) {
      setError('Enter your email');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Enter a valid email');
      return;
    }
    const { error: createError } = await signIn.create({
      identifier: email.trim(),
    });
    if (createError) {
      setError(clerkFieldMessage(errors, 'identifier') ?? clerkErrorMessage(errors, 'Could not find that email.'));
      return;
    }
    const { error: sendError } = await signIn.resetPasswordEmailCode.sendCode();
    if (sendError) {
      setError(clerkErrorMessage(errors, 'Could not send the reset code.'));
      return;
    }
    router.push({ pathname: '/forgot-verify', params: { email: email.trim() } });
  }

  return (
    <AuthScaffold
      footer={
        <Text style={styles.footer}>
          Remember your password?{' '}
          <Text style={styles.link} onPress={() => router.replace('/sign-in')}>
            Login
          </Text>
        </Text>
      }>
      <Text style={styles.heading}>Forgot Password</Text>
      <Text style={styles.sub}>Enter your email to receive a reset code.</Text>
      <Input
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          setError('');
        }}
        error={error}
      />
      <Button title="Send Reset Code" loading={loading} onPress={() => void submit()} />
    </AuthScaffold>
  );
}

const makeStyles = (colors: ThemeColors) => ({
  heading: {
    ...typography.heading,
    color: colors.textPrimary,
    textAlign: 'center' as const,
  },
  sub: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center' as const,
    marginBottom: spacing.sm,
  },
  footer: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center' as const,
  },
  link: {
    color: colors.accent,
    fontFamily: typography.heading.fontFamily,
  },
});
