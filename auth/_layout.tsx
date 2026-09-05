import { Stack } from 'expo-router';

import { useColors } from '@/lib/appearance';

export default function AuthLayout() {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'fade',
      }}
      initialRouteName="index"
    />
  );
}
