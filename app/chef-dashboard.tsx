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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiFetch } from '@/lib/api-fetch';
import { useTheme } from '@/lib/theme-context';

const RED = '#D62828';

type RecipeSales = {
  id: string;
  title: string;
  image_url: string | null;
  price_usd: number | string | null;
  sales_count: number;
  gross_revenue: number;
  your_earnings: number;
};

type DashboardData = {
  total_earnings: number;
  total_sales: number;
  recipes: RecipeSales[];
};

export default function ChefDashboardScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await apiFetch('/api/chef/dashboard');
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
          This dashboard is only available for chef accounts.
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.deniedBtn}>
          <Text style={styles.deniedBtnText}>Go Back</Text>
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
                <Text style={[styles.headerTitle, { color: colors.text }]}>Sales Dashboard</Text>
        <View style={{ width: 40 }} />
      </View>

      <Text style={[styles.pageDescription, { color: colors.subtext }]}>
        Your earnings from recipes you've sold, as a chef.
      </Text>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: RED }]}>
          <Ionicons name="cash-outline" size={22} color="#fff" />
          <Text style={styles.summaryValueLight}>${data.total_earnings.toFixed(2)}</Text>
          <Text style={styles.summaryLabelLight}>Total Earnings</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <Ionicons name="bag-check-outline" size={22} color={RED} />
          <Text style={[styles.summaryValue, { color: colors.text }]}>{data.total_sales}</Text>
          <Text style={[styles.summaryLabel, { color: colors.subtext }]}>Total Sales</Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Sales by Recipe</Text>

      {data.recipes.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="stats-chart-outline" size={44} color={colors.subtext} />
          <Text style={[styles.emptyText, { color: colors.subtext }]}>
            No paid recipes yet, or none have sold so far.
          </Text>
        </View>
      ) : (
        data.recipes.map((r) => (
          <TouchableOpacity
            key={r.id}
            style={[styles.recipeCard, { backgroundColor: colors.card }]}
            onPress={() => router.push(`/recipe/${r.id}`)}
            activeOpacity={0.8}
          >
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
                ${Number(r.price_usd ?? 0).toFixed(2)} • {r.sales_count} sold
              </Text>
            </View>
            <Text style={[styles.recipeEarnings, { color: RED }]}>
              ${r.your_earnings.toFixed(2)}
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
  summaryRow: { flexDirection: 'row', gap: 12, marginHorizontal: 20, marginBottom: 22 },
  summaryCard: { flex: 1, borderRadius: 18, padding: 16, alignItems: 'flex-start', gap: 6 },
  summaryValue: { fontSize: 22, fontWeight: '800' },
  summaryValueLight: { fontSize: 22, fontWeight: '800', color: '#fff' },
  summaryLabel: { fontSize: 12 },
  summaryLabelLight: { fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginHorizontal: 20, marginBottom: 10 },
  empty: { alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 40, paddingHorizontal: 40 },
  emptyText: { fontSize: 13, textAlign: 'center' },
  recipeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 20, marginBottom: 12, borderRadius: 16, padding: 12 },
  thumb: { width: 50, height: 50, borderRadius: 12 },
  thumbFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F0F0' },
  recipeTitle: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  recipeMeta: { fontSize: 12 },
  recipeEarnings: { fontSize: 15, fontWeight: '800' },
});