import { useSignIn } from '@clerk/expo';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text } from 'react-native';

import { AuthScaffold } from '@/components/auth/AuthScaffold';
import { OtpInput } from '@/components/auth/OtpInput';
import { Button } from '@/components/ui/Button';
import { spacing } from '@/constants/spacing';
import type { ThemeColors } from '@/constants/theme';
import { typography } from '@/constants/typography';
import { useThemedStyles } from '@/lib/appearance';
import { clerkErrorMessage, clerkFieldMessage } from '@/lib/clerk-errors';

const RESEND_SECONDS = 30;

export default function ForgotVerifyScreen() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const styles = useThemedStyles(makeStyles);
  const { email = 'you@email.com' } = useLocalSearchParams<{ email?: string }>();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const loading = fetchStatus === 'fetching';

  useEffect(() => {
    if (seconds <= 0) {
      return;
    }
    const timer = setTimeout(() => setSeconds((current) => current - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  async function submit() {
    if (code.length !== 6) {
      setError('Enter the 6-digit code');
      return;
    }
    const { error: verifyError } = await signIn.resetPasswordEmailCode.verifyCode({ code });
    if (verifyError) {
      setError(clerkFieldMessage(errors, 'code') ?? clerkErrorMessage(errors, 'That code is not valid.'));
      return;
    }
    router.push('/new-password');
  }

  async function resend() {
    if (seconds > 0) {
      return;
    }
    const { error: sendError } = await signIn.resetPasswordEmailCode.sendCode();
    if (sendError) {
      setError(clerkErrorMessage(errors, 'Could not resend the code.'));
      return;
    }
    setSeconds(RESEND_SECONDS);
  }

  return (
    <AuthScaffold
      footer={
        <Pressable disabled={seconds > 0 || loading} onPress={() => void resend()}>
          <Text style={styles.footer}>
            Didn&apos;t receive code?{' '}
            <Text style={[styles.link, seconds > 0 && styles.wait]}>
              {seconds > 0 ? `Resend in ${seconds}s` : 'Resend'}
            </Text>
          </Text>
        </Pressable>
      }>
      <Text style={styles.heading}>Forgot Password</Text>
      <Text style={styles.sub}>Enter the verification code we sent to {email}</Text>
      <OtpInput
        value={code}
        onChange={(next) => {
          setCode(next);
          setError('');
        }}
        error={Boolean(error)}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="Verify Code" loading={loading} onPress={() => void submit()} />
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
  error: {
    ...typography.caption,
    color: colors.danger,
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
  wait: {
    color: colors.textMuted,
  },
});
