import { apiFetch } from '@/lib/api-fetch';
import { useSession } from '@/lib/supabase';
import { useTheme } from '@/lib/theme-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const RED = '#D62828';
const ADMIN_EMAIL = 'feihengkimborat@gmail.com';

type Recipe = {
  id: string;
  title: string;
  description: string;
  cuisine: string;
  is_free: boolean;
  point_cost: number;
  price_usd?: number | string | null;
  image_url?: string;
  progress_image_1?: string | null;
  progress_image_2?: string | null;
  category?: string;
  owned?: boolean;
  chef_name?: string;
  avg_rating?: number | string;
  rating_count?: number | string;
};

type Section = {
  title: string;
  data: Recipe[];
};

// Order countries should appear in — change this list to reorder sections
const CUISINE_ORDER = ['Khmer', 'Chinese', 'Japanese', 'Indian', 'Korean', 'Italian', 'French', 'American', 'Mexican'];

function getCuisineIcon(cuisine: string, category: string): keyof typeof Ionicons.glyphMap {
  if (category === 'burger') return 'fast-food-outline';
  if (category === 'pizza') return 'pizza-outline';
  if (category === 'noodles') return 'restaurant-outline';
  if (category === 'rice') return 'nutrition-outline';
  if (category === 'cake') return 'gift-outline';
  if (category === 'dessert') return 'ice-cream-outline';
  if (category === 'salad') return 'leaf-outline';
  if (category === 'soup') return 'cafe-outline';
    if (cuisine === 'Khmer') return 'leaf-outline';
  if (cuisine === 'Japanese') return 'fish-outline';
  if (cuisine === 'Korean') return 'flame-outline';
  if (cuisine === 'Indian') return 'flame-outline';
  if (cuisine === 'Chinese') return 'cafe-outline';
  if (cuisine === 'Italian') return 'pizza-outline';
  if (cuisine === 'French') return 'wine-outline';
  if (cuisine === 'American') return 'fast-food-outline';
  if (cuisine === 'Mexican') return 'flame-outline';
  return 'restaurant-outline';
}

// Groups a flat list of recipes into sections by cuisine, in CUISINE_ORDER
function groupByCuisine(recipes: Recipe[]): Section[] {
  const groups: Record<string, Recipe[]> = {};
  recipes.forEach((r) => {
    const key = r.cuisine || 'Other';
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });

  const orderedKeys = [
    ...CUISINE_ORDER.filter((c) => groups[c]),
    ...Object.keys(groups).filter((c) => !CUISINE_ORDER.includes(c)),
  ];

  return orderedKeys.map((cuisine) => ({ title: cuisine, data: groups[cuisine] }));
}

export default function FavoritesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { data: session } = useSession();
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  // Favorites is a home-cook feature — chefs and admins get redirected home
  // if they somehow land on this route directly.
  useFocusEffect(
    useCallback(() => {
      apiFetch('/api/profile')
        .then((res) => res.json())
        .then((profile) => {
          if (profile.account_type === 'chef' || session?.user.email === ADMIN_EMAIL) {
            router.replace('/');
            return;
          }
          return apiFetch('/api/favorites')
            .then((res) => res.json())
            .then((data) => setFavorites(Array.isArray(data) ? data : []));
        })
        .catch(() => setFavorites([]))
        .finally(() => setLoading(false));
    }, [session])
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={RED} />
      </View>
    );
  }

  const sections = groupByCuisine(favorites);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 20 }]}>
      <Text style={[styles.header, { color: colors.text }]}>{t('favorites.title')}</Text>

      {favorites.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="heart-outline" size={48} color={colors.subtext} />
          <Text style={[styles.emptyText, { color: colors.subtext }]}>
            {t('favorites.empty')}
          </Text>
        </View>
      ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.list, { paddingBottom: 20 }]}>
          {sections.map((section) => (
            <View key={section.title} style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionAccent} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t('cuisines.' + section.title, { defaultValue: section.title })}
                </Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.row}
              >
                {section.data.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.card, { backgroundColor: colors.card }]}
                    onPress={() => router.push(`/recipe/${item.id}`)}
                  >
                    <View style={styles.imageContainer}>
                      {item.image_url ? (
                        <Image source={{ uri: item.image_url }} style={styles.image} contentFit="cover" />
                      ) : (
                        <View style={[styles.imagePlaceholder, { backgroundColor: colors.input }]}>
                          <Ionicons name={getCuisineIcon(item.cuisine, item.category ?? '')} size={36} color={RED} />
                        </View>
                      )}
                      {item.is_free ? (
                        <View style={[styles.badge, { backgroundColor: '#2E7D32' }]}>
                          <Text style={styles.badgeText}>{t('recipe_detail_screen.free_badge')}</Text>
                        </View>
                      ) : item.owned ? (
                        <View style={[styles.badge, { backgroundColor: '#3A3A3A' }]}>
                          <Ionicons name="checkmark-circle" size={9} color="#fff" />
                          <Text style={styles.badgeText}>{t('recipe_detail_screen.owned_badge')}</Text>
                        </View>
                      ) : (
                        <View style={[styles.badge, { backgroundColor: RED }]}>
                          <Text style={styles.badgeText}>${Number(item.price_usd ?? 0).toFixed(2)}</Text>
                        </View>
                      )}
                    </View>
                                       <View style={styles.cardBody}>
                      <View style={styles.titleRow}>
                        <Text style={[styles.title, { color: colors.text, flex: 1 }]} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <View style={styles.ratingRow}>
                          <Ionicons name="star" size={12} color="#F5A623" />
                          <Text style={[styles.ratingText, { color: colors.subtext }]}>
                            {Number(item.rating_count ?? 0) > 0 ? Number(item.avg_rating).toFixed(1) : t('home.new_recipe')}
                          </Text>
                        </View>
                      </View>
                      {item.chef_name && (
                        <Text style={[styles.chefText, { color: colors.subtext }]} numberOfLines={1}>
                          {t('my_orders_screen.by_chef', { name: item.chef_name })}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { fontSize: 28, fontWeight: 'bold', paddingHorizontal: 20, marginBottom: 16 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 80 },
  emptyText: { fontSize: 15, textAlign: 'center', paddingHorizontal: 40, lineHeight: 22 },
  list: { paddingBottom: 100 },
  section: { marginBottom: 22 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  sectionAccent: { width: 4, height: 16, borderRadius: 2, backgroundColor: RED },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  row: { paddingHorizontal: 20, gap: 12 },
  card: {
    width: 270,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  imageContainer: { position: 'relative', width: '100%', height: 170 },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    cardBody: { padding: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 15, fontWeight: '700' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 11, fontWeight: '600' },
  chefText: { fontSize: 11, marginTop: 2 },
});