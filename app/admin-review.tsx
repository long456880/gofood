import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiFetch } from '@/lib/api-fetch';
import { useTheme } from '@/lib/theme-context';
import { useSession } from '@/lib/supabase';

const RED = '#D62828';
const ADMIN_EMAIL = 'feihengkimborat@gmail.com';

const REJECTION_REASONS = [
  'Wrong or misleading food name',
  "Photo doesn't match the recipe",
  'Ingredients list is incomplete or unclear',
  'Steps are too vague or missing',
  'Inappropriate or low-quality content',
  'Other',
];

type RecipeItem = {
  id: string;
  title: string;
  description: string;
  cuisine: string;
  image_url: string | null;
  is_free: boolean;
  price_usd: number | string | null;
  meal_type: string | null;
  category: string | null;
  ingredients: string;
  steps: string;
  chef_name: string | null;
  created_at: string;
  status?: 'pending' | 'approved' | 'rejected';
};

function statusColor(status?: string) {
  if (status === 'approved') return '#2E7D32';
  if (status === 'rejected') return '#8B1A1A';
  return '#B36B00';
}

function statusLabel(status?: string) {
  if (status === 'approved') return 'Approved';
  if (status === 'rejected') return 'Rejected';
  return 'Pending';
}

export default function AdminReviewScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { data: session } = useSession();

  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [pendingRecipes, setPendingRecipes] = useState<RecipeItem[]>([]);
  const [allRecipes, setAllRecipes] = useState<RecipeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState('');

  const fetchAllData = useCallback(async () => {
    try {
      const [pendingRes, allRes] = await Promise.all([
        apiFetch('/api/admin/pending-recipes'),
        apiFetch('/api/admin/all-recipes'),
      ]);
      const pendingData = await pendingRes.json();
      const allData = await allRes.json();
      setPendingRecipes(Array.isArray(pendingData) ? pendingData : []);
      setAllRecipes(Array.isArray(allData) ? allData : []);
    } catch {
      setPendingRecipes([]);
      setAllRecipes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAllData();
    }, [fetchAllData])
  );

  const handleReview = async (id: string, action: 'approve' | 'reject', reason?: string) => {
    setActingId(id);
    try {
      const res = await apiFetch(`/api/admin/recipes/${id}/review`, {
        method: 'POST',
        body: JSON.stringify({ action, reason }),
      });
      if (!res.ok) {
        Alert.alert('Failed', 'Could not update this recipe. Please try again.');
        return;
      }
      setPendingRecipes((prev) => prev.filter((r) => r.id !== id));
      fetchAllData();
    } catch {
      Alert.alert('Failed', 'Please check your connection and try again.');
    } finally {
      setActingId(null);
    }
  };

  const openRejectModal = (id: string) => {
    setSelectedReason(null);
    setCustomReason('');
    setRejectModalId(id);
  };

  const confirmReject = () => {
    if (!rejectModalId) return;
    const finalReason = selectedReason === 'Other' ? customReason.trim() : selectedReason;
    if (!finalReason) {
      Alert.alert('Select a reason', 'Please choose or write a reason before rejecting.');
      return;
    }
    const id = rejectModalId;
    setRejectModalId(null);
    handleReview(id, 'reject', finalReason);
  };

  const runDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await apiFetch(`/api/admin/recipes/${id}/delete`, { method: 'POST' });
      if (!res.ok) {
        Alert.alert('Failed', 'Could not delete this recipe. Please try again.');
        return;
      }
      setAllRecipes((prev) => prev.filter((r) => r.id !== id));
      setPendingRecipes((prev) => prev.filter((r) => r.id !== id));
    } catch {
      Alert.alert('Failed', 'Please check your connection and try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeletePress = (recipe: RecipeItem) => {
    const isApproved = recipe.status === 'approved';
    Alert.alert(
      'Delete this recipe?',
      isApproved
        ? 'This recipe is live and may already be purchased or favorited by users. Deleting it will permanently remove those records too. This cannot be undone.'
        : 'This will permanently delete this recipe. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => runDelete(recipe.id) },
      ]
    );
  };

  if (session && session.user.email !== ADMIN_EMAIL) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="lock-closed-outline" size={40} color={colors.subtext} />
        <Text style={[styles.deniedText, { color: colors.subtext }]}>
          You don't have access to this screen.
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.deniedBtn}>
          <Text style={styles.deniedBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={RED} />
      </View>
    );
  }

  const listToShow = activeTab === 'pending' ? pendingRecipes : allRecipes;

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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Review Recipes</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'pending' && styles.tabBtnActive]}
          onPress={() => setActiveTab('pending')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
            Pending ({pendingRecipes.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'all' && styles.tabBtnActive]}
          onPress={() => setActiveTab('all')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
            All Recipes ({allRecipes.length})
          </Text>
        </TouchableOpacity>
      </View>

      {listToShow.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="checkmark-done-circle-outline" size={48} color={colors.subtext} />
          <Text style={[styles.emptyText, { color: colors.subtext }]}>
            {activeTab === 'pending' ? 'No recipes waiting for review right now.' : 'No recipes found.'}
          </Text>
        </View>
      ) : (
        listToShow.map((recipe) => {
          const expanded = expandedId === recipe.id;
          return (
            <View key={recipe.id} style={[styles.card, { backgroundColor: colors.card }]}>
              <TouchableOpacity
                style={styles.cardHeader}
                onPress={() => setExpandedId(expanded ? null : recipe.id)}
                activeOpacity={0.8}
              >
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
                  <Text style={[styles.cardMeta, { color: colors.subtext }]}>
                    {recipe.cuisine} • by {recipe.chef_name ?? 'Unknown chef'}
                  </Text>
                  <View style={styles.metaRow}>
                    <Text style={[styles.cardMeta, { color: RED }]}>
                      {recipe.is_free ? 'Free' : `$${Number(recipe.price_usd ?? 0).toFixed(2)}`}
                    </Text>
                    {activeTab === 'all' && (
                      <View style={[styles.statusBadge, { backgroundColor: statusColor(recipe.status) }]}>
                        <Text style={styles.statusBadgeText}>{statusLabel(recipe.status)}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Ionicons
                  name={expanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.subtext}
                />
              </TouchableOpacity>

              {expanded && (
                <View style={styles.detailBlock}>
                  <Text style={[styles.detailLabel, { color: colors.text }]}>Description</Text>
                  <Text style={[styles.detailText, { color: colors.subtext }]}>{recipe.description}</Text>

                  <Text style={[styles.detailLabel, { color: colors.text }]}>Ingredients</Text>
                  <Text style={[styles.detailText, { color: colors.subtext }]}>{recipe.ingredients}</Text>

                  <Text style={[styles.detailLabel, { color: colors.text }]}>Steps</Text>
                  <Text style={[styles.detailText, { color: colors.subtext }]}>{recipe.steps}</Text>
                </View>
              )}

              {activeTab === 'pending' ? (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.rejectBtn]}
                    onPress={() => openRejectModal(recipe.id)}
                    disabled={actingId === recipe.id}
                  >
                    <Ionicons name="close" size={18} color={RED} />
                    <Text style={styles.rejectBtnText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.approveBtn, actingId === recipe.id && { opacity: 0.6 }]}
                    onPress={() => handleReview(recipe.id, 'approve')}
                    disabled={actingId === recipe.id}
                  >
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={styles.approveBtnText}>
                      {actingId === recipe.id ? 'Working...' : 'Approve'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtn, deletingId === recipe.id && { opacity: 0.6 }]}
                    onPress={() => handleDeletePress(recipe)}
                    disabled={deletingId === recipe.id}
                  >
                    <Ionicons name="trash-outline" size={18} color="#fff" />
                    <Text style={styles.approveBtnText}>
                      {deletingId === recipe.id ? 'Deleting...' : 'Delete Recipe'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })
      )}

      {/* Rejection reason picker */}
      <Modal
        visible={!!rejectModalId}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectModalId(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Why reject this recipe?</Text>
            <Text style={[styles.modalSubtitle, { color: colors.subtext }]}>
              This will be shown to the chef so they understand what to fix.
            </Text>

            {REJECTION_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason}
                style={styles.reasonRow}
                onPress={() => setSelectedReason(reason)}
                activeOpacity={0.7}
              >
                <View style={[styles.radio, selectedReason === reason && styles.radioSelected]}>
                  {selectedReason === reason && <View style={styles.radioDot} />}
                </View>
                <Text style={[styles.reasonText, { color: colors.text }]}>{reason}</Text>
              </TouchableOpacity>
            ))}

            {selectedReason === 'Other' && (
              <TextInput
                style={[styles.customInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="Describe the issue..."
                placeholderTextColor={colors.subtext}
                value={customReason}
                onChangeText={setCustomReason}
                multiline
              />
            )}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setRejectModalId(null)}>
                <Text style={[styles.modalCancelText, { color: colors.subtext }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={confirmReject}>
                <Text style={styles.modalConfirmText}>Send Rejection</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingHorizontal: 40 },
  deniedText: { fontSize: 14, textAlign: 'center' },
  deniedBtn: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: RED },
  deniedBtnText: { color: '#fff', fontWeight: '700' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, marginBottom: 16 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  tabRow: { flexDirection: 'row', gap: 8, marginHorizontal: 20, marginBottom: 16, backgroundColor: 'rgba(150,150,150,0.12)', borderRadius: 12, padding: 4 },
  tabBtn: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  tabBtnActive: { backgroundColor: RED },
  tabText: { fontSize: 13, fontWeight: '600', color: '#888' },
  tabTextActive: { color: '#fff' },
  empty: { alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 80, paddingHorizontal: 40 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  card: { marginHorizontal: 20, marginBottom: 14, borderRadius: 16, padding: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 56, height: 56, borderRadius: 12 },
  thumbFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F0F0' },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  cardMeta: { fontSize: 12, marginBottom: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  detailBlock: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.08)' },
  detailLabel: { fontSize: 13, fontWeight: '700', marginBottom: 4, marginTop: 8 },
  detailText: { fontSize: 13, lineHeight: 19 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 12 },
  rejectBtn: { borderWidth: 1.5, borderColor: RED },
  rejectBtnText: { color: RED, fontWeight: '700', fontSize: 14 },
  approveBtn: { backgroundColor: RED },
  approveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  deleteBtn: { backgroundColor: '#8B1A1A' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { width: '100%', maxWidth: 380, borderRadius: 20, padding: 22 },
  modalTitle: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  modalSubtitle: { fontSize: 12.5, marginBottom: 16, lineHeight: 17 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: '#D0D0D0', alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: RED },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: RED },
  reasonText: { fontSize: 13.5, flex: 1 },
  customInput: { borderWidth: 1.5, borderRadius: 12, padding: 12, fontSize: 13.5, minHeight: 60, textAlignVertical: 'top', marginBottom: 6, marginTop: 2 },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  modalCancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  modalCancelText: { fontSize: 14, fontWeight: '600' },
  modalConfirmBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center', backgroundColor: RED },
  modalConfirmText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});