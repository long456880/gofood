import { useSignUp } from '@clerk/expo';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AuthScaffold } from '@/components/auth/AuthScaffold';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { spacing } from '@/constants/spacing';
import type { ThemeColors } from '@/constants/theme';
import { fontFamily, typography } from '@/constants/typography';
import { useThemedStyles } from '@/lib/appearance';
import { clerkErrorMessage, clerkFieldMessage } from '@/lib/clerk-errors';
import { maskEmail } from '@/lib/validation';

export default function VerifyEmailScreen() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const styles = useThemedStyles(makeStyles);
  const { email = 'you@email.com' } = useLocalSearchParams<{ email?: string }>();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const loading = fetchStatus === 'fetching';

  async function submit() {
    if (code.replace(/\D/g, '').length !== 6) {
      setError('Enter the 6-digit code');
      return;
    }
    const { error: verifyError } = await signUp.verifications.verifyEmailCode({ code });
    if (verifyError) {
      setError(clerkFieldMessage(errors, 'code') ?? clerkErrorMessage(errors, 'That code is not valid.'));
      return;
    }
    if (signUp.status === 'complete') {
      await signUp.finalize({ navigate: async () => undefined });
      return;
    }
    setError(clerkErrorMessage(errors, 'Could not verify this email.'));
  }

  async function resend() {
    const { error: sendError } = await signUp.verifications.sendEmailCode();
    if (sendError) {
      setError(clerkErrorMessage(errors, 'Could not resend the code.'));
    }
  }

  return (
    <AuthScaffold
      bodyGap={0}
      footer={
        <Text style={styles.footer}>
          Already have an account?{' '}
          <Text style={styles.link} onPress={() => router.replace('/sign-in')}>
            Sign In
          </Text>
        </Text>
      }>
      <View style={styles.header}>
        <Text style={styles.heading}>Check your email</Text>
        <Text style={styles.sub}>
          We&apos;ve sent a code to <Text style={styles.email}>{maskEmail(String(email))}</Text>
        </Text>
      </View>
      <Input
        placeholder="Verification code"
        keyboardType="number-pad"
        maxLength={6}
        value={code}
        onChangeText={(value) => {
          setCode(value.replace(/\D/g, '').slice(0, 6));
          setError('');
        }}
        error={error}
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        style={styles.field}
      />
      <Button title="Verify" onPress={() => void submit()} loading={loading} style={styles.verify} />
      <Pressable onPress={() => void resend()} style={styles.backWrap}>
        <Text style={styles.back}>Resend code</Text>
      </Pressable>
      <Pressable onPress={() => router.back()} style={styles.backWrap}>
        <Text style={styles.back}>Back to sign up</Text>
      </Pressable>
    </AuthScaffold>
  );
}

const makeStyles = (colors: ThemeColors) => ({
  header: {
    alignItems: 'center' as const,
    marginBottom: spacing.xl,
  },
  heading: {
    ...typography.heading,
    color: colors.textPrimary,
    fontSize: 36,
    lineHeight: 42,
    textAlign: 'center' as const,
  },
  sub: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center' as const,
    marginTop: 10,
  },
  email: {
    color: colors.textPrimary,
    fontFamily: fontFamily.heading,
  },
  field: {
    marginBottom: spacing.md,
  },
  verify: {
    minHeight: 54,
  },
  backWrap: {
    alignItems: 'center' as const,
    marginTop: spacing.lg,
  },
  back: {
    ...typography.body,
    color: colors.accent,
    textAlign: 'center' as const,
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
});
