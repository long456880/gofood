import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { SlideInUp, SlideOutUp } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiFetch } from '@/lib/api-fetch';
import { useTheme } from '@/lib/theme-context';
import { useNotificationText, type AppNotification } from '@/lib/notification-text';

const RED = '#D62828';
const POLL_MS = 15000;
const BANNER_MS = 5000;

type NotificationContextValue = {
  unreadCount: number;
  refresh: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue>({
  unreadCount: 0,
  refresh: async () => {},
});

export const useNotifications = () => useContext(NotificationContext);

// Red count on top of a bell button. Renders nothing when there's nothing unread.
export function UnreadBadge() {
  const { unreadCount } = useNotifications();
  if (unreadCount <= 0) return null;
  return (
    <View style={styles.badge} pointerEvents="none">
      <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
    </View>
  );
}

// Polls for unread notifications while the app is open and slides a banner
// in when a new one arrives. There's no push service behind this — it only
// works while the app is in the foreground, which is what the polling is for.
export function NotificationProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { localizedTitle, localizedMessage } = useNotificationText();
  const [unreadCount, setUnreadCount] = useState(0);
  const [banner, setBanner] = useState<AppNotification | null>(null);
  // null until the first poll after sign-in: whatever is already unread then
  // is old news and must not pop up as if it just arrived.
  const seen = useRef<Set<string> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showBanner = useCallback((n: AppNotification) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setBanner(n);
    hideTimer.current = setTimeout(() => setBanner(null), BANNER_MS);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await apiFetch('/api/notifications/unread');
      if (!res.ok) return;
      const data = await res.json();
      setUnreadCount(data.count ?? 0);

      const latest: AppNotification[] = Array.isArray(data.latest) ? data.latest : [];
      if (seen.current === null) {
        seen.current = new Set(latest.map((n) => n.id));
        return;
      }
      const fresh = latest.filter((n) => !seen.current!.has(n.id));
      fresh.forEach((n) => seen.current!.add(n.id));
      // `latest` is newest-first, so the first fresh one is the one to show.
      if (fresh.length > 0) showBanner(fresh[0]);
    } catch {
      // Offline or the server is restarting — the next poll will catch up.
    }
  }, [showBanner]);

  useEffect(() => {
    if (!enabled) {
      seen.current = null;
      setUnreadCount(0);
      setBanner(null);
      return;
    }

    refresh();
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') refresh();
    }, POLL_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearInterval(interval);
      sub.remove();
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [enabled, refresh]);

  const handleBannerPress = () => {
    if (!banner) return;
    const tapped = banner;
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setBanner(null);
    apiFetch('/api/notifications/read', {
      method: 'POST',
      body: JSON.stringify({ id: tapped.id }),
    })
      .then(refresh)
      .catch(() => {});
    if (tapped.link) router.push(tapped.link as any);
  };

  return (
    <NotificationContext.Provider value={{ unreadCount, refresh }}>
      {children}
      {banner && (
        <Animated.View
          key={banner.id}
          entering={SlideInUp.duration(300)}
          exiting={SlideOutUp.duration(250)}
          style={[styles.banner, { top: insets.top + 8, backgroundColor: colors.card }]}
        >
          <Pressable onPress={handleBannerPress} style={styles.bannerInner}>
            <View style={styles.bannerAccent} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.bannerTitle, { color: colors.text }]} numberOfLines={1}>
                {localizedTitle(banner)}
              </Text>
              <Text style={[styles.bannerMessage, { color: colors.subtext }]} numberOfLines={2}>
                {localizedMessage(banner)}
              </Text>
            </View>
          </Pressable>
        </Animated.View>
      )}
    </NotificationContext.Provider>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 16,
    zIndex: 1000,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  bannerInner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  bannerAccent: { width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: RED },
  bannerTitle: { fontSize: 14.5, fontWeight: '700' },
  bannerMessage: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: RED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10.5, fontWeight: '700' },
});
