import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiFetch } from '@/lib/api-fetch';
import { useTheme } from '@/lib/theme-context';

const RED = '#D62828';

type MyRecipe = {
  id: string;
  title: string;
  image_url: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'deleted';
  price_usd: number | string | null;
  is_free: boolean;
  created_at: string;
  rejection_reason?: string | null;
  deleted_at?: string | null;
};

const RESTORE_WINDOW_DAYS = 3;

function daysLeft(deletedAt: string): number {
  const purgeAt = new Date(deletedAt).getTime() + RESTORE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((purgeAt - Date.now()) / (24 * 60 * 60 * 1000)));
}

export default function MyRecipesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: '#F5A62322', text: '#B5750B', label: t('my_recipes_screen.status_pending') },
    approved: { bg: '#2E7D3222', text: '#2E7D32', label: t('my_recipes_screen.status_live') },
    rejected: { bg: '#D6282822', text: RED, label: t('my_recipes_screen.status_rejected') },
    deleted: { bg: '#55555522', text: '#555', label: t('my_recipes_screen.status_deleted') },
  };

  const [recipes, setRecipes] = useState<MyRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchMine = useCallback(async () => {
    try {
      const res = await apiFetch('/api/recipes/my-recipes');
      const data = await res.json();
      setRecipes(data.recipes ?? []);
    } catch {
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchMine();
    }, [fetchMine])
  );

  const confirmDelete = (id: string, title: string) => {
    Alert.alert(
      t('my_recipes_screen.confirm_delete_title'),
      t('my_recipes_screen.confirm_delete_message', { title }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            setDeletingId(id);
            try {
              const res = await apiFetch(`/api/recipes/${id}/delete`, { method: 'POST' });
              const data = await res.json();
              if (!res.ok) {
                Alert.alert(t('common.failed'), data.error ?? t('my_recipes_screen.delete_failed'));
                return;
              }
              setRecipes((prev) => prev.filter((r) => r.id !== id));
            } catch {
              Alert.alert(t('common.failed'), t('common.connection_error'));
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

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
                <Text style={[styles.headerTitle, { color: colors.text }]}>{t('my_recipes_screen.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <Text style={[styles.pageDescription, { color: colors.subtext }]}>
        {t('my_recipes_screen.description')}
      </Text>

      {recipes.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="restaurant-outline" size={48} color={colors.subtext} />
          <Text style={[styles.emptyText, { color: colors.subtext }]}>
            {t('my_recipes_screen.empty')}
          </Text>
          <TouchableOpacity style={styles.uploadBtn} onPress={() => router.push('/upload-recipe')}>
            <Text style={styles.uploadBtnText}>{t('my_recipes_screen.upload_first')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        recipes.map((recipe) => {
          const statusStyle = STATUS_STYLES[recipe.status] ?? STATUS_STYLES.pending;
          const canDelete = recipe.status !== 'approved' && recipe.status !== 'deleted';
          return (
            <View key={recipe.id} style={[styles.card, { backgroundColor: colors.card }]}>
              {recipe.image_url ? (
                <Image source={{ uri: recipe.image_url }} style={styles.thumb} contentFit="cover" />
              ) : (
                <View style={[styles.thumb, styles.thumbFallback]}>
                  <Ionicons name="restaurant-outline" size={22} color={colors.subtext} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                  {recipe.title}
                </Text>
                                <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
                  <Text style={[styles.statusPillText, { color: statusStyle.text }]}>
                    {statusStyle.label}
                  </Text>
                </View>
                <Text style={[styles.priceText, { color: colors.subtext }]}>
                  {recipe.is_free ? t('my_recipes_screen.free') : `$${Number(recipe.price_usd ?? 0).toFixed(2)}`}
                </Text>
                {(recipe.status === 'rejected' || recipe.status === 'deleted') && recipe.rejection_reason && (
                  <Text style={[styles.rejectionReasonText, { color: RED }]} numberOfLines={2}>
                    {recipe.rejection_reason}
                  </Text>
                )}
                {recipe.status === 'deleted' && recipe.deleted_at && (
                  <Text style={[styles.purgeCountdownText, { color: colors.subtext }]}>
                    {t('my_recipes_screen.purge_countdown', { count: daysLeft(recipe.deleted_at) })}
                  </Text>
                )}
              </View>
              {canDelete && (
                <TouchableOpacity
                  onPress={() => confirmDelete(recipe.id, recipe.title)}
                  disabled={deletingId === recipe.id}
                  style={styles.deleteBtn}
                >
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color={deletingId === recipe.id ? colors.subtext : RED}
                  />
                </TouchableOpacity>
              )}
            </View>
          );
        })
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
  empty: { alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 80, paddingHorizontal: 40 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  uploadBtn: { marginTop: 8, backgroundColor: RED, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  uploadBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 20, marginBottom: 12, borderRadius: 16, padding: 12 },
  thumb: { width: 56, height: 56, borderRadius: 12 },
  thumbFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F0F0' },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  statusPill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginBottom: 4 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
   priceText: { fontSize: 12 },
  rejectionReasonText: { fontSize: 11.5, marginTop: 3, fontStyle: 'italic' },
  purgeCountdownText: { fontSize: 10.5, marginTop: 2 },
  deleteBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});