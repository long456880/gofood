import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/theme-context';
import { useTranslation } from 'react-i18next';

const RED = '#D62828';

// This tab is only ever shown to the admin account (see the tab layout's
// showDashboardTab), so it's admin-only tools here. Upload Recipe, My
// Recipes and Sales are the chef's own tools and already live on the Home
// tab for chef accounts — keeping both copies just duplicated navigation.
export default function DashboardScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={{ paddingTop: insets.top + 20, paddingHorizontal: 20, marginBottom: 16 }}>
        <Text style={[styles.title, { color: colors.text }]}>{t('tabs.dashboard')}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/admin-review')} activeOpacity={0.7}>
          <View style={styles.menuIcon}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#8B1A1A" />
          </View>
          <Text style={[styles.menuText, { color: colors.text }]}>{t('profile.review_recipes')}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/admin-dashboard')} activeOpacity={0.7}>
          <View style={styles.menuIcon}>
            <Ionicons name="bar-chart-outline" size={18} color="#8B1A1A" />
          </View>
          <Text style={[styles.menuText, { color: colors.text }]}>{t('profile.admin_dashboard')}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/admin-support')} activeOpacity={0.7}>
          <View style={styles.menuIcon}>
            <Ionicons name="chatbubbles-outline" size={18} color="#8B1A1A" />
          </View>
          <Text style={[styles.menuText, { color: colors.text }]}>{t('support_screen.inbox_title')}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
        </TouchableOpacity>
      </View>

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
