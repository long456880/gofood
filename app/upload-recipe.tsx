import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiFetch } from '@/lib/api-fetch';
import { useTheme } from '@/lib/theme-context';

const RED = '#D62828';

const CUISINE_OPTIONS = ['Khmer', 'Chinese', 'Japanese', 'Indian', 'Korean', 'Italian', 'French', 'American', 'Mexican'];
const CATEGORY_OPTIONS = ['burger', 'pizza', 'noodles', 'rice', 'cake', 'dessert', 'salad', 'soup'];
const MEAL_OPTIONS = ['breakfast', 'lunch', 'dinner', 'dessert'];

export default function UploadRecipeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cuisine, setCuisine] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [mealType, setMealType] = useState<string | null>(null);
  const [isFree, setIsFree] = useState(true);
  const [priceUsd, setPriceUsd] = useState('2.99');

  const [ingredients, setIngredients] = useState<string[]>([]);
  const [ingredientInput, setIngredientInput] = useState('');
  const [steps, setSteps] = useState<string[]>([]);
  const [stepInput, setStepInput] = useState('');

  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoExt, setPhotoExt] = useState('jpg');
  const [photoPreviewUri, setPhotoPreviewUri] = useState<string | null>(null);

  const [priorSubmissions, setPriorSubmissions] = useState<number | null>(null);
  const [agreedPolicy, setAgreedPolicy] = useState(false);
  const [loadingCount, setLoadingCount] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch('/api/recipes/my-recipes')
      .then((res) => res.json())
      .then((data) => setPriorSubmissions(data.totalCount ?? 0))
      .catch(() => setPriorSubmissions(0))
      .finally(() => setLoadingCount(false));
  }, []);

  const needsPolicyAgreement = (priorSubmissions ?? 0) < 5;

  const addIngredient = () => {
    if (!ingredientInput.trim()) return;
    setIngredients((prev) => [...prev, ingredientInput.trim()]);
    setIngredientInput('');
  };
  const removeIngredient = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const addStep = () => {
    if (!stepInput.trim()) return;
    setSteps((prev) => [...prev, stepInput.trim()]);
    setStepInput('');
  };
  const removeStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo access to add a recipe photo.');
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
    setPhotoExt(fileExt);
    setPhotoBase64(result.assets[0].base64);
    setPhotoPreviewUri(result.assets[0].uri);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim() || !cuisine) {
      Alert.alert('Missing info', 'Please fill in the title, description, and cuisine.');
      return;
    }
    if (ingredients.length === 0) {
      Alert.alert('Missing ingredients', 'Add at least one ingredient.');
      return;
    }
    if (steps.length === 0) {
      Alert.alert('Missing steps', 'Add at least one cooking step.');
      return;
    }
    if (!isFree && (!priceUsd || Number(priceUsd) <= 0)) {
      Alert.alert('Missing price', 'Enter a valid price for a paid recipe.');
      return;
    }
    if (needsPolicyAgreement && !agreedPolicy) {
      Alert.alert('Agreement required', 'Please agree to the commission policy before submitting.');
      return;
    }

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
          base64: photoBase64,
          fileExt: photoExt,
          agreedPolicy: needsPolicyAgreement ? agreedPolicy : true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert('Submission failed', data.error ?? 'Something went wrong.');
        return;
      }
      Alert.alert(
        'Recipe submitted!',
        'Your recipe is now pending review. You\'ll be able to see it live once it\'s approved.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err) {
      Alert.alert('Submission failed', 'Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingCount) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={RED} />
      </View>
    );
  }

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
          <Text style={[styles.headerTitle, { color: colors.text }]}>Upload Recipe</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Photo */}
        <TouchableOpacity style={[styles.photoBox, { backgroundColor: colors.card }]} onPress={pickPhoto}>
          {photoPreviewUri ? (
            <Image source={{ uri: photoPreviewUri }} style={styles.photoPreview} contentFit="cover" />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="camera-outline" size={32} color={colors.subtext} />
              <Text style={[styles.photoPlaceholderText, { color: colors.subtext }]}>Add a photo</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Title */}
        <Text style={[styles.label, { color: colors.text }]}>Recipe Title</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
          placeholder="e.g. Grandma's Fried Rice"
          placeholderTextColor={colors.subtext}
          value={title}
          onChangeText={setTitle}
        />

        {/* Description */}
        <Text style={[styles.label, { color: colors.text }]}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: colors.card, color: colors.text }]}
          placeholder="Tell people what makes this recipe special"
          placeholderTextColor={colors.subtext}
          value={description}
          onChangeText={setDescription}
          multiline
        />

        {/* Cuisine */}
        <Text style={[styles.label, { color: colors.text }]}>Cuisine</Text>
        <View style={styles.chipRow}>
          {CUISINE_OPTIONS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, { backgroundColor: colors.card }, cuisine === c && styles.chipActive]}
              onPress={() => setCuisine(cuisine === c ? null : c)}
            >
              <Text style={[styles.chipText, { color: cuisine === c ? '#fff' : colors.text }]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Meal type */}
        <Text style={[styles.label, { color: colors.text }]}>Meal Type (optional)</Text>
        <View style={styles.chipRow}>
          {MEAL_OPTIONS.map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.chip, { backgroundColor: colors.card }, mealType === m && styles.chipActive]}
              onPress={() => setMealType(mealType === m ? null : m)}
            >
              <Text style={[styles.chipText, { color: mealType === m ? '#fff' : colors.text }]}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Category */}
        <Text style={[styles.label, { color: colors.text }]}>Category (optional)</Text>
        <View style={styles.chipRow}>
          {CATEGORY_OPTIONS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, { backgroundColor: colors.card }, category === c && styles.chipActive]}
              onPress={() => setCategory(category === c ? null : c)}
            >
              <Text style={[styles.chipText, { color: category === c ? '#fff' : colors.text }]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Free / Paid */}
        <View style={[styles.priceCard, { backgroundColor: colors.card }]}>
          <View style={styles.priceRow}>
            <Text style={[styles.label, { color: colors.text, marginTop: 0 }]}>Free Recipe</Text>
            <Switch
              value={isFree}
              onValueChange={setIsFree}
              trackColor={{ false: '#ccc', true: RED }}
              thumbColor="#fff"
            />
          </View>
          {!isFree && (
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
          )}
        </View>

        {/* Ingredients */}
        <Text style={[styles.label, { color: colors.text }]}>Ingredients</Text>
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
            style={[styles.addInput, { backgroundColor: colors.card, color: colors.text }]}
            placeholder="e.g. 2 cups rice"
            placeholderTextColor={colors.subtext}
            value={ingredientInput}
            onChangeText={setIngredientInput}
            onSubmitEditing={addIngredient}
          />
          <TouchableOpacity style={styles.addBtn} onPress={addIngredient}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Steps */}
        <Text style={[styles.label, { color: colors.text }]}>Cooking Steps</Text>
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
            placeholder="Describe this step"
            placeholderTextColor={colors.subtext}
            value={stepInput}
            onChangeText={setStepInput}
            onSubmitEditing={addStep}
          />
          <TouchableOpacity style={styles.addBtn} onPress={addStep}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Policy agreement */}
        {needsPolicyAgreement && (
          <TouchableOpacity
            style={[styles.policyBox, { backgroundColor: colors.card }]}
            onPress={() => setAgreedPolicy((v) => !v)}
            activeOpacity={0.8}
          >
            <View style={[styles.checkbox, agreedPolicy && styles.checkboxChecked]}>
              {agreedPolicy && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text style={[styles.policyText, { color: colors.subtext }]}>
              I understand and agree that GoFood keeps 30% of each sale of this recipe, and I receive the remaining 70% as my chef commission.
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
            {submitting ? 'Submitting...' : 'Submit for Review'}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.submitNote, { color: colors.subtext }]}>
          Your recipe will be reviewed before it appears in the app.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, marginBottom: 16 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  photoBox: { marginHorizontal: 20, height: 160, borderRadius: 18, overflow: 'hidden', marginBottom: 20 },
  photoPreview: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  photoPlaceholderText: { fontSize: 13, fontWeight: '600' },
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
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8 },
  listRowText: { fontSize: 14 },
  stepNumber: { fontSize: 14, fontWeight: '700' },
  addRow: { flexDirection: 'row', gap: 8, marginHorizontal: 20, marginTop: 4 },
  addInput: { flex: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  addBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: RED, alignItems: 'center', justifyContent: 'center' },
  policyBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginHorizontal: 20, marginTop: 22, borderRadius: 14, padding: 14 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: '#D0D0D0', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxChecked: { backgroundColor: RED, borderColor: RED },
  policyText: { fontSize: 12.5, flex: 1, lineHeight: 18 },
  submitBtn: { backgroundColor: RED, borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', marginHorizontal: 20, marginTop: 22 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  submitNote: { fontSize: 12, textAlign: 'center', marginTop: 10, marginHorizontal: 40 },
});