import { useSignIn } from '@clerk/expo';
import { useState } from 'react';
import { Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { AuthScaffold } from '@/components/auth/AuthScaffold';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrength';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { spacing } from '@/constants/spacing';
import type { ThemeColors } from '@/constants/theme';
import { useThemedStyles, useColors } from '@/lib/appearance';
import { typography } from '@/constants/typography';
import { clerkErrorMessage, clerkFieldMessage } from '@/lib/clerk-errors';
import { scorePassword } from '@/lib/validation';

export default function NewPasswordScreen() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [formErrors, setFormErrors] = useState<{ password?: string; confirm?: string }>({});
  const [submitError, setSubmitError] = useState('');
  const loading = fetchStatus === 'fetching';

  async function submit() {
    const next: typeof formErrors = {};
    if (!password) {
      next.password = 'Enter a new password';
    } else if (scorePassword(password).score < 2) {
      next.password = 'Use at least 8 characters';
    }
    if (!confirm) {
      next.confirm = 'Repeat your password';
    } else if (confirm !== password) {
      next.confirm = 'Passwords do not match';
    }
    setFormErrors(next);
    setSubmitError('');
    if (Object.keys(next).length > 0) {
      return;
    }
    const { error } = await signIn.resetPasswordEmailCode.submitPassword({
      password,
      signOutOfOtherSessions: true,
    });
    if (error) {
      setSubmitError(
        clerkFieldMessage(errors, 'password') ?? clerkErrorMessage(errors, 'Could not update the password.'),
      );
      return;
    }
    if (signIn.status === 'complete') {
      await signIn.finalize({ navigate: async () => undefined });
    }
  }

  return (
    <AuthScaffold>
      <View style={styles.iconWrap}>
        <View style={styles.iconRing}>
          <MaterialIcons name="lock-outline" size={28} color={colors.accent} />
        </View>
      </View>
      <Text style={styles.heading}>Create new password</Text>
      <Text style={styles.sub}>
        Your new password must be different from previous used passwords.
      </Text>
      <Input
        label="New Password"
        placeholder="New password"
        password
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          if (formErrors.password) {
            setFormErrors((current) => ({ ...current, password: undefined }));
          }
        }}
        error={formErrors.password}
      />
      <PasswordStrengthMeter password={password} />
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
      <Button title="Update Password" loading={loading} onPress={() => void submit()} />
      {submitError ? <Text style={styles.sub}>{submitError}</Text> : null}
    </AuthScaffold>
  );
}

const makeStyles = (colors: ThemeColors) => ({
  iconWrap: {
    alignItems: 'center' as const,
    marginBottom: spacing.sm,
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
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
});