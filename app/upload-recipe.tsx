import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiFetch } from '@/lib/api-fetch';
import { useSession } from '@/lib/supabase';
import { useTheme } from '@/lib/theme-context';

const RED = '#D62828';
const ADMIN_EMAIL = 'feihengkimborat@gmail.com';
const MIN_PRICE = 0.99;
const MAX_PRICE = 4.99;

const CUISINE_OPTIONS = ['Khmer', 'Chinese', 'Japanese', 'Indian', 'Korean', 'Italian', 'French', 'American', 'Mexican'];
const CATEGORY_OPTIONS = ['burger', 'pizza', 'noodles', 'rice', 'cake', 'dessert', 'salad', 'soup', 'other'];
const MEAL_OPTIONS = ['breakfast', 'lunch', 'dinner', 'dessert'];

export default function UploadRecipeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { data: session } = useSession();
  // This account's own uploads skip the review queue (see submit+api.ts), so
  // it gets an extra confirmation instead of the usual pending-review notice.
  const isAdmin = session?.user.email === ADMIN_EMAIL;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cuisine, setCuisine] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [mealType, setMealType] = useState<string | null>(null);
  const [isFree, setIsFree] = useState(true);
  const [priceUsd, setPriceUsd] = useState('2.99');

  const [ingredients, setIngredients] = useState<string[]>([]);
  const [ingredientQty, setIngredientQty] = useState('');
  const [ingredientUnit, setIngredientUnit] = useState('');
  const [ingredientName, setIngredientName] = useState('');
  const [steps, setSteps] = useState<string[]>([]);
  const [stepInput, setStepInput] = useState('');
  const [stepMinutesInput, setStepMinutesInput] = useState('');

  const MAX_PHOTOS = 3;
  type Photo = { base64: string; fileExt: string; previewUri: string };
  const [photos, setPhotos] = useState<Photo[]>([]);

  const [agreedPolicy, setAgreedPolicy] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const addIngredient = () => {
    const qty = ingredientQty.trim();
    const unit = ingredientUnit.trim();
    const name = ingredientName.trim();
    if (!name) return;
    // Quantity is required (not just the unit) so every ingredient carries a
    // number the servings stepper can scale — a chef who skips it silently
    // breaks per-serving math for that line (see scaleIngredients).
    if (!qty) {
      Alert.alert(
        t('upload_recipe_screen.missing_ingredient_qty_title'),
        t('upload_recipe_screen.missing_ingredient_qty_message')
      );
      return;
    }
    setIngredients((prev) => [...prev, [qty, unit, name].filter(Boolean).join(' ')]);
    setIngredientQty('');
    setIngredientUnit('');
    setIngredientName('');
  };
  const removeIngredient = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const addStep = () => {
    const text = stepInput.trim();
    if (!text) return;
    const minutes = stepMinutesInput.trim();
    // Baked into the step text (not stored separately) so it flows through
    // the same minute-parsing the recipe screen already uses for the step
    // timer and the Cook Timers list — one real number from the chef instead
    // of hoping the sentence happens to mention a time.
    const withTimer = minutes ? `${text} (Timer: ${minutes} min)` : text;
    setSteps((prev) => [...prev, withTimer]);
    setStepInput('');
    setStepMinutesInput('');
  };
  const removeStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const pickPhoto = async () => {
    if (photos.length >= MAX_PHOTOS) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('upload_recipe_screen.permission_needed_title'), t('upload_recipe_screen.permission_needed_message'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.6,
      base64: true,
    });
    if (result.canceled || !result.assets[0].base64) return;
    const fileExt = result.assets[0].uri.split('.').pop() || 'jpg';
    setPhotos((prev) => [
      ...prev,
      { base64: result.assets[0].base64!, fileExt, previewUri: result.assets[0].uri },
    ]);
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim() || !cuisine) {
      Alert.alert(t('upload_recipe_screen.missing_info_title'), t('upload_recipe_screen.missing_info_message'));
      return;
    }
    if (ingredients.length === 0) {
      Alert.alert(t('upload_recipe_screen.missing_ingredients_title'), t('upload_recipe_screen.missing_ingredients_message'));
      return;
    }
    if (steps.length === 0) {
      Alert.alert(t('upload_recipe_screen.missing_steps_title'), t('upload_recipe_screen.missing_steps_message'));
      return;
    }
    if (!isFree) {
      const price = Number(priceUsd);
      if (!priceUsd || Number.isNaN(price)) {
        Alert.alert(t('upload_recipe_screen.missing_price_title'), t('upload_recipe_screen.missing_price_message'));
        return;
      }
      if (price < MIN_PRICE || price > MAX_PRICE) {
        Alert.alert(
          t('upload_recipe_screen.invalid_price_range_title'),
          t('upload_recipe_screen.invalid_price_range_message', { min: MIN_PRICE.toFixed(2), max: MAX_PRICE.toFixed(2) })
        );
        return;
      }
    }
    if (!isAdmin && !agreedPolicy) {
      Alert.alert(t('upload_recipe_screen.agreement_required_title'), t('upload_recipe_screen.agreement_required_message'));
      return;
    }

    // The admin's own recipes publish immediately with no review step, so
    // this is the only checkpoint before it goes live for every customer.
    if (isAdmin) {
      Alert.alert(
        t('upload_recipe_screen.publish_confirm_title'),
        t('upload_recipe_screen.publish_confirm_message'),
        [
          { text: t('profile.cancel'), style: 'cancel' },
          { text: t('upload_recipe_screen.publish_confirm_ok'), onPress: doSubmit },
        ]
      );
      return;
    }

    doSubmit();
  };

  const doSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/recipes/submit', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          cuisine,
          category,
          meal_type: mealType,
          is_free: isFree,
          price_usd: isFree ? null : Number(priceUsd),
          ingredients: ingredients.join(', '),
          steps: steps.map((s, i) => `${i + 1}. ${s}`).join(' '),
          images: photos.map((p) => ({ base64: p.base64, fileExt: p.fileExt })),
          agreedPolicy: isAdmin || agreedPolicy,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert(t('upload_recipe_screen.submission_failed_title'), data.error ?? t('common.something_wrong'));
        return;
      }
      const published = data.status === 'approved';
      Alert.alert(
        published ? t('upload_recipe_screen.recipe_published_title') : t('upload_recipe_screen.recipe_submitted_title'),
        published ? t('upload_recipe_screen.recipe_published_message') : t('upload_recipe_screen.recipe_submitted_message'),
        [{ text: t('upload_recipe_screen.ok'), onPress: () => router.back() }]
      );
    } catch (err) {
      Alert.alert(t('upload_recipe_screen.submission_failed_title'), t('common.connection_error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('upload_recipe_screen.title')}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Photos */}
        <View style={styles.photoRow}>
          {photos.map((photo, i) => (
            <View key={i} style={[styles.photoBox, styles.photoBoxSmall, { backgroundColor: colors.card }]}>
              <Image source={{ uri: photo.previewUri }} style={styles.photoPreview} contentFit="cover" />
              <TouchableOpacity style={styles.photoRemoveBtn} onPress={() => removePhoto(i)}>
                <Ionicons name="close-circle" size={20} color="#fff" />
              </TouchableOpacity>
              {i === 0 && (
                <View style={styles.photoMainTag}>
                  <Text style={styles.photoMainTagText}>{t('upload_recipe_screen.main_photo')}</Text>
                </View>
              )}
            </View>
          ))}
          {photos.length < MAX_PHOTOS && (
            <TouchableOpacity
              style={[styles.photoBox, styles.photoBoxSmall, { backgroundColor: colors.card }]}
              onPress={pickPhoto}
            >
              <View style={styles.photoPlaceholder}>
                <Ionicons name="camera-outline" size={28} color={colors.subtext} />
                <Text style={[styles.photoPlaceholderText, { color: colors.subtext }]}>{t('upload_recipe_screen.add_photo')}</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
        <Text style={[styles.photoHint, { color: colors.subtext }]}>{t('upload_recipe_screen.photo_hint')}</Text>

        {/* Title */}
        <Text style={[styles.label, { color: colors.text }]}>{t('upload_recipe_screen.recipe_title')}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
          placeholder={t('upload_recipe_screen.title_placeholder')}
          placeholderTextColor={colors.subtext}
          value={title}
          onChangeText={setTitle}
        />

        {/* Description */}
        <Text style={[styles.label, { color: colors.text }]}>{t('upload_recipe_screen.description')}</Text>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: colors.card, color: colors.text }]}
          placeholder={t('upload_recipe_screen.description_placeholder')}
          placeholderTextColor={colors.subtext}
          value={description}
          onChangeText={setDescription}
          multiline
        />

        {/* Cuisine */}
        <Text style={[styles.label, { color: colors.text }]}>{t('upload_recipe_screen.cuisine')}</Text>
        <View style={styles.chipRow}>
          {CUISINE_OPTIONS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, { backgroundColor: colors.card }, cuisine === c && styles.chipActive]}
              onPress={() => setCuisine(cuisine === c ? null : c)}
            >
              <Text style={[styles.chipText, { color: cuisine === c ? '#fff' : colors.text }]}>{t('cuisines.' + c)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Meal type */}
        <Text style={[styles.label, { color: colors.text }]}>{t('upload_recipe_screen.meal_type_optional')}</Text>
        <View style={styles.chipRow}>
          {MEAL_OPTIONS.map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.chip, { backgroundColor: colors.card }, mealType === m && styles.chipActive]}
              onPress={() => setMealType(mealType === m ? null : m)}
            >
              <Text style={[styles.chipText, { color: mealType === m ? '#fff' : colors.text }]}>{t('home.' + m)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Category */}
        <Text style={[styles.label, { color: colors.text }]}>{t('upload_recipe_screen.category_optional')}</Text>
        <View style={styles.chipRow}>
          {CATEGORY_OPTIONS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, { backgroundColor: colors.card }, category === c && styles.chipActive]}
              onPress={() => setCategory(category === c ? null : c)}
            >
              <Text style={[styles.chipText, { color: category === c ? '#fff' : colors.text }]}>{t('categories.' + c)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Free / Paid */}
        <View style={[styles.priceCard, { backgroundColor: colors.card }]}>
          <View style={styles.priceRow}>
            <Text style={[styles.label, { color: colors.text, marginTop: 0 }]}>{t('upload_recipe_screen.free_recipe')}</Text>
            <Switch
              value={isFree}
              onValueChange={setIsFree}
              trackColor={{ false: '#ccc', true: RED }}
              thumbColor="#fff"
            />
          </View>
          {!isFree && (
            <>
              <View style={styles.priceInputRow}>
                <Text style={[styles.dollarSign, { color: colors.text }]}>$</Text>
                <TextInput
                  style={[styles.priceInput, { color: colors.text }]}
                  placeholder="2.99"
                  placeholderTextColor={colors.subtext}
                  value={priceUsd}
                  onChangeText={setPriceUsd}
                  keyboardType="decimal-pad"
                />
              </View>
              <Text style={[styles.priceHint, { color: colors.subtext }]}>
                {t('upload_recipe_screen.price_range_hint', { min: MIN_PRICE.toFixed(2), max: MAX_PRICE.toFixed(2) })}
              </Text>
            </>
          )}
        </View>

        {/* Ingredients */}
        <Text style={[styles.label, { color: colors.text }]}>{t('upload_recipe_screen.ingredients')}</Text>
        {ingredients.map((ing, i) => (
          <View key={i} style={[styles.listRow, { backgroundColor: colors.card }]}>
            <Text style={[styles.listRowText, { color: colors.text }]}>{ing}</Text>
            <TouchableOpacity onPress={() => removeIngredient(i)}>
              <Ionicons name="close-circle" size={20} color={colors.subtext} />
            </TouchableOpacity>
          </View>
        ))}
        <View style={styles.addRow}>
          <TextInput
            style={[styles.qtyInput, { backgroundColor: colors.card, color: colors.text }]}
            placeholder={t('upload_recipe_screen.ingredient_qty_placeholder')}
            placeholderTextColor={colors.subtext}
            value={ingredientQty}
            onChangeText={setIngredientQty}
            keyboardType="decimal-pad"
          />
          <TextInput
            style={[styles.unitInput, { backgroundColor: colors.card, color: colors.text }]}
            placeholder={t('upload_recipe_screen.ingredient_unit_placeholder')}
            placeholderTextColor={colors.subtext}
            value={ingredientUnit}
            onChangeText={setIngredientUnit}
          />
          <TextInput
            style={[styles.addInput, { backgroundColor: colors.card, color: colors.text }]}
            placeholder={t('upload_recipe_screen.ingredient_name_placeholder')}
            placeholderTextColor={colors.subtext}
            value={ingredientName}
            onChangeText={setIngredientName}
            onSubmitEditing={addIngredient}
          />
          <TouchableOpacity style={styles.addBtn} onPress={addIngredient}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={[styles.ingredientHint, { color: colors.subtext }]}>
          {t('upload_recipe_screen.ingredient_hint')}
        </Text>

        {/* Steps */}
        <Text style={[styles.label, { color: colors.text }]}>{t('upload_recipe_screen.cooking_steps')}</Text>
        {steps.map((step, i) => (
          <View key={i} style={[styles.listRow, { backgroundColor: colors.card }]}>
            <Text style={[styles.stepNumber, { color: RED }]}>{i + 1}.</Text>
            <Text style={[styles.listRowText, { color: colors.text, flex: 1 }]}>{step}</Text>
            <TouchableOpacity onPress={() => removeStep(i)}>
              <Ionicons name="close-circle" size={20} color={colors.subtext} />
            </TouchableOpacity>
          </View>
        ))}
        <View style={styles.addRow}>
          <TextInput
            style={[styles.addInput, { backgroundColor: colors.card, color: colors.text }]}
            placeholder={t('upload_recipe_screen.step_placeholder')}
            placeholderTextColor={colors.subtext}
            value={stepInput}
            onChangeText={setStepInput}
            onSubmitEditing={addStep}
          />
          <TextInput
            style={[styles.stepMinutesInput, { backgroundColor: colors.card, color: colors.text }]}
            placeholder={t('upload_recipe_screen.step_minutes_placeholder')}
            placeholderTextColor={colors.subtext}
            value={stepMinutesInput}
            onChangeText={setStepMinutesInput}
            keyboardType="number-pad"
          />
          <TouchableOpacity style={styles.addBtn} onPress={addStep}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={[styles.ingredientHint, { color: colors.subtext }]}>
          {t('upload_recipe_screen.step_minutes_hint')}
        </Text>

        {/* Policy agreement — shown on every upload as a standing reminder of
            the 90/10 commission split, not just a first-few-submissions notice */}
        {!isAdmin && (
          <TouchableOpacity
            style={[styles.policyBox, { backgroundColor: colors.card }]}
            onPress={() => setAgreedPolicy((v) => !v)}
            activeOpacity={0.8}
          >
            <View style={[styles.checkbox, agreedPolicy && styles.checkboxChecked]}>
              {agreedPolicy && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text style={[styles.policyText, { color: colors.subtext }]}>
              {t('upload_recipe_screen.policy_text')}
            </Text>
          </TouchableOpacity>
        )}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitBtnText}>
            {submitting
              ? t('upload_recipe_screen.submitting')
              : isAdmin
                ? t('upload_recipe_screen.publish_recipe')
                : t('upload_recipe_screen.submit_for_review')}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.submitNote, { color: colors.subtext }]}>
          {isAdmin ? t('upload_recipe_screen.publish_note') : t('upload_recipe_screen.submit_note')}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, marginBottom: 16 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  photoBox: { marginHorizontal: 20, height: 160, borderRadius: 18, overflow: 'hidden', marginBottom: 20 },
  photoRow: { flexDirection: 'row', gap: 10, marginHorizontal: 20, marginBottom: 8 },
  photoBoxSmall: { flex: 1, height: 110, marginHorizontal: 0, marginBottom: 0, position: 'relative' },
  photoRemoveBtn: { position: 'absolute', top: 4, right: 4 },
  photoMainTag: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  photoMainTagText: { color: '#fff', fontSize: 9.5, fontWeight: '700' },
  photoHint: { fontSize: 11.5, marginHorizontal: 20, marginBottom: 12 },
  photoPreview: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  photoPlaceholderText: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  label: { fontSize: 14, fontWeight: '700', marginHorizontal: 20, marginTop: 18, marginBottom: 8 },
  input: { marginHorizontal: 20, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  chipActive: { backgroundColor: RED },
  chipText: { fontSize: 13, fontWeight: '600' },
  priceCard: { marginHorizontal: 20, marginTop: 18, borderRadius: 14, padding: 16 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priceInputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 4 },
  dollarSign: { fontSize: 18, fontWeight: '700' },
  priceInput: { fontSize: 18, fontWeight: '700', flex: 1 },
  priceHint: { fontSize: 11.5, marginTop: 6 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8 },
  listRowText: { fontSize: 14 },
  stepNumber: { fontSize: 14, fontWeight: '700' },
  addRow: { flexDirection: 'row', gap: 8, marginHorizontal: 20, marginTop: 4 },
  addInput: { flex: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  qtyInput: { width: 52, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 12, fontSize: 14 },
  unitInput: { width: 74, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 12, fontSize: 14 },
  stepMinutesInput: { width: 64, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 12, fontSize: 14 },
  addBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: RED, alignItems: 'center', justifyContent: 'center' },
  ingredientHint: { fontSize: 11.5, marginHorizontal: 20, marginTop: 6 },
  policyBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginHorizontal: 20, marginTop: 22, borderRadius: 14, padding: 14 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: '#D0D0D0', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxChecked: { backgroundColor: RED, borderColor: RED },
  policyText: { fontSize: 12.5, flex: 1, lineHeight: 18 },
  submitBtn: { backgroundColor: RED, borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', marginHorizontal: 20, marginTop: 22 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  submitNote: { fontSize: 12, textAlign: 'center', marginTop: 10, marginHorizontal: 40 },
});