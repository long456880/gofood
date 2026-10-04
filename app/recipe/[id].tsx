import IngredientIcon from '@/components/IngredientIcon';
import { Image } from 'expo-image';
import StepAnimation, { getTechnique } from '@/components/StepAnimation';
import { apiFetch } from '@/lib/api-fetch';
import { detectStepIngredients } from '@/lib/ingredient-utils';
import {
  formatDuration,
  getGlossaryTip,
  getHighlightSegments,
  parseSteps,
  RED,
  scaleIngredients,
  splitIngredientAmount,
} from '@/lib/recipe-utils';
import { useTheme } from '@/lib/theme-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import QRCode from 'react-native-qrcode-svg';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  progress_image_1?: string | null;
  progress_image_2?: string | null;
  ingredients?: string;
  description_km?: string;
  ingredients_km?: string;
  steps?: string;
  steps_km?: string;
  price_usd?: number;
  chef_id?: string;
  chef_name?: string;
  created_at?: string;
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
  const [favorited, setFavorited] = useState(false);
  const [servings, setServings] = useState(2);
  const [selectedTaste, setSelectedTaste] = useState<string | null>(null);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [canReport, setCanReport] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [showPayModal, setShowPayModal] = useState(false);
  const [khqr, setKhqr] = useState<{ qr: string; md5: string; expiresAt: number } | null>(null);
  const [khqrStatus, setKhqrStatus] = useState<'loading' | 'ready' | 'expired' | 'error'>('loading');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [payMethod, setPayMethod] = useState<'bakong' | 'card'>('bakong');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardError, setCardError] = useState<string | null>(null);
  const [cardProcessing, setCardProcessing] = useState(false);

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
    // A removed or hidden recipe comes back as an error object, not a recipe —
    // storing it would crash the screen, so show "not found" instead.
    if (!res.ok) {
      setRecipe(null);
      return;
    }
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

  // Only regular (home_cook) accounts can report a recipe as copied — a
  // chef reporting another chef's recipe is a dispute for the admin to
  // sort out during review, not a self-service action.
  const checkCanReport = async () => {
    try {
      const res = await apiFetch('/api/profile');
      const data = await res.json();
      setCanReport(data.account_type === 'home_cook');
    } catch {
      setCanReport(false);
    }
  };

  useEffect(() => {
    setCurrentStep(0);
    fetchRecipe().finally(() => setLoading(false));
    checkFavorite();
    checkCanReport();
  }, [id]);

  const handleReport = () => {
    setReportReason('');
    setShowReportModal(true);
  };

  const submitReport = async () => {
    if (!reportReason.trim()) {
      Alert.alert(t('recipe_detail_screen.report_reason_required_title'), t('recipe_detail_screen.report_reason_required_message'));
      return;
    }
    setReporting(true);
    try {
      const res = await apiFetch(`/api/recipes/${id}/report`, {
        method: 'POST',
        body: JSON.stringify({ reason: reportReason.trim() }),
      });
      if (res.ok) {
        setShowReportModal(false);
        Alert.alert(t('recipe_detail_screen.report_sent_title'), t('recipe_detail_screen.report_sent_message'));
      } else if (res.status === 409) {
        setShowReportModal(false);
        Alert.alert(t('recipe_detail_screen.report_already_title'), t('recipe_detail_screen.report_already_message'));
      } else {
        Alert.alert(t('common.failed'), t('common.connection_error'));
      }
    } catch {
      Alert.alert(t('common.failed'), t('common.connection_error'));
    } finally {
      setReporting(false);
    }
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  // A single verification check. Bakong's Open API has a tight daily request
  // quota, so this is called sparingly: once every 25s as a fallback, plus
  // once immediately whenever the app comes back to the foreground — which
  // is when a check actually has a chance of finding anything, since paying
  // means leaving GoFood for a banking app and coming back.
  const checkPayment = async (md5: string) => {
    try {
      const res = await apiFetch(`/api/recipes/${id}/unlock`, {
        method: 'POST',
        body: JSON.stringify({ md5 }),
      });
      if (res.ok) {
        stopPolling();
        setShowPayModal(false);
        Alert.alert(t('recipe_detail_screen.payment_successful_title'), t('recipe.enjoy'));
        fetchRecipe();
      } else if (res.status !== 402) {
        // 402 just means Bakong hasn't seen the payment yet — keep polling.
        // Anything else (eg. verification temporarily unavailable) is a
        // real failure, so stop instead of waiting forever.
        stopPolling();
        setKhqrStatus('error');
      }
    } catch {
      // Network hiccup — the next check will retry.
    }
  };

  const startPolling = (md5: string, expiresAt: number) => {
    stopPolling();
    pollRef.current = setInterval(() => {
      if (Date.now() > expiresAt) {
        stopPolling();
        setKhqrStatus('expired');
        return;
      }
      checkPayment(md5);
    }, 25000);
  };

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && showPayModal && khqrStatus === 'ready' && khqr) {
        checkPayment(khqr.md5);
      }
    });
    return () => sub.remove();
  }, [showPayModal, khqrStatus, khqr]);

  const requestKhqr = async () => {
    setKhqrStatus('loading');
    setKhqr(null);
    try {
      const res = await apiFetch(`/api/recipes/${id}/khqr`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setKhqrStatus('error');
        return;
      }
      setKhqr(data);
      setKhqrStatus('ready');
      startPolling(data.md5, data.expiresAt);
    } catch {
      setKhqrStatus('error');
    }
  };

  const openPayModal = () => {
    setPayMethod('bakong');
    setCardNumber('');
    setCardExpiry('');
    setCardCvc('');
    setCardName('');
    setCardError(null);
    setShowPayModal(true);
    requestKhqr();
  };

  const closePayModal = () => {
    stopPolling();
    setShowPayModal(false);
  };

  useEffect(() => stopPolling, []);

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatCardExpiry = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  };

  // This never talks to a real card network — it's a stand-in for Bakong so
  // the app has a second payment option to demo. It only checks that the
  // fields look like a card (so it isn't a one-tap "pay"), then credits the
  // purchase the same way a verified Bakong payment does.
  const handleCardPay = async () => {
    if (cardNumber.replace(/\s/g, '').length !== 16) {
      setCardError(t('recipe_detail_screen.card_number_invalid'));
      return;
    }
    if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
      setCardError(t('recipe_detail_screen.card_expiry_invalid'));
      return;
    }
    if (cardCvc.length < 3) {
      setCardError(t('recipe_detail_screen.card_cvc_invalid'));
      return;
    }
    if (cardName.trim().length === 0) {
      setCardError(t('recipe_detail_screen.card_name_invalid'));
      return;
    }

    setCardError(null);
    setCardProcessing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      const res = await apiFetch(`/api/recipes/${id}/mock-pay`, { method: 'POST' });
      if (!res.ok) {
        setCardError(t('recipe_detail_screen.payment_setup_failed'));
        return;
      }
      setShowPayModal(false);
      Alert.alert(t('recipe_detail_screen.payment_successful_title'), t('recipe.enjoy'));
      fetchRecipe();
    } catch {
      setCardError(t('common.connection_error'));
    } finally {
      setCardProcessing(false);
    }
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
        Alert.alert(t('common.failed'), t('recipe_detail_screen.rating_failed'));
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
      Alert.alert(t('common.failed'), t('common.connection_error'));
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

  if (loading) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={RED} /></View>;
  }

  if (!recipe) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingHorizontal: 32 }]}>
        <Ionicons name="trash-outline" size={48} color={colors.subtext} />
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 14, textAlign: 'center' }}>
          {t('recipe_detail_screen.removed_title')}
        </Text>
        <Text style={{ color: colors.subtext, fontSize: 14, lineHeight: 20, marginTop: 8, textAlign: 'center' }}>
          {t('recipe_detail_screen.removed_desc')}
        </Text>
        <TouchableOpacity
          style={{ marginTop: 22, backgroundColor: RED, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14 }}
          onPress={() => router.back()}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{t('recipe.back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const displayDescription = (isKhmer && recipe.description_km) ? recipe.description_km : recipe.description;
  const displayIngredients = (isKhmer && recipe.ingredients_km) ? recipe.ingredients_km : recipe.ingredients;
  const displaySteps = (isKhmer && recipe.steps_km) ? recipe.steps_km : recipe.steps;
  const scaledIngredients = displayIngredients ? scaleIngredients(displayIngredients, servings) : [];
  const ingredientNames = displayIngredients ? displayIngredients.split(',').map((s) => s.trim()).filter(Boolean) : [];
  const parsedSteps = displaySteps ? parseSteps(displaySteps) : [];

  const activeStep = parsedSteps[currentStep];
  const technique = activeStep ? getTechnique(activeStep.text) : 'general';
  const nextStep = parsedSteps[currentStep + 1];
  const nextTechnique = nextStep ? getTechnique(nextStep.text) : undefined;

  const englishSteps = recipe.steps ? parseSteps(recipe.steps) : [];
  const englishIngredientNames = recipe.ingredients
    ? recipe.ingredients.split(',').map((s) => s.trim()).filter(Boolean)
    : [];
  const englishActiveStep = englishSteps[currentStep];
  const stepIngredientMatches = englishActiveStep
    ? detectStepIngredients(englishActiveStep.text, englishIngredientNames)
    : [];
  const glossaryTip = activeStep ? getGlossaryTip(activeStep.text, isKhmer) : null;
  const stepDuration = activeStep && activeStep.minutes.length > 0 ? formatDuration(activeStep.minutes[0]) : null;
  const highlightSegments = activeStep ? getHighlightSegments(activeStep.text, ingredientNames) : [];

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
        {recipe.image_url && (
          <Image source={{ uri: recipe.image_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
        )}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#00000033' }]} pointerEvents="none" />
        <View style={[styles.heroButtons, { top: insets.top + 12 }]}>
          <TouchableOpacity style={styles.heroBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#fff" style={{ marginLeft: -2 }} />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {canReport && (
              <TouchableOpacity style={styles.heroBtn} onPress={handleReport} disabled={reporting}>
                <Ionicons name="flag-outline" size={20} color="#fff" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.heroBtn} onPress={handleFavorite}>
              <Ionicons name={favorited ? 'heart' : 'heart-outline'} size={22} color={favorited ? RED : '#fff'} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Content */}
      <View style={[styles.content, { backgroundColor: dark ? colors.background : WARM_BG }]}>
        <View style={styles.inlineBadges}>
          <View style={styles.badge}><Text style={styles.badgeText}>{recipe.cuisine}</Text></View>
          {recipe.is_free
            ? <View style={[styles.badge, { backgroundColor: '#2E7D32' }]}><Text style={styles.badgeText}>{t('recipe_detail_screen.free_badge')}</Text></View>
            : <View style={[styles.badge, { backgroundColor: RED }]}><Text style={styles.badgeText}>${Number(recipe.price_usd ?? 0).toFixed(2)}</Text></View>
          }
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{recipe.title}</Text>
        {(recipe.chef_name || recipe.created_at) && (
          <View style={styles.chefRow}>
            {recipe.chef_name && (
              <Text style={[styles.chefName, { color: colors.subtext }]}>{t('my_orders_screen.by_chef', { name: recipe.chef_name })}</Text>
            )}
            {recipe.created_at && (
              <Text style={[styles.chefName, { color: colors.subtext }]}>
                {recipe.chef_name ? ' · ' : ''}
                {t('recipe_detail_screen.published_on', {
                  date: new Date(recipe.created_at).toLocaleDateString(),
                })}
              </Text>
            )}
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
              {Number(recipe.rating_count) > 0
                ? t('recipe_detail_screen.rating_count', {
                    count: Number(recipe.rating_count),
                    avg: Number(recipe.avg_rating).toFixed(1),
                  })
                : t('recipe_detail_screen.no_ratings_yet')}
            </Text>
          </View>

          <View style={styles.rateDivider} />

          <Text style={[styles.cardLabel, { color: colors.text }]}>
            {recipe.my_rating ? t('recipe_detail_screen.your_rating') : t('recipe_detail_screen.rate_this_recipe')}
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
            <TouchableOpacity style={styles.unlockBtn} onPress={openPayModal}>
              <Text style={styles.unlockBtnText}>{t('recipe.unlock_for_price', { price: Number(recipe.price_usd ?? 0).toFixed(2) })}</Text>
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
              {scaledIngredients.map((ing, i) => {
                const { amount, name } = splitIngredientAmount(ing);
                const checked = checkedIngredients.has(i);
                return (
                  <TouchableOpacity key={i} style={styles.ingredientRow} onPress={() => toggleIngredient(i)} activeOpacity={0.6}>
                    <IngredientIcon name={name || ing} size={36} />
                    <View style={styles.ingredientTextWrap}>
                      <Text
                        style={[styles.ingredientAmount, { color: RED }, checked && styles.ingredientTextChecked]}
                        numberOfLines={1}
                      >
                        {amount}
                      </Text>
                      <Text
                        style={[styles.ingredientText, { color: colors.text }, checked && styles.ingredientTextChecked]}
                        numberOfLines={1}
                      >
                        {name || ing}
                      </Text>
                    </View>
                    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                      {checked && <Ionicons name="checkmark" size={12} color="#fff" />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Timers — every step that names a time, at a glance, before
                diving into the one-at-a-time guide below */}
            {parsedSteps.some((s) => s.minutes.length > 0) && (
              <View style={[styles.card, { backgroundColor: colors.card }]}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIcon, { backgroundColor: RED + '22' }]}>
                    <Ionicons name="time-outline" size={18} color={RED} />
                  </View>
                  <Text style={[styles.cardLabel, { color: colors.text, marginBottom: 0 }]}>{t('recipe.timers')}</Text>
                </View>
                {parsedSteps.map((step, i) => {
                  if (step.minutes.length === 0) return null;
                  const label = step.text.replace(/^[0-9០-៩]+\.\s*/, '');
                  return (
                    <TouchableOpacity
                      key={i}
                      style={styles.timerRow}
                      onPress={() => setCurrentStep(i)}
                      activeOpacity={0.6}
                    >
                      <View style={[styles.timerStepNum, { borderColor: RED }]}>
                        <Text style={{ color: RED, fontSize: 12, fontWeight: '700' }}>{i + 1}</Text>
                      </View>
                      <Text style={[styles.timerStepText, { color: colors.text }]}>
                        {label}
                      </Text>
                      <View style={styles.stepDurationPill}>
                        <Text style={styles.stepDurationText}>{formatDuration(step.minutes[0])}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
                <Text style={[styles.timersHint, { color: colors.subtext }]}>{t('recipe.timers_hint')}</Text>
              </View>
            )}

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

                {/* One segment per step — shows where you are and how much is left */}
                <View style={styles.stepProgress}>
                  {parsedSteps.map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.stepProgressSeg,
                        { backgroundColor: i <= currentStep ? RED : colors.border },
                        i === currentStep && styles.stepProgressSegActive,
                      ]}
                    />
                  ))}
                </View>

                <StepAnimation
                  technique={technique}
                  nextTechnique={nextTechnique}
                  ingredients={stepIngredientMatches.map((m) => m.name)}
                  ingredientLabels={stepIngredientMatches.map((m) => scaledIngredients[m.listIndex] ?? m.name)}
                  stepText={`${activeStep?.text ?? ''} ${englishActiveStep?.text ?? ''}`}
                  stepKey={currentStep}
                  timerLabel={stepDuration}
                />

                <Text style={[styles.stepText, { color: colors.text }]}>
                  {highlightSegments.map((seg, i) => (
                    <Text key={i} style={seg.hl ? styles.stepTextHighlight : undefined}>
                      {seg.text}
                    </Text>
                  ))}
                </Text>

                {glossaryTip && (
                  <Text style={[styles.glossaryTipText, { color: colors.text, backgroundColor: colors.input }]}>
                    {glossaryTip}
                  </Text>
                )}

                <View style={styles.stepNavRow}>
                  <TouchableOpacity
                    style={[styles.stepNavBtn, { borderColor: RED }, currentStep === 0 && styles.stepNavBtnDisabled]}
                    onPress={() => setCurrentStep((s) => Math.max(0, s - 1))}
                    disabled={currentStep === 0}
                  >
                    <Text style={[styles.stepNavText, { color: currentStep === 0 ? '#B0B0B0' : RED }]}>{t('recipe.back')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.stepNavBtn, styles.stepNavBtnPrimary]}
                    onPress={() => {
                      if (currentStep === parsedSteps.length - 1) {
                        setShowCompleteModal(true);
                      } else {
                        setCurrentStep((s) => Math.min(parsedSteps.length - 1, s + 1));
                      }
                    }}
                  >
                    <Text style={styles.stepNavTextPrimary}>
                      {currentStep === parsedSteps.length - 1 ? t('recipe.finish') : t('recipe.next')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}
        <View style={{ height: 40 }} />
      </View>

      {/* Bakong KHQR payment */}
      <Modal
        visible={showPayModal}
        transparent
        animationType="fade"
        onRequestClose={closePayModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <View style={styles.modalIconBg}>
              <Ionicons name="qr-code-outline" size={28} color={RED} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('recipe_detail_screen.order_summary')}</Text>
            <Text style={[styles.modalRecipeTitle, { color: colors.subtext }]} numberOfLines={1}>
              {t('recipe_detail_screen.review_order')}
            </Text>

            <View style={[styles.receiptBox, { borderColor: colors.border }]}>
              <View style={styles.receiptRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.receiptItemTitle, { color: colors.text }]} numberOfLines={2}>
                    {recipe.title}
                  </Text>
                  {recipe.chef_name && (
                    <Text style={[styles.receiptItemMeta, { color: colors.subtext }]}>
                      {t('my_orders_screen.by_chef', { name: recipe.chef_name })}
                    </Text>
                  )}
                </View>
                <Text style={[styles.receiptItemPrice, { color: colors.text }]}>
                  ${Number(recipe.price_usd ?? 0).toFixed(2)}
                </Text>
              </View>

              <View style={[styles.receiptDivider, { backgroundColor: colors.border }]} />

              <View style={styles.receiptRow}>
                <Text style={[styles.receiptTotalLabel, { color: colors.text }]}>{t('recipe_detail_screen.total')}</Text>
                <Text style={[styles.receiptTotalPrice, { color: RED }]}>
                  ${Number(recipe.price_usd ?? 0).toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={[styles.payTabRow, { borderColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.payTab, payMethod === 'bakong' && styles.payTabActive]}
                onPress={() => setPayMethod('bakong')}
              >
                <Ionicons name="qr-code-outline" size={16} color={payMethod === 'bakong' ? '#fff' : colors.subtext} />
                <Text style={[styles.payTabText, { color: payMethod === 'bakong' ? '#fff' : colors.subtext }]}>
                  {t('recipe_detail_screen.pay_with_bakong')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.payTab, payMethod === 'card' && styles.payTabActive]}
                onPress={() => setPayMethod('card')}
              >
                <Ionicons name="card-outline" size={16} color={payMethod === 'card' ? '#fff' : colors.subtext} />
                <Text style={[styles.payTabText, { color: payMethod === 'card' ? '#fff' : colors.subtext }]}>
                  {t('recipe_detail_screen.pay_with_card')}
                </Text>
              </TouchableOpacity>
            </View>

            {payMethod === 'card' && (
              <View style={styles.cardForm}>
                <Text style={[styles.cardFieldLabel, { color: colors.subtext }]}>
                  {t('recipe_detail_screen.card_number_label')}
                </Text>
                <TextInput
                  style={[styles.cardInput, { color: colors.text, borderColor: colors.border }]}
                  value={cardNumber}
                  onChangeText={(v) => setCardNumber(formatCardNumber(v))}
                  placeholder={t('recipe_detail_screen.card_number_placeholder')}
                  placeholderTextColor={colors.subtext}
                  keyboardType="number-pad"
                  maxLength={19}
                />

                <View style={styles.cardRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardFieldLabel, { color: colors.subtext }]}>
                      {t('recipe_detail_screen.card_expiry_label')}
                    </Text>
                    <TextInput
                      style={[styles.cardInput, { color: colors.text, borderColor: colors.border }]}
                      value={cardExpiry}
                      onChangeText={(v) => setCardExpiry(formatCardExpiry(v))}
                      placeholder="MM/YY"
                      placeholderTextColor={colors.subtext}
                      keyboardType="number-pad"
                      maxLength={5}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardFieldLabel, { color: colors.subtext }]}>
                      {t('recipe_detail_screen.card_cvc_label')}
                    </Text>
                    <TextInput
                      style={[styles.cardInput, { color: colors.text, borderColor: colors.border }]}
                      value={cardCvc}
                      onChangeText={(v) => setCardCvc(v.replace(/\D/g, '').slice(0, 4))}
                      placeholder="CVC"
                      placeholderTextColor={colors.subtext}
                      keyboardType="number-pad"
                      secureTextEntry
                      maxLength={4}
                    />
                  </View>
                </View>

                <Text style={[styles.cardFieldLabel, { color: colors.subtext }]}>
                  {t('recipe_detail_screen.card_name_label')}
                </Text>
                <TextInput
                  style={[styles.cardInput, { color: colors.text, borderColor: colors.border }]}
                  value={cardName}
                  onChangeText={setCardName}
                  placeholder={t('recipe_detail_screen.card_name_placeholder')}
                  placeholderTextColor={colors.subtext}
                  autoCapitalize="words"
                />

                {cardError && <Text style={styles.cardErrorText}>{cardError}</Text>}

                <TouchableOpacity
                  style={[styles.payBtn, cardProcessing && { opacity: 0.7 }]}
                  onPress={handleCardPay}
                  disabled={cardProcessing}
                >
                  {cardProcessing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.payBtnText}>
                      {t('recipe_detail_screen.pay_now_button', { amount: Number(recipe.price_usd ?? 0).toFixed(2) })}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {payMethod === 'bakong' && (
            <View style={styles.khqrBox}>
              {khqrStatus === 'loading' && (
                <View style={styles.khqrStatusWrap}>
                  <ActivityIndicator size="large" color={RED} />
                </View>
              )}

              {khqrStatus === 'ready' && khqr && (
                <>
                  <View style={styles.khqrCodeWrap}>
                    <QRCode value={khqr.qr} size={190} />
                  </View>
                  <Text style={[styles.khqrHint, { color: colors.text }]}>
                    {t('recipe_detail_screen.scan_to_pay')}
                  </Text>
                  <View style={styles.khqrWaitingRow}>
                    <ActivityIndicator size="small" color={RED} />
                    <Text style={[styles.khqrWaitingText, { color: colors.subtext }]}>
                      {t('recipe_detail_screen.waiting_for_payment')}
                    </Text>
                  </View>
                </>
              )}

              {khqrStatus === 'expired' && (
                <View style={styles.khqrStatusWrap}>
                  <Ionicons name="time-outline" size={30} color={colors.subtext} />
                  <Text style={[styles.khqrHint, { color: colors.text }]}>
                    {t('recipe_detail_screen.code_expired')}
                  </Text>
                  <TouchableOpacity style={styles.khqrRetryBtn} onPress={requestKhqr}>
                    <Text style={styles.khqrRetryBtnText}>{t('recipe_detail_screen.get_new_code')}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {khqrStatus === 'error' && (
                <View style={styles.khqrStatusWrap}>
                  <Ionicons name="alert-circle-outline" size={30} color={RED} />
                  <Text style={[styles.khqrHint, { color: colors.text }]}>
                    {t('recipe_detail_screen.payment_setup_failed')}
                  </Text>
                  <TouchableOpacity style={styles.khqrRetryBtn} onPress={requestKhqr}>
                    <Text style={styles.khqrRetryBtnText}>{t('common.retry')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            )}

            <TouchableOpacity style={styles.cancelBtn} onPress={closePayModal}>
              <Text style={[styles.cancelBtnText, { color: colors.subtext }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Recipe complete */}
      <Modal
        visible={showCompleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCompleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <View style={styles.modalIconBg}>
              <Ionicons name="checkmark-circle" size={30} color={RED} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('recipe.complete_title')}</Text>
            <Text style={[styles.modalRecipeTitle, { color: colors.subtext }]}>
              {t('recipe.complete_message')}
            </Text>

            <TouchableOpacity style={styles.payBtn} onPress={() => setShowCompleteModal(false)}>
              <Text style={styles.payBtnText}>{t('recipe.done')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Report reason */}
      <Modal
        visible={showReportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, alignItems: 'stretch' }]}>
            <Text style={[styles.modalTitle, { color: colors.text, textAlign: 'center' }]}>
              {t('recipe_detail_screen.report_title')}
            </Text>
            <Text style={[styles.modalRecipeTitle, { color: colors.subtext }]}>
              {t('recipe_detail_screen.report_message')}
            </Text>
            <TextInput
              style={[styles.reportReasonInput, { color: colors.text, borderColor: colors.border }]}
              placeholder={t('recipe_detail_screen.report_reason_placeholder')}
              placeholderTextColor={colors.subtext}
              value={reportReason}
              onChangeText={setReportReason}
              multiline
              autoFocus
            />
            <TouchableOpacity
              style={[styles.payBtn, reporting && { opacity: 0.6 }]}
              onPress={submitReport}
              disabled={reporting}
            >
              <Text style={styles.payBtnText}>
                {reporting ? t('upload_recipe_screen.submitting') : t('recipe_detail_screen.report_confirm')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowReportModal(false)}>
              <Text style={{ color: colors.subtext, textAlign: 'center' }}>{t('common.cancel')}</Text>
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
  timerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  timerStepNum: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
  },
  timerStepText: { flex: 1, fontSize: 13.5 },
  timersHint: { fontSize: 11, textAlign: 'center', marginTop: 2 },
  checkbox: {
    width: 20, height: 20, borderRadius: 6,
    borderWidth: 1.5, borderColor: '#D0D0D0',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: RED, borderColor: RED },
    ingredientTextWrap: { flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  ingredientAmount: { fontSize: 13, fontWeight: '700', minWidth: 56, lineHeight: 22 },
  ingredientText: { fontSize: 14, flex: 1, lineHeight: 22 },
  ingredientTextChecked: { textDecorationLine: 'line-through', opacity: 0.5 },
  stepCard: { borderRadius: 20, borderWidth: 1.5, padding: 20, marginBottom: 14 },
  stepHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  stepCounter: { fontSize: 14, fontWeight: '700' },
  stepProgress: { flexDirection: 'row', gap: 4, marginBottom: 14 },
  stepProgressSeg: { flex: 1, height: 5, borderRadius: 3, opacity: 0.9 },
  stepProgressSegActive: { opacity: 1, height: 7, marginTop: -1 },
  stepDurationPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#D6282815', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  stepDurationText: { fontSize: 12, fontWeight: '600', color: RED },
    stepText: { fontSize: 16, lineHeight: 30, marginBottom: 14, textAlign: 'center' },
  stepTextHighlight: { color: RED, fontWeight: '700' },
  glossaryTipText: { fontSize: 12.5, lineHeight: 18, marginBottom: 12, textAlign: 'center', padding: 10, borderRadius: 12 },
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
  khqrBox: { width: '100%', alignItems: 'center', marginBottom: 16 },
  khqrStatusWrap: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 20 },
  khqrCodeWrap: { padding: 14, borderRadius: 16, backgroundColor: '#fff' },
  khqrHint: { fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: 12 },
  khqrWaitingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  khqrWaitingText: { fontSize: 12.5 },
  khqrRetryBtn: { marginTop: 6, backgroundColor: RED, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 },
  khqrRetryBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  payBtn: { backgroundColor: RED, borderRadius: 14, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', width: '100%', marginBottom: 10 },
  payBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancelBtn: { paddingVertical: 6 },
  reportReasonInput: {
    borderWidth: 1.5, borderRadius: 12, padding: 12, fontSize: 13.5,
    minHeight: 80, textAlignVertical: 'top', marginBottom: 14,
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600' },
  payTabRow: { flexDirection: 'row', width: '100%', borderWidth: 1, borderRadius: 14, padding: 4, marginBottom: 16, gap: 4 },
  payTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  payTabActive: { backgroundColor: RED },
  payTabText: { fontSize: 12.5, fontWeight: '700' },
  cardForm: { width: '100%', marginBottom: 6 },
  cardFieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 10 },
  cardInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  cardRow: { flexDirection: 'row', gap: 12 },
  cardErrorText: { color: RED, fontSize: 12.5, fontWeight: '600', marginTop: 12, marginBottom: 4 },
});