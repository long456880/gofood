import { Tabs, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiFetch } from '@/lib/api-fetch';
import { useSession } from '@/lib/supabase';
import { useTheme } from '@/lib/theme-context';
import { useTranslation } from 'react-i18next';
const RED = '#D62828';
const ADMIN_EMAIL = 'feihengkimborat@gmail.com';
export default function TabLayout() {
  const { colors, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { data: session } = useSession();
  const [accountType, setAccountType] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      apiFetch('/api/profile')
        .then((res) => res.json())
        .then((data) => setAccountType(data.account_type ?? null))
        .catch(() => {});
    }, [])
  );

  const isAdmin = session?.user.email === ADMIN_EMAIL;
  const isChef = accountType === 'chef';

  // Chefs get their dashboard merged into the Home tab, so the separate
  // Dashboard tab is only needed for admin tools.
  const showDashboardTab = isAdmin;
  // Favorites (saving recipes to cook) is a home-cook feature — chefs and
  // admins don't browse/save recipes through this account.
  const showFavoritesTab = !isChef && !isAdmin;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: RED,
        tabBarInactiveTintColor: colors.subtext,
        tabBarStyle: {
          backgroundColor: dark ? '#1E1E1E' : '#FFFFFF',
          borderTopWidth: 0,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          height: 68 + insets.bottom,
          paddingTop: 10,
          paddingBottom: insets.bottom,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: dark ? 0.3 : 0.08,
          shadowRadius: 12,
          elevation: 12,
        },
        tabBarItemStyle: {
          paddingTop: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10.5,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={23} color={color} />
          ),
          tabBarLabel: ({ color, focused }) => (
            <Text numberOfLines={1} style={{ fontSize: 10.5, fontWeight: focused ? '700' : '500', color }}>
              {t('tabs.home')}
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          href: showFavoritesTab ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'heart' : 'heart-outline'} size={23} color={color} />
          ),
          tabBarLabel: ({ color, focused }) => (
            <Text numberOfLines={1} style={{ fontSize: 10.5, fontWeight: focused ? '700' : '500', color }}>
              {t('tabs.favorites')}
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          href: showDashboardTab ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={23} color={color} />
          ),
          tabBarLabel: ({ color, focused }) => (
            <Text numberOfLines={1} style={{ fontSize: 10.5, fontWeight: focused ? '700' : '500', color }}>
              {t('tabs.dashboard')}
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={23} color={color} />
          ),
          tabBarLabel: ({ color, focused }) => (
            <Text numberOfLines={1} style={{ fontSize: 10.5, fontWeight: focused ? '700' : '500', color }}>
              {t('tabs.profile')}
            </Text>
          ),
        }}
      />
    </Tabs>
  );
}