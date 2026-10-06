import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { getBaseUrl } from '@/lib/get-base-url';
import { apiFetch } from '@/lib/api-fetch';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '@/lib/theme-context';
import { useSession } from '@/lib/supabase';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UnreadBadge, useNotifications } from '@/components/NotificationProvider';

const RED = '#D62828';
const WARM_BG = '#FBF8F4';

type Recipe = {
  id: string;
  title: string;
  description: string;
  cuisine: string;
  image_url: string | null;
  progress_image_1?: string | null;
  progress_image_2?: string | null;
  is_free: boolean;
  point_cost: number;
  price_usd: number | string | null;
  meal_type: string;
  category: string;
  chef_id?: string;
  chef_name?: string;
  avg_rating?: number | string;
  rating_count?: number | string;
};

type RecipeSales = {
  id: string;
  title: string;
  image_url: string | null;
  price_usd: number | string | null;
  sales_count: number;
  gross_revenue: number;
  your_earnings: number;
};

type ChefDashboardData = {
  total_earnings: number;
  total_sales: number;
  recipes: RecipeSales[];
};

const CUISINES = [
    { label: 'Khmer', icon: 'leaf-outline', value: 'Khmer' },
  { label: 'Japanese', icon: 'fish-outline', value: 'Japanese' },
  { label: 'Korean', icon: 'flame-outline', value: 'Korean' },
    { label: 'Indian', icon: 'flame-outline', value: 'Indian' },
  { label: 'Chinese', icon: 'cafe-outline', value: 'Chinese' },
  { label: 'Italian', icon: 'pizza-outline', value: 'Italian' },
  { label: 'French', icon: 'wine-outline', value: 'French' },
  { label: 'American', icon: 'fast-food-outline', value: 'American' },
  { label: 'Mexican', icon: 'flame-outline', value: 'Mexican' },
];

const CATEGORIES = [
  { label: 'Burger', icon: 'fast-food-outline', value: 'burger' },
  { label: 'Pizza', icon: 'pizza-outline', value: 'pizza' },
  { label: 'Noodles', icon: 'restaurant-outline', value: 'noodles' },
  { label: 'Rice', icon: 'nutrition-outline', value: 'rice' },
  { label: 'Cake', icon: 'gift-outline', value: 'cake' },
  { label: 'Dessert', icon: 'ice-cream-outline', value: 'dessert' },
  { label: 'Salad', icon: 'leaf-outline', value: 'salad' },
  { label: 'Soup', icon: 'cafe-outline', value: 'soup' },
  { label: 'Other', icon: 'ellipsis-horizontal-outline', value: 'other' },
];

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'dessert'];

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

