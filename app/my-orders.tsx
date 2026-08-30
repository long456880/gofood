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

type Order = {
  id: string;
  unlocked_at: string;
  price_paid_usd: number | string | null;
  recipe_id: string;
  title: string;
  image_url: string | null;
  cuisine: string;
  chef_name: string | null;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function MyOrdersScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await apiFetch('/api/orders');
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [fetchOrders])
  );

  const total = orders.reduce((sum, o) => sum + Number(o.price_paid_usd ?? 0), 0);

  if (loading) {
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
                <Text style={[styles.headerTitle, { color: colors.text }]}>My Orders</Text>
        <View style={{ width: 40 }} />
      </View>

      <Text style={[styles.pageDescription, { color: colors.subtext }]}>
        Recipes you've bought, as a buyer.
      </Text>

      {orders.length > 0 && (
        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <View>
            <Text style={[styles.summaryLabel, { color: colors.subtext }]}>Total Recipes Bought</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{orders.length}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View>
            <Text style={[styles.summaryLabel, { color: colors.subtext }]}>Total Spent</Text>
            <Text style={[styles.summaryValue, { color: RED }]}>${total.toFixed(2)}</Text>
          </View>
        </View>
      )}

      {orders.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="receipt-outline" size={48} color={colors.subtext} />
          <Text style={[styles.emptyText, { color: colors.subtext }]}>
            You haven't bought any recipes yet.
          </Text>
        </View>
      ) : (
        orders.map((order) => (
          <TouchableOpacity
            key={order.id}
            style={[styles.card, { backgroundColor: colors.card }]}
            onPress={() => router.push(`/recipe/${order.recipe_id}`)}
            activeOpacity={0.8}
          >
            {order.image_url ? (
              <Image source={{ uri: order.image_url }} style={styles.thumb} contentFit="cover" />
            ) : (
              <View style={[styles.thumb, styles.thumbFallback]}>
                <Ionicons name="restaurant-outline" size={22} color={colors.subtext} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                {order.title}
              </Text>
              <Text style={[styles.cardMeta, { color: colors.subtext }]}>
                {order.cuisine}{order.chef_name ? ` • by ${order.chef_name}` : ''}
              </Text>
              <Text style={[styles.cardDate, { color: colors.subtext }]}>
                {formatDate(order.unlocked_at)}
              </Text>
            </View>
            <Text style={[styles.cardPrice, { color: RED }]}>
              ${Number(order.price_paid_usd ?? 0).toFixed(2)}
            </Text>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, marginBottom: 16 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700' },
  pageDescription: { fontSize: 12.5, textAlign: 'center', marginHorizontal: 30, marginBottom: 16, lineHeight: 17 },
  summaryCard: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 18,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  summaryLabel: { fontSize: 12, marginBottom: 4 },
  summaryValue: { fontSize: 20, fontWeight: '800' },
  summaryDivider: { width: 1, height: 34, backgroundColor: 'rgba(0,0,0,0.08)', marginHorizontal: 24 },
  empty: { alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 80, paddingHorizontal: 40 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 20, marginBottom: 12, borderRadius: 16, padding: 12 },
  thumb: { width: 56, height: 56, borderRadius: 12 },
  thumbFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F0F0' },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  cardMeta: { fontSize: 12, marginBottom: 2 },
  cardDate: { fontSize: 11 },
  cardPrice: { fontSize: 15, fontWeight: '800' },
});