import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/lib/theme-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiFetch } from '@/lib/api-fetch';
import { useNotificationText, type AppNotification } from '@/lib/notification-text';
import { useNotifications } from '@/components/NotificationProvider';

const RED = '#D62828';
const WARM_BG = '#FBF8F4';

type Notification = AppNotification & { is_read: boolean };

export default function NotificationsScreen() {
  const router = useRouter();
  const { colors, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const { localizedTitle, localizedMessage } = useNotificationText();
  const { refresh: refreshUnread } = useNotifications();

  const timeAgo = (dateStr: string): string => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return t('notifications_screen.just_now');
    if (mins < 60) return t('notifications_screen.minutes_ago', { count: mins });
    const hours = Math.floor(mins / 60);
    if (hours < 24) return t('notifications_screen.hours_ago', { count: hours });
    const days = Math.floor(hours / 24);
    return t('notifications_screen.days_ago', { count: days });
  };

  useFocusEffect(
    useCallback(() => {
      apiFetch('/api/notifications')
        .then((res) => res.json())
        .then((data) => setNotifications(Array.isArray(data) ? data : []))
        // Opening the page marks everything read, so the bell badge clears.
        .then(() => refreshUnread())
        .finally(() => setLoading(false));
    }, [refreshUnread])
  );

  return (
    <View style={[styles.container, { backgroundColor: dark ? colors.background : WARM_BG }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('notifications_screen.title')}</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={RED} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="notifications-outline" size={44} color={colors.subtext} />
          <Text style={[styles.emptyText, { color: colors.subtext }]}>
            {t('notifications_screen.empty')}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {notifications.map((n) => (
            <TouchableOpacity
              key={n.id}
              style={[styles.card, { backgroundColor: colors.card }, !n.is_read && styles.cardUnread]}
              activeOpacity={0.7}
              onPress={() => n.link && router.push(n.link as any)}
            >
              <View style={{ flex: 1 }}>
                <View style={styles.rowBetween}>
                  <Text style={[styles.title, { color: colors.text }]}>{localizedTitle(n)}</Text>
                  <Text style={[styles.time, { color: colors.subtext }]}>{timeAgo(n.created_at)}</Text>
                </View>
                <Text style={[styles.message, { color: colors.subtext }]}>{localizedMessage(n)}</Text>
              </View>
            </TouchableOpacity>
          ))}
          <View style={{ height: 30 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  list: { paddingHorizontal: 20, gap: 12, paddingTop: 6 },
  card: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardUnread: { borderWidth: 1.5, borderColor: RED },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  title: { fontSize: 14.5, fontWeight: '700', flexShrink: 1 },
  time: { fontSize: 11 },
  message: { fontSize: 13, lineHeight: 18, marginTop: 3 },
});