function FeaturedCard({ recipe }: { recipe: Recipe }) {
  const icon = getCuisineIcon(recipe.cuisine, recipe.category);
  const { t } = useTranslation();
  return (
    <TouchableOpacity
      style={styles.featuredCard}
      activeOpacity={0.92}
      onPress={() => router.push(`/recipe/${recipe.id}`)}
    >
      {recipe.image_url ? (
        <Image source={{ uri: recipe.image_url }} style={styles.featuredImg} contentFit="cover" />
      ) : (
        <View style={[styles.featuredImg, styles.featuredImgFallback]}>
          <Ionicons name={icon} size={56} color={RED} />
        </View>
      )}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.75)']}
        style={styles.featuredOverlay}
      >
        <View style={styles.featuredTag}>
          <Text style={styles.featuredTagText}>{t('home.chefs_pick')}</Text>
        </View>
        <Text style={styles.featuredTitle} numberOfLines={1}>{recipe.title}</Text>
        <View style={styles.featuredBottomRow}>
          <Text style={styles.featuredCuisine}>{t('cuisines.' + recipe.cuisine, { defaultValue: recipe.cuisine })}</Text>
          <View style={styles.featuredCta}>
            <Text style={styles.featuredCtaText}>{t('recipe_detail_screen.view_recipe')}</Text>
            <Ionicons name="arrow-forward" size={13} color={RED} />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function RecipeCard({
  item,
  isOwned,
  liked,
  onToggleLike,
}: {
  item: Recipe;
  isOwned: boolean;
  liked: boolean;
  onToggleLike: (recipeId: string) => void;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const ratingCount = Number(item.rating_count ?? 0);
  const avgRating = Number(item.avg_rating ?? 0);
  return (
    <TouchableOpacity
      style={[styles.recipeCard, { backgroundColor: colors.card }]}
      onPress={() => router.push(`/recipe/${item.id}`)}
      activeOpacity={0.9}
    >
      <View style={styles.recipeCardImage}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.recipeCardCarousel} contentFit="cover" />
        ) : (
          <Ionicons name={getCuisineIcon(item.cuisine, item.category)} size={32} color={RED} />
        )}
        <TouchableOpacity
          style={styles.likeButton}
          onPress={(e) => {
            e.stopPropagation();
            onToggleLike(item.id);
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={16} color={liked ? RED : '#fff'} />
        </TouchableOpacity>
        <View style={styles.badgeFloat}>
          {item.is_free ? (
            <View style={styles.freeBadge}>
              <Text style={styles.freeBadgeText}>{t('recipe_detail_screen.free_badge')}</Text>
            </View>
          ) : isOwned ? (
            <View style={[styles.freeBadge, { backgroundColor: '#3A3A3A' }]}>
              <Ionicons name="checkmark-circle" size={9} color="#fff" />
              <Text style={styles.freeBadgeText}>{t('recipe_detail_screen.owned_badge')}</Text>
            </View>
          ) : (
            <View style={styles.pointBadge}>
              <Text style={styles.pointBadgeText}>${Number(item.price_usd ?? 0).toFixed(2)}</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.recipeCardBody}>
        <Text style={[styles.recipeCardTitle, { color: colors.text }]} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.recipeCardMetaRow}>
          <Text style={[styles.recipeCardCuisine, { color: RED }]} numberOfLines={1}>{t('cuisines.' + item.cuisine, { defaultValue: item.cuisine })}</Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={11} color="#F5A623" />
            <Text style={[styles.ratingText, { color: colors.subtext }]}>
              {ratingCount > 0 ? avgRating.toFixed(1) : t('home.new_recipe')}
            </Text>
          </View>
        </View>
        {item.chef_name && (
          <Text style={[styles.recipeCardChef, { color: colors.subtext }]} numberOfLines={1}>
            {t('my_orders_screen.by_chef', { name: item.chef_name })}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

function SectionRow({
  title,
  data,
  unlockedIds,
  likedIds,
  onToggleLike,
}: {
  title: string;
  data: Recipe[];
  unlockedIds: string[];
  likedIds: string[];
  onToggleLike: (recipeId: string) => void;
}) {
  const { colors } = useTheme();
  if (data.length === 0) return null;
  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionTitleRow}>
        <View style={styles.sectionAccent} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      </View>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
        renderItem={({ item }) => (
          <RecipeCard
            item={item}
            isOwned={unlockedIds.includes(item.id)}
            liked={likedIds.includes(item.id)}
            onToggleLike={onToggleLike}
          />
        )}
      />
    </View>
  );
}
function ChefHome({
  greeting,
  userName,
  dashboard,
  refreshing,
  onRefresh,
  insets,
}: {
  greeting: string;
  userName: string;
  dashboard: ChefDashboardData | null;
  refreshing: boolean;
  onRefresh: () => void;
  insets: { top: number };
}) {
  const { colors, dark } = useTheme();
  const { t } = useTranslation();
  const recipes = dashboard?.recipes ?? [];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: dark ? colors.background : WARM_BG }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={RED} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.greeting, { color: colors.text }]}>{greeting},</Text>
          <Text style={[styles.userName, { color: RED }]}>{userName}</Text>
        </View>
        <TouchableOpacity style={styles.notifButton} onPress={() => router.push('/notifications')}>
          <Ionicons name="notifications-outline" size={20} color={RED} />
          <UnreadBadge />
        </TouchableOpacity>
      </View>

      <View style={styles.chefQuickActionsRow}>
        <TouchableOpacity
          style={[styles.chefQuickAction, { backgroundColor: colors.card }]}
          activeOpacity={0.85}
          onPress={() => router.push('/upload-recipe')}
        >
          <View style={styles.chefQuickActionIcon}>
            <Ionicons name="add-circle-outline" size={22} color={RED} />
          </View>
          <Text style={[styles.chefQuickActionText, { color: colors.text }]}>
            {t('profile.upload_recipe')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chefQuickAction, { backgroundColor: colors.card }]}
          activeOpacity={0.85}
          onPress={() => router.push('/my-recipes')}
        >
          <View style={styles.chefQuickActionIcon}>
            <Ionicons name="list-outline" size={22} color={RED} />
          </View>
          <Text style={[styles.chefQuickActionText, { color: colors.text }]}>
            {t('profile.my_recipes')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <Ionicons name="cash-outline" size={22} color={RED} />
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            ${(dashboard?.total_earnings ?? 0).toFixed(2)}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.subtext }]}>
            {t('chef_dashboard_screen.total_earnings')}
          </Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <Ionicons name="bag-check-outline" size={22} color={RED} />
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            {dashboard?.total_sales ?? 0}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.subtext }]}>
            {t('chef_dashboard_screen.total_sales')}
          </Text>
        </View>
      </View>

      <View style={styles.sectionTitleRow}>
        <View style={styles.sectionAccent} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t('chef_dashboard_screen.sales_by_recipe')}
        </Text>
      </View>

      {recipes.length === 0 ? (
        <View style={styles.chefEmpty}>
          <Ionicons name="stats-chart-outline" size={44} color={colors.subtext} />
          <Text style={[styles.chefEmptyText, { color: colors.subtext }]}>
            {t('chef_dashboard_screen.no_sales')}
          </Text>
        </View>
      ) : (
        recipes.map((r) => (
          <TouchableOpacity
            key={r.id}
            style={[styles.chefRecipeRow, { backgroundColor: colors.card }]}
            onPress={() => router.push(`/recipe/${r.id}`)}
            activeOpacity={0.85}
          >
            {r.image_url ? (
              <Image source={{ uri: r.image_url }} style={styles.chefRecipeThumb} contentFit="cover" />
            ) : (
              <View style={[styles.chefRecipeThumb, styles.chefRecipeThumbFallback]}>
                <Ionicons name="restaurant-outline" size={20} color={colors.subtext} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.chefRecipeTitle, { color: colors.text }]} numberOfLines={1}>
                {r.title}
              </Text>
              <Text style={[styles.chefRecipeMeta, { color: colors.subtext }]}>
                {t('chef_dashboard_screen.price_sold', {
                  price: Number(r.price_usd ?? 0).toFixed(2),
                  count: r.sales_count,
                })}
              </Text>
            </View>
            <Text style={[styles.chefRecipeEarnings, { color: RED }]}>
              ${r.your_earnings.toFixed(2)}
            </Text>
          </TouchableOpacity>
        ))
      )}

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

