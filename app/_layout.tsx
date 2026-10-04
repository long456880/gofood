import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import BrandLoading from '@/components/BrandLoading';
import { NotificationProvider } from '@/components/NotificationProvider';
import { useSession } from '@/lib/supabase';
import { ThemeProvider, useTheme } from '@/lib/theme-context';
import '@/lib/i18n';

function RootNavigation() {
  const { data: session, event, isPending } = useSession();
  const { dark } = useTheme();

  if (isPending) {
    return (
      <>
        <BrandLoading />
        <StatusBar style="light" />
      </>
    );
  }

  // A password-recovery code creates a real session, so it must be excluded
  // from the normal signed-in guard below or the app would skip straight
  // past the "set new password" screen.
  const isRecovery = event === 'PASSWORD_RECOVERY';

  return (
    <NotificationProvider enabled={!!session && !isRecovery}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: dark ? '#1E1E1E' : '#FFFFFF' } }}>
        <Stack.Protected guard={!!session && !isRecovery}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="recipe/[id]" />
          <Stack.Screen name="edit-profile" />

        </Stack.Protected>
        <Stack.Protected guard={!!session && isRecovery}>
          <Stack.Screen name="new-password" />
        </Stack.Protected>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="welcome" />
          <Stack.Screen name="sign-in" />
          <Stack.Screen name="sign-up" />
          <Stack.Screen name="forgot-password" />
          <Stack.Screen name="forgot-verify" />
        </Stack.Protected>
      </Stack>
      <StatusBar style={dark ? 'light' : 'dark'} />
    </NotificationProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootNavigation />
    </ThemeProvider>
  );
}