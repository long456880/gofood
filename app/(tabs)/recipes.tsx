import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getBaseUrl } from '@/lib/get-base-url';
import { router } from 'expo-router';
import { useTheme } from '@/lib/theme-context';

const RED = '#D62828';

type Recipe = {
  id: string;
  title: string;
  description: string;
  cuisine: string;
  image_url: string | null;
  is_free: boolean;
  point_cost: number;
};

export default function RecipesScreen() {
  const { colors } = useTheme();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRecipes = useCallback(async () => {
    try {
      const res = await fetch(`${getBaseUrl()}/api/recipes`);
      const data = await res.json();
      setRecipes(data);
    } catch (err) {
      console.error('Failed to fetch recipes', err);
    }
  }, []);

  useEffect(() => {
    fetchRecipes().finally(() => setLoading(false));
  }, [fetchRecipes]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRecipes();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={RED} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.header, { color: colors.text }]}>Recipes</Text>
      <FlatList
        data={recipes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.card }]}
            onPress={() => router.push(`/recipe/${item.id}`)}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
              {item.is_free ? (
                <View style={styles.freeBadge}>
                  <Text style={styles.freeBadgeText}>FREE</Text>
                </View>
              ) : (
                <View style={styles.pointBadge}>
                  <Ionicons name="diamond" size={12} color={RED} />
                  <Text style={styles.pointBadgeText}>{item.point_cost}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.cuisine, { color: RED }]}>{item.cuisine}</Text>
            <Text style={[styles.description, { color: colors.subtext }]} numberOfLines={2}>
              {item.description}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  card: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: { fontSize: 17, fontWeight: '600', flex: 1, marginRight: 8 },
  cuisine: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  description: { fontSize: 14, lineHeight: 19 },
  freeBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  freeBadgeText: { color: '#2E7D32', fontSize: 11, fontWeight: '700' },
  pointBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDEDEC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 3,
  },
  pointBadgeText: { color: RED, fontSize: 12, fontWeight: '700' },
});