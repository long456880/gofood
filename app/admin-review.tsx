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
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiFetch } from '@/lib/api-fetch';
import { useTheme } from '@/lib/theme-context';
import { useSession } from '@/lib/supabase';

const RED = '#D62828';
const ADMIN_EMAIL = 'feihengkimborat@gmail.com';

const REJECTION_REASON_KEYS = [
  'wrong_name',
  'photo_mismatch',
  'incomplete_ingredients',
  'vague_steps',
  'inappropriate',
  'duplicate',
  'other',
] as const;

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
  // Closest recipes from other chefs, any overlap at all; possible_matches is
  // the subset that crossed the server's copy threshold.
  similar_recipes?: SimilarMatch[];
  possible_matches?: SimilarMatch[];
};

type SimilarMatch = {
  id: string;
  title: string;
  chef_name: string | null;
  created_at: string;
  score: number;
};

type ReportedRecipeItem = {
  id: string;
  title: string;
  image_url: string | null;
  is_free: boolean;
  price_usd: number | string | null;
  status: 'pending' | 'approved' | 'rejected';
  chef_name: string | null;
  report_count: number | string;
  last_reported_at: string;
  latest_reason: string | null;
  reasons: string[];
};

type DeletedRecipeItem = {
  id: string;
  title: string;
  image_url: string | null;
  is_free: boolean;
  price_usd: number | string | null;
  rejection_reason: string | null;
  deleted_at: string;
  chef_name: string | null;
  restore_window_days: number;
};

function statusColor(status?: string) {
  if (status === 'approved') return '#2E7D32';
  if (status === 'rejected') return '#8B1A1A';
  if (status === 'deleted') return '#555';
  return '#B36B00';
}

function daysLeft(deletedAt: string, windowDays: number): number {
  const purgeAt = new Date(deletedAt).getTime() + windowDays * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((purgeAt - Date.now()) / (24 * 60 * 60 * 1000)));
}

