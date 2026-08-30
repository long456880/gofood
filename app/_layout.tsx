import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { View, ActivityIndicator } from 'react-native';
import { useSession } from '@/lib/supabase';
import { ThemeProvider, useTheme } from '@/lib/theme-context';
import '@/lib/i18n';

function RootNavigation() {
  const { data: session, isPending } = useSession();
  const { dark } = useTheme();

  if (isPending) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: dark ? '#111' : '#fff' }}>
        <ActivityIndicator size="large" color="#D62828" />
      </View>
    );
  }

  return (
    <>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: dark ? '#1E1E1E' : '#FFFFFF' } }}>
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="modal" options={{ headerShown: true, presentation: 'modal', title: 'Modal' }} />
          <Stack.Screen name="recipe/[id]" />
          <Stack.Screen name="edit-profile" />
          
        </Stack.Protected>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="sign-in" />
          <Stack.Screen name="sign-up" />
        </Stack.Protected>
      </Stack>
      <StatusBar style={dark ? 'light' : 'dark'} />
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootNavigation />
    </ThemeProvider>
  );
}