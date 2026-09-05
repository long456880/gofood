import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Dimensions,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '@/lib/api-fetch';
import { useTheme } from '@/lib/theme-context';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import StepAnimation, { getTechnique } from '@/components/StepAnimation';
import IngredientChips from '@/components/IngredientChips';
import IngredientIcon from '@/components/IngredientIcon';
import { detectStepIngredients, cleanIngredientName } from '@/lib/ingredient-utils';
import {
  RED,
  scaleIngredients,
  parseSteps,
  getHighlightSegments,
  getDonenessCue,
  formatDuration,
  TECHNIQUE_TIPS,
  TECHNIQUE_TIPS_KM,
} from '@/lib/recipe-utils';

const WARM_BG = '#FBF8F4';
const { width } = Dimensions.get('window');
const TASTE_OPTIONS = ['Sweet', 'Salty', 'Spicy'];
const TASTE_TIPS: Record<string, string> = {
  Sweet: 'Add 1-2 extra tbsp sugar or honey to taste',
  Salty: 'Add 1 extra tsp salt or soy sauce to taste',
  Spicy: 'Add 1-2 extra chopped chili or 1 tsp chili flakes',
};
const TASTE_TIPS_KM: Record<string, string> = {
  Sweet: 'បន្ថែមស្ករ ឬទឹកឃ្មុំ ១-២ស្លាបព្រា តាមចំណូលចិត្ត',
  Salty: 'បន្ថែមអំបិល ឬទឹកស៊ីអ៊ីវ ១ស្លាបព្រាកាហ្វេ តាមចំណូលចិត្ត',
  Spicy: 'បន្ថែមម្ទេសកិន ១-២គ្រាប់ ឬម្សៅម្ទេសក្រហម ១ស្លាបព្រាកាហ្វេ',
};

