import { View, Text, StyleSheet } from 'react-native';
import { categorizeIngredient, IngredientCategory } from '@/lib/ingredient-utils';
import IngredientIcon from '@/components/IngredientIcon';

const CATEGORY_COLOR: Record<IngredientCategory, string> = {
  meat: '#D62828',
  seafood: '#2C7FB0',
  vegetable: '#2E7D32',
  fruit: '#E8871E',
  dairy: '#5CA9D6',
  grain: '#B08150',
  spice: '#B23A21',
  herb: '#3F8F6B',
  liquid: '#6E0000',
  other: '#8A8A8A',
};

export default function IngredientChips({ ingredients }: { ingredients: string[] }) {
  if (ingredients.length === 0) return null;

  return (
    <View style={styles.row}>
      {ingredients.map((name, i) => {
        const color = CATEGORY_COLOR[categorizeIngredient(name)];
        return (
          <View key={`${name}-${i}`} style={[styles.chip, { borderColor: color }]}>
            <View style={[styles.badge, { backgroundColor: color }]}>
              <Text style={styles.badgeText}>{i + 1}</Text>
            </View>
            <IngredientIcon name={name} size={22} />
            <Text style={[styles.label, { color }]} numberOfLines={1}>{name}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 12 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1.3,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#fff',
  },
  badge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  label: { fontSize: 12.5, fontWeight: '600', maxWidth: 100 },
});