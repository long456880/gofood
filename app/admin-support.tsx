import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiFetch } from '@/lib/api-fetch';
import { useTheme } from '@/lib/theme-context';

const RED = '#D62828';

type Thread = {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  last_body: string;
  last_sender: 'user' | 'admin';
  last_at: string;
  unread: number;
};

export default function AdminSupportScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      apiFetch('/api/admin/support')
        .then((res) => res.json())
        .then((data) => setThreads(Array.isArray(data) ? data : []))
        .catch(() => setThreads([]))
        .finally(() => setLoading(false));
    }, [])
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('support_screen.inbox_title')}</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={RED} />
        </View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(th) => th.user_id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="chatbubbles-outline" size={44} color={colors.subtext} />
              <Text style={[styles.emptyText, { color: colors.subtext }]}>{t('support_screen.inbox_empty')}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.card }]}
              activeOpacity={0.7}
              onPress={() =>
                router.push({
                  pathname: '/support-chat',
                  params: { userId: item.user_id, name: item.username ?? '' },
                })
              }
            >
              <View style={styles.avatar}>
                {item.avatar_url ? (
                  <Image source={{ uri: item.avatar_url }} style={styles.avatarImg} contentFit="cover" />
                ) : (
                  <Ionicons name="person" size={20} color="#fff" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                  {item.username ?? t('support_screen.user')}
                </Text>
                <Text style={[styles.preview, { color: colors.subtext }]} numberOfLines={1}>
                  {item.last_sender === 'admin' ? `${t('support_screen.you')}: ` : ''}
                  {item.last_body || t('support_screen.photo')}
                </Text>
              </View>
              {item.unread > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.unread}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40, paddingTop: 80 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  list: { paddingHorizontal: 20, gap: 12, paddingTop: 6, paddingBottom: 30, flexGrow: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: RED, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: 42, height: 42 },
  name: { fontSize: 15, fontWeight: '700' },
  preview: { fontSize: 13, marginTop: 2 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: RED, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
