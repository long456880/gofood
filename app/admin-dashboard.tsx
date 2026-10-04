import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiFetch } from '@/lib/api-fetch';
import { useTheme } from '@/lib/theme-context';

const RED = '#D62828';

type ChefRow = {
  chef_id: string;
  chef_name: string;
  sales_count: number;
  gross_revenue: number;
  chef_earnings: number;
  platform_cut: number;
};

type TopRecipe = {
  id: string;
  title: string;
  image_url: string | null;
  chef_name: string;
  sales_count: number;
  gross_revenue: number;
};

type DashboardData = {
  total_revenue: number;
  total_sales: number;
  total_platform_cut: number;
  chefs: ChefRow[];
  top_recipes: TopRecipe[];
};

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await apiFetch('/api/admin/dashboard');
      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      const json = await res.json();
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
    }, [fetchDashboard])
  );

  if (forbidden) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="lock-closed-outline" size={40} color={colors.subtext} />
        <Text style={[styles.deniedText, { color: colors.subtext }]}>
          {t('admin_dashboard_screen.denied')}
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.deniedBtn}>
          <Text style={styles.deniedBtnText}>{t('admin_review_screen.go_back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading || !data) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={RED} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>{t('admin_dashboard_screen.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <Text style={[styles.pageDescription, { color: colors.subtext }]}>
        {t('admin_dashboard_screen.description')}
      </Text>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <Ionicons name="cash-outline" size={20} color={RED} />
          <Text style={[styles.summaryValue, { color: colors.text }]}>${data.total_revenue.toFixed(2)}</Text>
          <Text style={[styles.summaryLabel, { color: colors.subtext }]}>{t('admin_dashboard_screen.total_revenue')}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <Ionicons name="bag-check-outline" size={20} color={RED} />
          <Text style={[styles.summaryValue, { color: colors.text }]}>{data.total_sales}</Text>
          <Text style={[styles.summaryLabel, { color: colors.subtext }]}>{t('admin_dashboard_screen.total_sales')}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <Ionicons name="business-outline" size={20} color={RED} />
          <Text style={[styles.summaryValue, { color: colors.text }]}>${data.total_platform_cut.toFixed(2)}</Text>
          <Text style={[styles.summaryLabel, { color: colors.subtext }]}>{t('admin_dashboard_screen.platform_cut')}</Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('admin_dashboard_screen.chef_breakdown')}</Text>

      {data.chefs.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={44} color={colors.subtext} />
          <Text style={[styles.emptyText, { color: colors.subtext }]}>
            {t('admin_dashboard_screen.no_chefs')}
          </Text>
        </View>
      ) : (
        data.chefs.map((c) => (
          <View key={c.chef_id} style={[styles.chefCard, { backgroundColor: colors.card }]}>
            <View style={styles.chefCardTop}>
              <Text style={[styles.chefName, { color: colors.text }]} numberOfLines={1}>
                {c.chef_name}
              </Text>
              <Text style={[styles.chefRevenue, { color: RED }]}>
                ${c.gross_revenue.toFixed(2)}
              </Text>
            </View>
            <Text style={[styles.chefMeta, { color: colors.subtext }]}>
              {t('admin_dashboard_screen.chef_meta', {
                count: c.sales_count,
                chef: `$${c.chef_earnings.toFixed(2)}`,
                platform: `$${c.platform_cut.toFixed(2)}`,
              })}
            </Text>
          </View>
        ))
      )}

      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('admin_dashboard_screen.top_selling_recipes')}</Text>

      {data.top_recipes.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="stats-chart-outline" size={44} color={colors.subtext} />
          <Text style={[styles.emptyText, { color: colors.subtext }]}>
            {t('admin_dashboard_screen.no_sales')}
          </Text>
        </View>
      ) : (
        data.top_recipes.map((r, index) => (
          <TouchableOpacity
            key={r.id}
            style={[styles.recipeCard, { backgroundColor: colors.card }]}
            onPress={() => router.push(`/recipe/${r.id}`)}
            activeOpacity={0.8}
          >
            <Text style={[styles.rank, { color: colors.subtext }]}>{index + 1}</Text>
            {r.image_url ? (
              <Image source={{ uri: r.image_url }} style={styles.thumb} contentFit="cover" />
            ) : (
              <View style={[styles.thumb, styles.thumbFallback]}>
                <Ionicons name="restaurant-outline" size={20} color={colors.subtext} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.recipeTitle, { color: colors.text }]} numberOfLines={1}>
                {r.title}
              </Text>
              <Text style={[styles.recipeMeta, { color: colors.subtext }]}>
                {t('admin_dashboard_screen.recipe_by_sold', { name: r.chef_name, count: r.sales_count })}
              </Text>
            </View>
            <Text style={[styles.recipeEarnings, { color: RED }]}>
              ${r.gross_revenue.toFixed(2)}
            </Text>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingHorizontal: 40 },
  deniedText: { fontSize: 14, textAlign: 'center' },
  deniedBtn: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: RED },
  deniedBtnText: { color: '#fff', fontWeight: '700' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, marginBottom: 16 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700' },
  pageDescription: { fontSize: 12.5, textAlign: 'center', marginHorizontal: 30, marginBottom: 16, lineHeight: 17 },
  summaryRow: { flexDirection: 'row', gap: 10, marginHorizontal: 20, marginBottom: 22 },
  summaryCard: { flex: 1, borderRadius: 16, padding: 12, alignItems: 'flex-start', gap: 5 },
  summaryValue: { fontSize: 16, fontWeight: '800' },
  summaryLabel: { fontSize: 11 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginHorizontal: 20, marginBottom: 10, marginTop: 4 },
  empty: { alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 20, marginBottom: 20, paddingHorizontal: 40 },
  emptyText: { fontSize: 13, textAlign: 'center' },
  chefCard: { marginHorizontal: 20, marginBottom: 10, borderRadius: 14, padding: 14 },
  chefCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  chefName: { fontSize: 14, fontWeight: '700', flex: 1, marginRight: 8 },
  chefRevenue: { fontSize: 14, fontWeight: '800' },
  chefMeta: { fontSize: 12 },
  recipeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 20, marginBottom: 12, borderRadius: 16, padding: 12 },
  rank: { fontSize: 14, fontWeight: '700', width: 18, textAlign: 'center' },
  thumb: { width: 50, height: 50, borderRadius: 12 },
  thumbFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F0F0' },
  recipeTitle: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  recipeMeta: { fontSize: 12 },
  recipeEarnings: { fontSize: 15, fontWeight: '800' },
});