export default function AdminReviewScreen() {
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { data: session } = useSession();
  const { t } = useTranslation();

  const statusLabel = (status?: string) => {
    if (status === 'approved') return t('admin_review_screen.status_approved');
    if (status === 'rejected') return t('admin_review_screen.status_rejected');
    if (status === 'deleted') return t('admin_review_screen.status_deleted');
    return t('admin_review_screen.status_pending');
  };

  const [activeTab, setActiveTab] = useState<'pending' | 'all' | 'reports' | 'deleted'>(tab === 'reports' ? 'reports' : 'pending');
  const [pendingRecipes, setPendingRecipes] = useState<RecipeItem[]>([]);
  const [allRecipes, setAllRecipes] = useState<RecipeItem[]>([]);
  const [reportedRecipes, setReportedRecipes] = useState<ReportedRecipeItem[]>([]);
  const [deletedRecipes, setDeletedRecipes] = useState<DeletedRecipeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [selectedReasonKey, setSelectedReasonKey] = useState<(typeof REJECTION_REASON_KEYS)[number] | null>(null);
  const [customReason, setCustomReason] = useState('');
  const [deleteModalRecipe, setDeleteModalRecipe] = useState<{ id: string; status?: string } | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  const fetchAllData = useCallback(async () => {
    try {
      const [pendingRes, allRes, reportedRes, deletedRes] = await Promise.all([
        apiFetch('/api/admin/pending-recipes'),
        apiFetch('/api/admin/all-recipes'),
        apiFetch('/api/admin/reported-recipes'),
        apiFetch('/api/admin/deleted-recipes'),
      ]);
      const pendingData = await pendingRes.json();
      const allData = await allRes.json();
      const reportedData = await reportedRes.json();
      const deletedData = await deletedRes.json();
      setPendingRecipes(Array.isArray(pendingData) ? pendingData : []);
      setAllRecipes(Array.isArray(allData) ? allData : []);
      setReportedRecipes(Array.isArray(reportedData) ? reportedData : []);
      setDeletedRecipes(Array.isArray(deletedData) ? deletedData : []);
    } catch {
      setPendingRecipes([]);
      setAllRecipes([]);
      setReportedRecipes([]);
      setDeletedRecipes([]);
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
        Alert.alert(t('common.failed'), t('admin_review_screen.update_failed'));
        return;
      }
      setPendingRecipes((prev) => prev.filter((r) => r.id !== id));
      fetchAllData();
    } catch {
      Alert.alert(t('common.failed'), t('common.connection_error'));
    } finally {
      setActingId(null);
    }
  };

  const openRejectModal = (id: string) => {
    setSelectedReasonKey(null);
    setCustomReason('');
    setRejectModalId(id);
  };

  const confirmReject = () => {
    if (!rejectModalId) return;
    const finalReason =
      selectedReasonKey === 'other'
        ? customReason.trim()
        : selectedReasonKey
          ? t(`admin_review_screen.reasons.${selectedReasonKey}`)
          : null;
    if (!finalReason) {
      Alert.alert(t('admin_review_screen.select_reason_title'), t('admin_review_screen.select_reason_message'));
      return;
    }
    const id = rejectModalId;
    setRejectModalId(null);
    handleReview(id, 'reject', finalReason);
  };

  // Deleting now asks for a reason and soft-deletes (see delete+api.ts) so
  // the chef can be told why and the recipe can still be restored within
  // the grace window instead of vanishing without explanation.
  const openDeleteModal = (recipe: { id: string; status?: string; latest_reason?: string | null }) => {
    setDeleteReason(recipe.latest_reason ?? '');
    setDeleteModalRecipe({ id: recipe.id, status: recipe.status });
  };

  const confirmDelete = async () => {
    if (!deleteModalRecipe) return;
    if (!deleteReason.trim()) {
      Alert.alert(t('admin_review_screen.select_reason_title'), t('admin_review_screen.delete_reason_required_message'));
      return;
    }
    const id = deleteModalRecipe.id;
    setDeletingId(id);
    try {
      const res = await apiFetch(`/api/admin/recipes/${id}/delete`, {
        method: 'POST',
        body: JSON.stringify({ reason: deleteReason.trim() }),
      });
      if (!res.ok) {
        Alert.alert(t('common.failed'), t('admin_review_screen.delete_failed'));
        return;
      }
      setAllRecipes((prev) => prev.filter((r) => r.id !== id));
      setPendingRecipes((prev) => prev.filter((r) => r.id !== id));
      setReportedRecipes((prev) => prev.filter((r) => r.id !== id));
      setDeleteModalRecipe(null);
      fetchAllData();
    } catch {
      Alert.alert(t('common.failed'), t('common.connection_error'));
    } finally {
      setDeletingId(null);
    }
  };

  const runRestore = async (id: string) => {
    setRestoringId(id);
    try {
      const res = await apiFetch(`/api/admin/recipes/${id}/restore`, { method: 'POST' });
      if (!res.ok) {
        Alert.alert(t('common.failed'), t('admin_review_screen.restore_failed'));
        return;
      }
      setDeletedRecipes((prev) => prev.filter((r) => r.id !== id));
      fetchAllData();
    } catch {
      Alert.alert(t('common.failed'), t('common.connection_error'));
    } finally {
      setRestoringId(null);
    }
  };

  const runDismissReport = async (recipeId: string) => {
    setDismissingId(recipeId);
    try {
      const res = await apiFetch(`/api/admin/reports/${recipeId}/dismiss`, { method: 'POST' });
      if (!res.ok) {
        Alert.alert(t('common.failed'), t('admin_review_screen.update_failed'));
        return;
      }
      setReportedRecipes((prev) => prev.filter((r) => r.id !== recipeId));
    } catch {
      Alert.alert(t('common.failed'), t('common.connection_error'));
    } finally {
      setDismissingId(null);
    }
  };

  if (session && session.user.email !== ADMIN_EMAIL) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="lock-closed-outline" size={40} color={colors.subtext} />
        <Text style={[styles.deniedText, { color: colors.subtext }]}>
          {t('admin_review_screen.no_access')}
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.deniedBtn}>
          <Text style={styles.deniedBtnText}>{t('admin_review_screen.go_back')}</Text>
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('admin_review_screen.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'pending' && styles.tabBtnActive]}
          onPress={() => setActiveTab('pending')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
            {t('admin_review_screen.pending_tab', { count: pendingRecipes.length })}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'all' && styles.tabBtnActive]}
          onPress={() => setActiveTab('all')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
            {t('admin_review_screen.all_tab', { count: allRecipes.length })}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'reports' && styles.tabBtnActive]}
          onPress={() => setActiveTab('reports')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'reports' && styles.tabTextActive]}>
            {t('admin_review_screen.reports_tab', { count: reportedRecipes.length })}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'deleted' && styles.tabBtnActive]}
          onPress={() => setActiveTab('deleted')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'deleted' && styles.tabTextActive]}>
            {t('admin_review_screen.deleted_tab', { count: deletedRecipes.length })}
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'reports' ? (
        reportedRecipes.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="checkmark-done-circle-outline" size={48} color={colors.subtext} />
            <Text style={[styles.emptyText, { color: colors.subtext }]}>
              {t('admin_review_screen.empty_reports')}
            </Text>
          </View>
        ) : (
          reportedRecipes.map((recipe) => (
            <View key={recipe.id} style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.cardHeader}>
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
                    {t('my_orders_screen.by_chef', { name: recipe.chef_name ?? t('admin_review_screen.unknown_chef') })}
                  </Text>
                  <View style={styles.metaRow}>
                    <View style={styles.similarityBadge}>
                      <Ionicons name="flag" size={11} color="#fff" />
                      <Text style={styles.statusBadgeText}>
                        {t('admin_review_screen.report_count', { count: Number(recipe.report_count) })}
                      </Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity onPress={() => router.push(`/recipe/${recipe.id}` as any)}>
                  <Ionicons name="eye-outline" size={20} color={colors.subtext} />
                </TouchableOpacity>
              </View>

              {recipe.latest_reason && (
                <View style={styles.reportReasonBox}>
                  <Text style={styles.reportReasonLabel}>{t('admin_review_screen.report_reason_label')}</Text>
                  <Text style={styles.reportReasonText}>“{recipe.latest_reason}”</Text>
                  {recipe.reasons.length > 1 && (
                    <Text style={styles.reportReasonMore}>
                      {t('admin_review_screen.report_reason_more', { count: recipe.reasons.length - 1 })}
                    </Text>
                  )}
                </View>
              )}

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.rejectBtn, dismissingId === recipe.id && { opacity: 0.6 }]}
                  onPress={() => runDismissReport(recipe.id)}
                  disabled={dismissingId === recipe.id}
                >
                  <Ionicons name="close" size={18} color={RED} />
                  <Text style={styles.rejectBtnText}>{t('admin_review_screen.dismiss_report')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.deleteBtn, deletingId === recipe.id && { opacity: 0.6 }]}
                  onPress={() => openDeleteModal({ id: recipe.id, status: recipe.status, latest_reason: recipe.latest_reason })}
                  disabled={deletingId === recipe.id}
                >
                  <Ionicons name="trash-outline" size={18} color="#fff" />
                  <Text style={styles.approveBtnText}>
                    {deletingId === recipe.id ? t('admin_review_screen.deleting') : t('admin_review_screen.delete_recipe')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )
      ) : activeTab === 'deleted' ? (
        deletedRecipes.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="checkmark-done-circle-outline" size={48} color={colors.subtext} />
            <Text style={[styles.emptyText, { color: colors.subtext }]}>
              {t('admin_review_screen.empty_deleted')}
            </Text>
          </View>
        ) : (
          deletedRecipes.map((recipe) => (
            <View key={recipe.id} style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.cardHeader}>
                {recipe.image_url ? (
                  <Image source={{ uri: recipe.image_url }} style={[styles.thumb, { opacity: 0.5 }]} contentFit="cover" />
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
                    {t('my_orders_screen.by_chef', { name: recipe.chef_name ?? t('admin_review_screen.unknown_chef') })}
                  </Text>
                  <View style={styles.metaRow}>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor('deleted') }]}>
                      <Text style={styles.statusBadgeText}>
                        {t('admin_review_screen.purge_countdown', { count: daysLeft(recipe.deleted_at, recipe.restore_window_days) })}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {recipe.rejection_reason && (
                <View style={styles.reportReasonBox}>
                  <Text style={styles.reportReasonLabel}>{t('admin_review_screen.delete_reason_label')}</Text>
                  <Text style={styles.reportReasonText}>“{recipe.rejection_reason}”</Text>
                </View>
              )}

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.approveBtn, restoringId === recipe.id && { opacity: 0.6 }]}
                  onPress={() => runRestore(recipe.id)}
                  disabled={restoringId === recipe.id}
                >
                  <Ionicons name="refresh" size={18} color="#fff" />
                  <Text style={styles.approveBtnText}>
                    {restoringId === recipe.id ? t('admin_review_screen.working') : t('admin_review_screen.restore_recipe')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )
      ) : listToShow.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="checkmark-done-circle-outline" size={48} color={colors.subtext} />
          <Text style={[styles.emptyText, { color: colors.subtext }]}>
            {activeTab === 'pending' ? t('admin_review_screen.empty_pending') : t('admin_review_screen.empty_all')}
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
                    {recipe.cuisine} • {t('my_orders_screen.by_chef', { name: recipe.chef_name ?? t('admin_review_screen.unknown_chef') })}
                  </Text>
                  <View style={styles.metaRow}>
                    <Text style={[styles.cardMeta, { color: RED }]}>
                      {recipe.is_free ? t('admin_review_screen.free') : `$${Number(recipe.price_usd ?? 0).toFixed(2)}`}
                    </Text>
                    {activeTab === 'all' && (
                      <View style={[styles.statusBadge, { backgroundColor: statusColor(recipe.status) }]}>
                        <Text style={styles.statusBadgeText}>{statusLabel(recipe.status)}</Text>
                      </View>
                    )}
                    {!!recipe.possible_matches?.length ? (
                      <View style={styles.similarityBadge}>
                        <Ionicons name="warning" size={11} color="#fff" />
                        <Text style={styles.statusBadgeText}>
                          {t('admin_review_screen.possible_match_badge')} {Math.round(recipe.possible_matches[0].score * 100)}%
                        </Text>
                      </View>
                    ) : (
                      <View style={[styles.similarityBadge, { backgroundColor: colors.border }]}>
                        <Text style={[styles.statusBadgeText, { color: colors.subtext }]}>
                          {t('admin_review_screen.similar_chip', {
                            percent: Math.round((recipe.similar_recipes?.[0]?.score ?? 0) * 100),
                          })}
                        </Text>
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
                  {(() => {
                    const flagged = !!recipe.possible_matches?.length;
                    const similar = recipe.similar_recipes ?? [];
                    return (
                      <View style={[styles.similarityBox, !flagged && { backgroundColor: colors.border + '55' }]}>
                        <Text style={[styles.similarityTitle, !flagged && { color: colors.text }]}>
                          {flagged
                            ? t('admin_review_screen.possible_match_title')
                            : t('admin_review_screen.closest_matches_title')}
                        </Text>
                        {similar.length === 0 ? (
                          <Text style={[styles.similarityText, !flagged && { color: colors.subtext }]}>
                            {t('admin_review_screen.no_similar')}
                          </Text>
                        ) : (
                          similar.map((m) => (
                            <Text key={m.id} style={[styles.similarityText, !flagged && { color: colors.subtext }]}>
                              {t('admin_review_screen.possible_match_line', {
                                percent: Math.round(m.score * 100),
                                title: m.title,
                                chef: m.chef_name ?? t('admin_review_screen.unknown_chef'),
                                date: new Date(m.created_at).toLocaleDateString(),
                              })}
                            </Text>
                          ))
                        )}
                      </View>
                    );
                  })()}

                  <Text style={[styles.detailLabel, { color: colors.text }]}>{t('admin_review_screen.description')}</Text>
                  <Text style={[styles.detailText, { color: colors.subtext }]}>{recipe.description}</Text>

                  <Text style={[styles.detailLabel, { color: colors.text }]}>{t('admin_review_screen.ingredients')}</Text>
                  <Text style={[styles.detailText, { color: colors.subtext }]}>{recipe.ingredients}</Text>

                  <Text style={[styles.detailLabel, { color: colors.text }]}>{t('admin_review_screen.steps')}</Text>
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
                    <Text style={styles.rejectBtnText}>{t('admin_review_screen.reject')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.approveBtn, actingId === recipe.id && { opacity: 0.6 }]}
                    onPress={() => handleReview(recipe.id, 'approve')}
                    disabled={actingId === recipe.id}
                  >
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={styles.approveBtnText}>
                      {actingId === recipe.id ? t('admin_review_screen.working') : t('admin_review_screen.approve')}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtn, deletingId === recipe.id && { opacity: 0.6 }]}
                    onPress={() => openDeleteModal(recipe)}
                    disabled={deletingId === recipe.id}
                  >
                    <Ionicons name="trash-outline" size={18} color="#fff" />
                    <Text style={styles.approveBtnText}>
                      {deletingId === recipe.id ? t('admin_review_screen.deleting') : t('admin_review_screen.delete_recipe')}
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
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('admin_review_screen.reject_modal_title')}</Text>
            <Text style={[styles.modalSubtitle, { color: colors.subtext }]}>
              {t('admin_review_screen.reject_modal_subtitle')}
            </Text>

            {REJECTION_REASON_KEYS.map((key) => (
              <TouchableOpacity
                key={key}
                style={styles.reasonRow}
                onPress={() => setSelectedReasonKey(key)}
                activeOpacity={0.7}
              >
                <View style={[styles.radio, selectedReasonKey === key && styles.radioSelected]}>
                  {selectedReasonKey === key && <View style={styles.radioDot} />}
                </View>
                <Text style={[styles.reasonText, { color: colors.text }]}>{t(`admin_review_screen.reasons.${key}`)}</Text>
              </TouchableOpacity>
            ))}

            {selectedReasonKey === 'other' && (
              <TextInput
                style={[styles.customInput, { color: colors.text, borderColor: colors.border }]}
                placeholder={t('admin_review_screen.reject_custom_placeholder')}
                placeholderTextColor={colors.subtext}
                value={customReason}
                onChangeText={setCustomReason}
                multiline
              />
            )}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setRejectModalId(null)}>
                <Text style={[styles.modalCancelText, { color: colors.subtext }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={confirmReject}>
                <Text style={styles.modalConfirmText}>{t('admin_review_screen.send_rejection')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete reason — required so the chef can be told why, and shown
          again if this delete came from a report so the admin doesn't have
          to retype the reporter's complaint */}
      <Modal
        visible={!!deleteModalRecipe}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalRecipe(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('admin_review_screen.delete_modal_title')}</Text>
            <Text style={[styles.modalSubtitle, { color: colors.subtext }]}>
              {t('admin_review_screen.delete_modal_subtitle')}
            </Text>

            <TextInput
              style={[styles.customInput, { color: colors.text, borderColor: colors.border }]}
              placeholder={t('admin_review_screen.delete_reason_placeholder')}
              placeholderTextColor={colors.subtext}
              value={deleteReason}
              onChangeText={setDeleteReason}
              multiline
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setDeleteModalRecipe(null)}>
                <Text style={[styles.modalCancelText, { color: colors.subtext }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={confirmDelete}>
                <Text style={styles.modalConfirmText}>{t('admin_review_screen.delete_recipe')}</Text>
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
  similarityBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: '#B36B00' },
  similarityBox: { backgroundColor: 'rgba(179,107,0,0.12)', borderRadius: 10, padding: 10, marginBottom: 10, gap: 4 },
  similarityTitle: { fontSize: 12.5, fontWeight: '700', color: '#B36B00', marginBottom: 2 },
  similarityText: { fontSize: 12, lineHeight: 17, color: '#8A5200' },
  reportReasonBox: { backgroundColor: 'rgba(214,40,40,0.08)', borderRadius: 10, padding: 10, marginTop: 12 },
  reportReasonLabel: { fontSize: 11, fontWeight: '700', color: RED, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 },
  reportReasonText: { fontSize: 13, lineHeight: 18, color: '#5A1616', fontStyle: 'italic' },
  reportReasonMore: { fontSize: 11.5, color: '#8A5200', marginTop: 4 },
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