export default function HomeScreen() {
  const { colors, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const { data: session } = useSession();
  const { t } = useTranslation();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [accountType, setAccountType] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [chefDashboard, setChefDashboard] = useState<ChefDashboardData | null>(null);

  const fetchRecipes = useCallback(async () => {
    try {
      const res = await fetch(`${getBaseUrl()}/api/recipes`);
      const data = await res.json();
      setRecipes(data);
    } catch (err) {
      console.error('Failed to fetch recipes', err);
    }
  }, []);
  const fetchUnlocked = useCallback(async () => {
    try {
      const res = await apiFetch('/api/unlocked');
      const data = await res.json();
      setUnlockedIds(data);
    } catch { }
  }, []);
  const fetchLiked = useCallback(async () => {
    try {
      const res = await apiFetch('/api/favorites');
      const data = await res.json();
      setLikedIds(Array.isArray(data) ? data.map((r: Recipe) => r.id) : []);
    } catch { }
  }, []);
  const fetchChefDashboard = useCallback(async () => {
    try {
      const res = await apiFetch('/api/chef/dashboard');
      if (res.status === 403) return;
      const data = await res.json();
      setChefDashboard(data);
    } catch { }
  }, []);

  // Chef accounts get a sales dashboard instead of the recipe-browsing feed,
  // so we only fetch what each account type actually needs.
  const loadHome = useCallback(async () => {
    try {
      const res = await apiFetch('/api/profile');
      const data = await res.json();
      const type = data.account_type ?? null;
      setAccountType(type);
      // Edit Profile saves the name to the profile row, not the sign-in
      // session, so the greeting has to read it from here to stay current.
      setProfileName(data.username ?? null);
      if (type === 'chef') {
        await fetchChefDashboard();
      } else {
        await Promise.all([fetchRecipes(), fetchUnlocked(), fetchLiked()]);
      }
    } catch { }
  }, [fetchChefDashboard, fetchRecipes, fetchUnlocked, fetchLiked]);

  const { refresh: refreshUnread } = useNotifications();

  useFocusEffect(
    useCallback(() => {
      loadHome().finally(() => setLoading(false));
      refreshUnread();
    }, [loadHome, refreshUnread])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHome();
    setRefreshing(false);
  };

  const handleToggleLike = (recipeId: string) => {
    const wasLiked = likedIds.includes(recipeId);
    setLikedIds((prev) =>
      wasLiked ? prev.filter((id) => id !== recipeId) : [...prev, recipeId]
    );
    apiFetch('/api/favorites', {
      method: 'POST',
      body: JSON.stringify({ recipeId }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.favorited === undefined) return;
        setLikedIds((prev) => {
          const has = prev.includes(recipeId);
          if (data.favorited && !has) return [...prev, recipeId];
          if (!data.favorited && has) return prev.filter((id) => id !== recipeId);
          return prev;
        });
      })
      .catch(() => {
        setLikedIds((prev) =>
          wasLiked ? [...prev, recipeId] : prev.filter((id) => id !== recipeId)
        );
      });
  };

  const filtered = recipes.filter((r) => {
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase());
    const matchCuisine = selectedCuisine ? r.cuisine === selectedCuisine : true;
    const matchCategory = selectedCategory ? r.category === selectedCategory : true;
    return matchSearch && matchCuisine && matchCategory;
  });

  const hour = new Date().getHours();
  // Hour 0-4 is still the middle of the night, not "morning" — without this
  // branch `< 12` swallowed midnight through 4am into "Good Morning".
  const greeting = hour < 5
    ? t('home.greeting_night')
    : hour < 12
    ? t('home.greeting_morning')
    : hour < 17
    ? t('home.greeting_afternoon')
    : hour < 22
    ? t('home.greeting_evening')
    : t('home.greeting_night');
  const userName = profileName ?? session?.user.user_metadata?.name ?? 'Chef';

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: WARM_BG }]}>
        <ActivityIndicator size="large" color={RED} />
      </View>
    );
  }

  if (accountType === 'chef') {
    return (
      <ChefHome
        greeting={greeting}
        userName={userName}
        dashboard={chefDashboard}
        refreshing={refreshing}
        onRefresh={onRefresh}
        insets={insets}
      />
    );
  }

  const freeRecipes = filtered.filter((r) => r.is_free);
  const lockedRecipes = filtered.filter((r) => !r.is_free);
  const featured = recipes.find((r) => r.image_url && r.is_free) ?? recipes[0];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: dark ? colors.background : WARM_BG }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={RED} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header — simple, no floating search this time */}
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.greeting, { color: colors.text }]}>{greeting},</Text>
          <Text style={[styles.userName, { color: RED }]}>{userName}</Text>
        </View>
        <TouchableOpacity style={styles.notifButton} onPress={() => router.push('/notifications')}>
          <Ionicons name="notifications-outline" size={20} color={RED} />
          <UnreadBadge />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={[styles.searchBox, { backgroundColor: colors.card }]}>
          <Ionicons name="search" size={18} color={colors.subtext} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t('home.search_placeholder')}
            placeholderTextColor={colors.subtext}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.subtext} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Featured hero card */}
      {featured && !search && (
        <View style={styles.featuredWrap}>
          <FeaturedCard recipe={featured} />
        </View>
      )}

      {/* Cuisine pills — single row, icon inline with label */}
      <View style={styles.sectionTitleRow}>
        <View style={styles.sectionAccent} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t('home.explore_cuisine')}
        </Text>
      </View>
      <FlatList
        data={CUISINES}
        keyExtractor={(item) => item.value}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.pill,
              { backgroundColor: colors.card },
              selectedCuisine === item.value && styles.pillActive,
            ]}
                       onPress={() =>
              setSelectedCuisine(selectedCuisine === item.value ? null : item.value)
            }
          >
            <Text style={[
              styles.pillLabel,
              { color: selectedCuisine === item.value ? '#fff' : colors.text }
            ]}>
              {t('cuisines.' + item.value)}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Category pills */}
      <View style={styles.sectionTitleRow}>
        <View style={styles.sectionAccent} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t('home.popular_categories')}
        </Text>
      </View>
      <FlatList
        data={CATEGORIES}
        keyExtractor={(item) => item.value}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.pill,
              { backgroundColor: colors.card },
              selectedCategory === item.value && styles.pillActive,
            ]}
                       onPress={() =>
              setSelectedCategory(selectedCategory === item.value ? null : item.value)
            }
          >
            <Text style={[
              styles.pillLabel,
              { color: selectedCategory === item.value ? '#fff' : colors.text }
            ]}>
              {t('categories.' + item.value)}
            </Text>
          </TouchableOpacity>
        )}
      />

      <SectionRow title={t('home.free_recipes')} data={freeRecipes} unlockedIds={unlockedIds} likedIds={likedIds} onToggleLike={handleToggleLike} />
      <SectionRow title={t('home.premium_recipes')} data={lockedRecipes} unlockedIds={unlockedIds} likedIds={likedIds} onToggleLike={handleToggleLike} />

      {/* Meal Type Sections */}
      {MEAL_TYPES.map((meal) => {
        return (
          <SectionRow
            key={meal}
            title={t(`home.${meal}`)}
            data={filtered.filter((r) => r.meal_type === meal)}
            unlockedIds={unlockedIds}
            likedIds={likedIds}
            onToggleLike={handleToggleLike}
          />
        );
      })}

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  greeting: { fontSize: 15, fontWeight: '500' },
  userName: { fontSize: 24, fontWeight: '800', marginTop: 2 },
  notifButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
    searchWrap: { paddingHorizontal: 20, marginBottom: 18 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 15 },
  featuredWrap: { paddingHorizontal: 20, marginBottom: 22 },
  featuredCard: {
    height: 190,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#222',
  },
  featuredImg: { width: '100%', height: '100%', position: 'absolute' },
  featuredImgFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8E2D8' },
  featuredOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingTop: 40,
  },
  featuredTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: RED,
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  featuredTagText: { color: '#fff', fontSize: 10.5, fontWeight: '700' },
  featuredTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 8 },
  featuredBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  featuredCuisine: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '500' },
  featuredCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  featuredCtaText: { color: RED, fontSize: 12, fontWeight: '700' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, marginBottom: 10, marginTop: 6 },
  sectionAccent: { width: 4, height: 16, borderRadius: 2, backgroundColor: RED },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  pillList: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  pillActive: { backgroundColor: RED },
  pillLabel: { fontSize: 12.5, fontWeight: '600' },
  sectionContainer: { marginTop: 10 },
  horizontalList: { paddingHorizontal: 16, gap: 14, paddingBottom: 4 },
  recipeCard: {
    width: 180,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  recipeCardImage: {
    height: 125,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeFloat: { position: 'absolute', top: 8, right: 8 },
  likeButton: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#00000044',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeCardBody: { padding: 11 },
  recipeCardTitle: { fontSize: 13.5, fontWeight: '700', marginBottom: 3 },
  recipeCardMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  recipeCardCuisine: { fontSize: 11, fontWeight: '500', flexShrink: 1 },
  recipeCardChef: { fontSize: 10.5, fontWeight: '500' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 11, fontWeight: '600' },
  freeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#2E7D32',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  freeBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  pointBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: RED,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 3,
  },
  pointBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  recipeCardCarousel: { width: '100%', height: '100%' },
  chefQuickActionsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginBottom: 20 },
  chefQuickAction: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  chefQuickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#FDEDEC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chefQuickActionText: { fontSize: 13, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginBottom: 22 },
  summaryCard: { flex: 1, borderRadius: 18, padding: 16, alignItems: 'flex-start', gap: 6 },
  summaryValue: { fontSize: 22, fontWeight: '800' },
  summaryLabel: { fontSize: 12 },
  chefEmpty: { alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 40, paddingHorizontal: 40 },
  chefEmptyText: { fontSize: 13, textAlign: 'center' },
  chefRecipeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    padding: 12,
  },
  chefRecipeThumb: { width: 50, height: 50, borderRadius: 12 },
  chefRecipeThumbFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F0F0' },
  chefRecipeTitle: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  chefRecipeMeta: { fontSize: 12 },
  chefRecipeEarnings: { fontSize: 15, fontWeight: '800' },
});