type RecipeDetail = {
  id: string;
  title: string;
  description: string;
  cuisine: string;
  is_free: boolean;
  point_cost: number;
  locked: boolean;
  category: string;
  meal_type: string;
  image_url?: string;
  ingredients?: string;
  description_km?: string;
  ingredients_km?: string;
  steps?: string;
  steps_km?: string;
  price_usd?: number;
  chef_id?: string;
  chef_name?: string;
  avg_rating?: number;
  rating_count?: number;
  my_rating?: number | null;
};

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [servings, setServings] = useState(2);
  const [selectedTaste, setSelectedTaste] = useState<string | null>(null);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [currentStep, setCurrentStep] = useState(0);
  const [showPayModal, setShowPayModal] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);

  const isKhmer = i18n.language === 'km';

  const toggleIngredient = (index: number) => {
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const fetchRecipe = async () => {
    const res = await apiFetch(`/api/recipes/${id}`);
    const data = await res.json();
    setRecipe(data);
  };

  const checkFavorite = async () => {
    try {
      const res = await apiFetch(`/api/favorites/check?recipeId=${id}`);
      const data = await res.json();
      setFavorited(data.favorited ?? false);
    } catch {
      setFavorited(false);
    }
  };

  useEffect(() => {
    setCurrentStep(0);
    fetchRecipe().finally(() => setLoading(false));
    checkFavorite();
  }, [id]);

  const handleUnlock = async () => {
    setUnlocking(true);
    const res = await apiFetch(`/api/recipes/${id}/unlock`, { method: 'POST' });
    setUnlocking(false);
    if (!res.ok) {
      Alert.alert('Payment Failed', 'Something went wrong. Please try again.');
      return;
    }
    setShowPayModal(false);
    Alert.alert('Payment Successful', t('recipe.enjoy'));
    fetchRecipe();
  };

  const handleRate = async (value: number) => {
    if (!recipe || submittingRating) return;
    console.log('Rating tapped:', value);
    setSubmittingRating(true);
    try {
      const res = await apiFetch(`/api/recipes/${id}/rate`, {
        method: 'POST',
        body: JSON.stringify({ rating: value }),
      });
      const data = await res.json();
      console.log('Rating response:', res.status, data);
      if (!res.ok) {
        Alert.alert('Failed', 'Could not save your rating. Please try again.');
        return;
      }
      setRecipe((prev) =>
        prev
          ? { ...prev, my_rating: value, avg_rating: data.avg_rating, rating_count: data.rating_count }
          : prev
      );
      console.log('State updated with my_rating:', value);
    } catch (err) {
      console.log('Rating error:', err);
      Alert.alert('Failed', 'Please check your connection and try again.');
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleFavorite = () => {
    const newState = !favorited;
    setFavorited(newState);
    apiFetch('/api/favorites', {
      method: 'POST',
      body: JSON.stringify({ recipeId: id }),
    }).then((res) => res.json()).then((data) => {
      if (data.favorited !== undefined) setFavorited(data.favorited);
    }).catch(() => {
      setFavorited(!newState);
    });
  };

  const handleReadAloud = (text: string) => {
    Speech.stop();
    Speech.speak(text, { language: isKhmer ? 'km' : 'en' });
  };

  if (loading) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={RED} /></View>;
  }

  if (!recipe) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><Text style={{ color: colors.text }}>Recipe not found.</Text></View>;
  }

  const displayDescription = (isKhmer && recipe.description_km) ? recipe.description_km : recipe.description;
  const displayIngredients = (isKhmer && recipe.ingredients_km) ? recipe.ingredients_km : recipe.ingredients;
  const displaySteps = (isKhmer && recipe.steps_km) ? recipe.steps_km : recipe.steps;
  const scaledIngredients = displayIngredients ? scaleIngredients(displayIngredients, servings) : [];
  const ingredientNames = displayIngredients ? displayIngredients.split(',').map((s) => s.trim()).filter(Boolean) : [];
  const parsedSteps = displaySteps ? parseSteps(displaySteps) : [];

  const activeStep = parsedSteps[currentStep];
  const technique = activeStep ? getTechnique(activeStep.text) : 'general';

  const englishSteps = recipe.steps ? parseSteps(recipe.steps) : [];
  const englishIngredientNames = recipe.ingredients
    ? recipe.ingredients.split(',').map((s) => s.trim()).filter(Boolean)
    : [];
  const kmIngredientNames = recipe.ingredients_km
    ? recipe.ingredients_km.split(',').map((s) => s.trim()).filter(Boolean)
    : [];
  const englishActiveStep = englishSteps[currentStep];
  const stepIngredientMatches = englishActiveStep
    ? detectStepIngredients(englishActiveStep.text, englishIngredientNames)
    : [];
  const stepIngredients = stepIngredientMatches.map((m) => {
    if (isKhmer && kmIngredientNames[m.listIndex]) {
      return cleanIngredientName(kmIngredientNames[m.listIndex]);
    }
    return m.name;
  });
  const techniqueTip = isKhmer ? TECHNIQUE_TIPS_KM[technique] : TECHNIQUE_TIPS[technique];
  const donenessCue = activeStep ? getDonenessCue(activeStep.text) : null;
  const stepDuration = activeStep && activeStep.minutes.length > 0 ? formatDuration(activeStep.minutes[0]) : null;
  const highlightSegments = activeStep ? getHighlightSegments(activeStep.text, ingredientNames) : [];

  const dessertKeywords = ['cake', 'dessert', 'pastry', 'sweet', 'tiramisu', 'sticky rice', 'mango', 'pudding', 'ice cream', 'pie', 'cookie'];
  const isDessert =
    (recipe.meal_type ?? '').toLowerCase() === 'dessert' ||
    (recipe.category ?? '').toLowerCase() === 'dessert' ||
    (recipe.category ?? '').toLowerCase() === 'cake' ||
    recipe.title.toLowerCase().includes('cake') ||
    recipe.title.toLowerCase().includes('dessert') ||
    recipe.title.toLowerCase().includes('tiramisu') ||
    recipe.title.toLowerCase().includes('mango sticky') ||
    recipe.title.toLowerCase().includes('croissant') ||
    recipe.title.toLowerCase().includes('chocolate');

  return (
    <ScrollView style={[styles.container, { backgroundColor: dark ? colors.background : WARM_BG }]} showsVerticalScrollIndicator={false}>
      {/* Hero */}
      <View style={[styles.hero, { backgroundColor: '#1A1A1A' }]}>
        {recipe.image_url ? (
          <Image
            source={{ uri: recipe.image_url }}
            style={StyleSheet.absoluteFillObject}
            contentFit="contain"
          />
        ) : null}
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#00000033' }]} />
        <View style={[styles.heroButtons, { top: insets.top + 12 }]}>
          <TouchableOpacity style={styles.heroBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.heroBtn} onPress={handleFavorite}>
            <Ionicons name={favorited ? 'heart' : 'heart-outline'} size={22} color={favorited ? RED : '#fff'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <View style={[styles.content, { backgroundColor: dark ? colors.background : WARM_BG }]}>
        <View style={styles.inlineBadges}>
          <View style={styles.badge}><Text style={styles.badgeText}>{recipe.cuisine}</Text></View>
          {recipe.is_free
            ? <View style={[styles.badge, { backgroundColor: '#2E7D32' }]}><Text style={styles.badgeText}>FREE</Text></View>
            : <View style={[styles.badge, { backgroundColor: RED }]}><Text style={styles.badgeText}>${Number(recipe.price_usd ?? 0).toFixed(2)}</Text></View>
          }
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{recipe.title}</Text>
        {recipe.chef_name && (
          <View style={styles.chefRow}>
            <Ionicons name="ribbon-outline" size={14} color={RED} />
            <Text style={[styles.chefName, { color: colors.subtext }]}>by {recipe.chef_name}</Text>
          </View>
        )}
        <Text style={[styles.description, { color: colors.subtext }]}>{displayDescription}</Text>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.ratingSummaryRow}>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((i) => {
                const avg = recipe.avg_rating ?? 0;
                const iconName = avg >= i ? 'star' : avg >= i - 0.5 ? 'star-half' : 'star-outline';
                return <Ionicons key={i} name={iconName} size={18} color="#F5A623" />;
              })}
            </View>
            <Text style={[styles.ratingSummaryText, { color: colors.subtext }]}>
              {recipe.rating_count && recipe.rating_count > 0
                ? `${Number(recipe.avg_rating).toFixed(1)} (${recipe.rating_count} rating${recipe.rating_count === 1 ? '' : 's'})`
                : 'No ratings yet'}
            </Text>
          </View>

          <View style={styles.rateDivider} />

          <Text style={[styles.cardLabel, { color: colors.text }]}>
            {recipe.my_rating ? 'Your Rating' : 'Rate this recipe'}
          </Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((i) => (
              <TouchableOpacity
                key={i}
                onPress={() => handleRate(i)}
                disabled={submittingRating}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <Ionicons
                  name={(recipe.my_rating ?? 0) >= i ? 'star' : 'star-outline'}
                  size={30}
                  color="#F5A623"
                  style={{ marginRight: 4 }}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {recipe.locked ? (
          <View style={[styles.lockedCard, { backgroundColor: colors.card }]}>
            <View style={styles.lockIconBg}><Ionicons name="lock-closed" size={32} color={RED} /></View>
            <Text style={[styles.lockedTitle, { color: colors.text }]}>{t('recipe.locked')}</Text>
            <Text style={[styles.lockedDesc, { color: colors.subtext }]}>{t('recipe.locked_desc')}</Text>
            <TouchableOpacity style={styles.unlockBtn} onPress={() => setShowPayModal(true)}>
              <Ionicons name="lock-open-outline" size={16} color="#fff" />
              <Text style={styles.unlockBtnText}>Unlock for ${Number(recipe.price_usd ?? 0).toFixed(2)}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
          {/* Servings */}
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <Text style={[styles.cardLabel, { color: colors.text }]}>{t('recipe.how_many')}</Text>
              <View style={styles.servingsRow}>
                <TouchableOpacity style={[styles.servingBtn, { borderColor: RED }]} onPress={() => setServings(Math.max(1, servings - 1))}>
                  <Ionicons name="remove" size={18} color={RED} />
                </TouchableOpacity>
                <Text style={[styles.servingsNum, { color: colors.text }]}>{servings}</Text>
                <TouchableOpacity style={[styles.servingBtn, { borderColor: RED }]} onPress={() => setServings(servings + 1)}>
                  <Ionicons name="add" size={18} color={RED} />
                </TouchableOpacity>
                <Text style={[styles.servingsLabel, { color: colors.subtext }]}>{servings === 1 ? t('recipe.person') : t('recipe.people')}</Text>
              </View>
            </View>

            {/* Taste Preference — hide for desserts */}
            {!isDessert && (
              <View style={[styles.card, { backgroundColor: colors.card }]}>
                <Text style={[styles.cardLabel, { color: colors.text }]}>{t('recipe.taste_preference')}</Text>
                <View style={styles.tasteRow}>
                  {TASTE_OPTIONS.map((taste) => (
                    <TouchableOpacity
                      key={taste}
                      style={[styles.tasteBtn, { borderColor: selectedTaste === taste ? RED : colors.border }, selectedTaste === taste && { backgroundColor: RED }]}
                      onPress={() => setSelectedTaste(selectedTaste === taste ? null : taste)}
                    >
                      <Text style={[styles.tasteBtnText, { color: selectedTaste === taste ? '#fff' : colors.text }]}>
                        {t('tastes.' + taste)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {selectedTaste && (
                  <View style={styles.tasteTip}>
                    <Ionicons name="bulb-outline" size={16} color={RED} />
                    <Text style={[styles.tasteTipText, { color: colors.subtext }]}>
                      {isKhmer ? TASTE_TIPS_KM[selectedTaste] : TASTE_TIPS[selectedTaste]}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Ingredients preview — tap to check off while prepping */}
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: RED + '22' }]}>
                  <Ionicons name="list" size={18} color={RED} />
                </View>
                <Text style={[styles.cardLabel, { color: colors.text, marginBottom: 0 }]}>{t('recipe.ingredients')} ({t('recipe.for')} {servings})</Text>
              </View>
              {scaledIngredients.map((ing, i) => (
                <TouchableOpacity key={i} style={styles.ingredientRow} onPress={() => toggleIngredient(i)} activeOpacity={0.6}>
                  <IngredientIcon name={ing} size={36} />
                  <Text style={[
                    styles.ingredientText,
                    { color: colors.subtext },
                    checkedIngredients.has(i) && styles.ingredientTextChecked,
                  ]}>{ing}</Text>
                  <View style={[styles.checkbox, checkedIngredients.has(i) && styles.checkboxChecked]}>
                    {checkedIngredients.has(i) && <Ionicons name="checkmark" size={12} color="#fff" />}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Step-by-step cooking guide — in-page card, one step at a time */}
            {parsedSteps.length > 0 && (
              <View style={[styles.stepCard, { backgroundColor: colors.card, borderColor: RED }]}>
                <View style={styles.stepHeader}>
                  <Text style={[styles.stepCounter, { color: RED }]}>
                    {t('recipe.step')} {currentStep + 1} {t('recipe.of')} {parsedSteps.length}
                  </Text>
                  {stepDuration && (
                    <View style={styles.stepDurationPill}>
                      <Ionicons name="time-outline" size={13} color={RED} />
                      <Text style={styles.stepDurationText}>{stepDuration}</Text>
                    </View>
                  )}
                </View>

                  <StepAnimation technique={technique} />

                  <IngredientChips ingredients={stepIngredients} />

                <Text style={[styles.stepText, { color: colors.text }]}>
                  {highlightSegments.map((seg, i) => (
                    <Text key={i} style={seg.hl ? styles.stepTextHighlight : undefined}>
                      {seg.text}
                    </Text>
                  ))}
                </Text>

                <TouchableOpacity style={styles.readAloudBtn} onPress={() => activeStep && handleReadAloud(activeStep.text)}>
                  <Ionicons name="volume-high-outline" size={16} color={RED} />
                  <Text style={styles.readAloudText}>{t('recipe.read_aloud')}</Text>
                </TouchableOpacity>

                <View style={[styles.tipBox, { backgroundColor: RED + '10' }]}>
                  <Ionicons name="bulb-outline" size={16} color={RED} />
                  <Text style={[styles.tipText, { color: colors.subtext }]}>{techniqueTip}</Text>
                </View>

                {donenessCue && (
                  <View style={[styles.tipBox, { backgroundColor: '#2E7D3215' }]}>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#2E7D32" />
                    <Text style={[styles.tipText, { color: colors.subtext }]}>
                      {isKhmer ? donenessCue.km : donenessCue.en}
                    </Text>
                  </View>
                )}

                <View style={styles.stepNavRow}>
                  <TouchableOpacity
                    style={[styles.stepNavBtn, { borderColor: RED }, currentStep === 0 && styles.stepNavBtnDisabled]}
                    onPress={() => setCurrentStep((s) => Math.max(0, s - 1))}
                    disabled={currentStep === 0}
                  >
                    <Ionicons name="chevron-back" size={18} color={currentStep === 0 ? '#B0B0B0' : RED} />
                    <Text style={[styles.stepNavText, { color: currentStep === 0 ? '#B0B0B0' : RED }]}>{t('recipe.back')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.stepNavBtn, styles.stepNavBtnPrimary, currentStep === parsedSteps.length - 1 && styles.stepNavBtnDisabled]}
                    onPress={() => setCurrentStep((s) => Math.min(parsedSteps.length - 1, s + 1))}
                    disabled={currentStep === parsedSteps.length - 1}
                  >
                    <Text style={styles.stepNavTextPrimary}>{t('recipe.next')}</Text>
                    <Ionicons name="chevron-forward" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}
        <View style={{ height: 40 }} />
      </View>

      {/* Fake payment confirmation — no real card is charged */}
      <Modal
        visible={showPayModal}
        transparent
        animationType="fade"
        onRequestClose={() => !unlocking && setShowPayModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <View style={styles.modalIconBg}>
              <Ionicons name="card-outline" size={28} color={RED} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Order Summary</Text>
            <Text style={[styles.modalRecipeTitle, { color: colors.subtext }]} numberOfLines={1}>
              Review your order before paying
            </Text>

            <View style={[styles.receiptBox, { borderColor: colors.border }]}>
              <View style={styles.receiptRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.receiptItemTitle, { color: colors.text }]} numberOfLines={2}>
                    {recipe.title}
                  </Text>
                  {recipe.chef_name && (
                    <Text style={[styles.receiptItemMeta, { color: colors.subtext }]}>
                      by {recipe.chef_name}
                    </Text>
                  )}
                </View>
                <Text style={[styles.receiptItemPrice, { color: colors.text }]}>
                  ${Number(recipe.price_usd ?? 0).toFixed(2)}
                </Text>
              </View>

              <View style={[styles.receiptDivider, { backgroundColor: colors.border }]} />

              <View style={styles.receiptRow}>
                <Text style={[styles.receiptTotalLabel, { color: colors.text }]}>Total</Text>
                <Text style={[styles.receiptTotalPrice, { color: RED }]}>
                  ${Number(recipe.price_usd ?? 0).toFixed(2)}
                </Text>
              </View>
            </View>

            <Text style={[styles.paymentMethodLabel, { color: colors.subtext }]}>Payment Method</Text>
            <View style={styles.fakeCardRow}>
              <Ionicons name="card" size={18} color={colors.subtext} />
              <Text style={[styles.fakeCardText, { color: colors.subtext }]}>•••• •••• •••• 4242</Text>
            </View>

            <TouchableOpacity
              style={[styles.payBtn, unlocking && { opacity: 0.6 }]}
              onPress={handleUnlock}
              disabled={unlocking}
            >
              <Text style={styles.payBtnText}>
                {unlocking ? 'Processing...' : `Pay $${Number(recipe.price_usd ?? 0).toFixed(2)}`}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setShowPayModal(false)}
              disabled={unlocking}
            >
              <Text style={[styles.cancelBtnText, { color: colors.subtext }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hero: { width, height: 300, alignItems: 'center', justifyContent: 'center' },
  heroButtons: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20 },
  heroBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#00000044', alignItems: 'center', justifyContent: 'center' },
  inlineBadges: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  badge: { backgroundColor: '#00000055', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  content: { borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -24, padding: 20, paddingTop: 24 },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 8, lineHeight: 32 },
    description: { fontSize: 15, lineHeight: 28, marginBottom: 20 },
  card: { borderRadius: 18, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardLabel: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  ratingSummaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  starsRow: { flexDirection: 'row', alignItems: 'center' },
  ratingSummaryText: { fontSize: 13 },
  rateDivider: { height: 1, backgroundColor: 'rgba(150,150,150,0.2)', marginVertical: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  sectionIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  servingsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  servingBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  servingsNum: { fontSize: 22, fontWeight: 'bold', minWidth: 30, textAlign: 'center' },
  servingsLabel: { fontSize: 14 },
  tasteRow: { flexDirection: 'row', gap: 10 },
  tasteBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  tasteBtnText: { fontSize: 14, fontWeight: '600' },
  tasteTip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 10,
    backgroundColor: '#FDEDEC',
    borderRadius: 10,
  },
   tasteTipText: { fontSize: 13, flex: 1, lineHeight: 22 },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  checkbox: {
    width: 20, height: 20, borderRadius: 6,
    borderWidth: 1.5, borderColor: '#D0D0D0',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: RED, borderColor: RED },
    ingredientText: { fontSize: 14, flex: 1, lineHeight: 22 },
  ingredientTextChecked: { textDecorationLine: 'line-through', opacity: 0.5 },
  stepCard: { borderRadius: 20, borderWidth: 1.5, padding: 20, marginBottom: 14 },
  stepHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  stepCounter: { fontSize: 14, fontWeight: '700' },
  stepDurationPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#D6282815', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  stepDurationText: { fontSize: 12, fontWeight: '600', color: RED },
    stepText: { fontSize: 16, lineHeight: 30, marginBottom: 14, textAlign: 'center' },
  stepTextHighlight: { color: RED, fontWeight: '700' },
  readAloudBtn: { flexDirection: 'row', alignSelf: 'center', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: RED, marginBottom: 14 },
  readAloudText: { fontSize: 13, fontWeight: '600', color: RED },
  tipBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 12, marginBottom: 10 },
    tipText: { fontSize: 13, flex: 1, lineHeight: 22 },
  stepNavRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  stepNavBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5 },
  stepNavBtnPrimary: { backgroundColor: RED, borderColor: RED },
  stepNavBtnDisabled: { opacity: 0.4 },
  stepNavText: { fontSize: 15, fontWeight: '700' },
  stepNavTextPrimary: { fontSize: 15, fontWeight: '700', color: '#fff' },
  lockedCard: { borderRadius: 20, padding: 28, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  lockIconBg: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#D6282822', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  lockedTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  lockedDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20, paddingHorizontal: 10 },
  unlockBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: RED, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, gap: 8, shadowColor: RED, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  unlockBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  chefRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
  chefName: { fontSize: 13, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { width: '100%', maxWidth: 340, borderRadius: 22, padding: 24, alignItems: 'center' },
  modalIconBg: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#D6282822', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  modalRecipeTitle: { fontSize: 13, marginBottom: 18, textAlign: 'center' },
  receiptBox: { width: '100%', borderWidth: 1.5, borderRadius: 14, padding: 14, marginBottom: 16 },
  receiptRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  receiptItemTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  receiptItemMeta: { fontSize: 12 },
  receiptItemPrice: { fontSize: 14, fontWeight: '700', marginLeft: 10 },
  receiptDivider: { height: 1, marginVertical: 12 },
  receiptTotalLabel: { fontSize: 15, fontWeight: '800' },
  receiptTotalPrice: { fontSize: 18, fontWeight: '800' },
  paymentMethodLabel: { fontSize: 12, fontWeight: '600', alignSelf: 'flex-start', marginBottom: 8 },
  fakeCardRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F5F5F5', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, width: '100%', marginBottom: 16 },
  fakeCardText: { fontSize: 14, letterSpacing: 1 },
  payBtn: { backgroundColor: RED, borderRadius: 14, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', width: '100%', marginBottom: 10 },
  payBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancelBtn: { paddingVertical: 6 },
  cancelBtnText: { fontSize: 14, fontWeight: '600' },
});