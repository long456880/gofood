import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiFetch } from '@/lib/api-fetch';
import { useSession } from '@/lib/supabase';
import { useTheme } from '@/lib/theme-context';
import { useTranslation } from 'react-i18next';

const RED = '#D62828';
const ADMIN_EMAIL = 'feihengkimborat@gmail.com';

export default function DashboardScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { data: session } = useSession();
  const [accountType, setAccountType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      apiFetch('/api/profile')
        .then((res) => res.json())
        .then((data) => setAccountType(data.account_type ?? null))
        .finally(() => setLoading(false));
    }, [])
  );

  const isChef = accountType === 'chef';
  const isAdmin = session?.user.email === ADMIN_EMAIL;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={RED} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={{ paddingTop: insets.top + 20, paddingHorizontal: 20, marginBottom: 16 }}>
        <Text style={[styles.title, { color: colors.text }]}>{t('tabs.dashboard')}</Text>
      </View>

      {isChef && (
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/upload-recipe')} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: '#FDEDEC' }]}>
              <Ionicons name="add-circle-outline" size={18} color={RED} />
            </View>
            <Text style={[styles.menuText, { color: colors.text }]}>{t('profile.upload_recipe')}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/my-recipes')} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: '#FDEDEC' }]}>
              <Ionicons name="list-outline" size={18} color={RED} />
            </View>
            <Text style={[styles.menuText, { color: colors.text }]}>{t('profile.my_recipes')}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/chef-dashboard')} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: '#FDEDEC' }]}>
              <Ionicons name="stats-chart-outline" size={18} color={RED} />
            </View>
            <Text style={[styles.menuText, { color: colors.text }]}>{t('profile.sales_dashboard')}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
          </TouchableOpacity>
        </View>
      )}

      {isAdmin && (
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/admin-review')} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: '#F2C9C8' }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#8B1A1A" />
            </View>
            <Text style={[styles.menuText, { color: colors.text }]}>{t('profile.review_recipes')}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/admin-dashboard')} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: '#F2C9C8' }]}>
              <Ionicons name="bar-chart-outline" size={18} color="#8B1A1A" />
            </View>
            <Text style={[styles.menuText, { color: colors.text }]}>{t('profile.admin_dashboard')}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold' },
  card: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: { flex: 1, fontSize: 15 },
  divider: { height: 1, marginLeft: 48, marginVertical: 2 },
});
