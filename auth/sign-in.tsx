import { useSignIn } from '@clerk/expo';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';

import { AuthScaffold } from '@/components/auth/AuthScaffold';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { OrDivider } from '@/components/auth/OrDivider';
import { LogoMark } from '@/components/brand/LogoMark';
import { Wordmark } from '@/components/brand/Wordmark';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Toast } from '@/components/ui/Toast';
import { spacing } from '@/constants/spacing';
import type { ThemeColors } from '@/constants/theme';
import { fontFamily, typography } from '@/constants/typography';
import { useThemedStyles } from '@/lib/appearance';
import { clerkErrorMessage, clerkFieldMessage } from '@/lib/clerk-errors';
import { useGoogleAuth } from '@/lib/google-sso';
import { useT } from '@/lib/i18n';
import { isValidEmail } from '@/lib/validation';

export default function SignInScreen() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const { signInWithGoogle, loading: googleLoading } = useGoogleAuth();
  const styles = useThemedStyles(makeStyles);
  const t = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formErrors, setFormErrors] = useState<{ email?: string; password?: string }>({});
  const [toast, setToast] = useState('');
  const loading = fetchStatus === 'fetching';

  async function onGoogle() {
    const result = await signInWithGoogle();
    if (result.error) {
      setToast(result.error);
    }
  }

  function validate() {
    const next: typeof formErrors = {};
    if (!email.trim()) {
      next.email = t('enterEmail');
    } else if (!isValidEmail(email)) {
      next.email = t('enterValidEmail');
    }
    if (!password) {
      next.password = t('enterPassword');
    }
    setFormErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit() {
    if (!validate()) {
      return;
    }
    const { error } = await signIn.password({
      emailAddress: email.trim(),
      password,
    });
    if (error) {
      setToast(clerkErrorMessage(errors, t('enterValidEmail')));
      return;
    }
    if (signIn.status === 'complete') {
      await signIn.finalize({ navigate: async () => undefined });
      return;
    }
    setToast(clerkErrorMessage(errors, 'Could not sign in. Check email and password.'));
  }

  const emailError = formErrors.email ?? clerkFieldMessage(errors, 'identifier');
  const passwordError = formErrors.password ?? clerkFieldMessage(errors, 'password');

  return (
    <AuthScaffold
      bodyGap={0}
      footer={
        <Text style={styles.footer}>
          {t('noAccount')}{' '}
          <Text style={styles.link} onPress={() => router.push('/sign-up')}>
            {t('signUp')}
          </Text>
        </Text>
      }>
      <View style={styles.brand}>
        <LogoMark size={88} />
        <Wordmark size={27} accent="myfood" style={styles.wordmark} />
        <Text style={styles.heading}>{t('welcomeBack')}</Text>
        <Text style={styles.sub}>{t('accessCulinary')}</Text>
      </View>
      <View style={styles.form}>
        <Input
          label={t('email')}
          placeholder="Hello@gmail.com"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            if (formErrors.email) {
              setFormErrors((current) => ({ ...current, email: undefined }));
            }
          }}
          error={emailError}
        />
        <Input
          label={t('password')}
          placeholder={t('password')}
          password
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            if (formErrors.password) {
              setFormErrors((current) => ({ ...current, password: undefined }));
            }
          }}
          error={passwordError}
        />
        <Pressable onPress={() => router.push('/forgot-password')} style={styles.forgotWrap}>
          <Text style={styles.forgot}>{t('forgotPassword')}</Text>
        </Pressable>
      </View>
      <Button title={t('signIn')} onPress={() => void submit()} loading={loading} style={styles.signIn} />
      <OrDivider />
      <GoogleButton
        title={t('signInGoogle')}
        disabled={googleLoading}
        onPress={() => void onGoogle()}
      />
      <Toast visible={Boolean(toast)} message={toast} onHide={() => setToast('')} />
    </AuthScaffold>
  );
}

const makeStyles = (colors: ThemeColors) => ({
  brand: {
    alignItems: 'center' as const,
    marginBottom: spacing.xl,
  },
  wordmark: {
    marginTop: 2,
    lineHeight: 32,
  },
  heading: {
    ...typography.heading,
    color: colors.textPrimary,
    fontSize: 36,
    lineHeight: 42,
    textAlign: 'center' as const,
    marginTop: 2,
  },
  sub: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center' as const,
    marginTop: 4,
  },
  form: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  forgotWrap: {
    alignSelf: 'flex-end' as const,
    marginTop: -4,
  },
  forgot: {
    ...typography.caption,
    color: '#E8A0A8',
    fontSize: 13,
  },
  signIn: {
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
    fontFamily: fontFamily.heading,
    textDecorationLine: 'underline' as const,
  },
});
