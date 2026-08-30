import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useTheme } from '@/lib/theme-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const RED = '#D62828';
const WARM_BG = '#FBF8F4';

type Notification = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  time: string;
};

const SAMPLE_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    icon: 'restaurant',
    title: 'New recipe added!',
    message: 'Check out "Khmer Beef Lok Lak" — now available in the Khmer collection.',
    time: '2h ago',
  },
  {
    id: '2',
    icon: 'diamond',
    title: 'Points purchased',
    message: 'You successfully added 120 points to your account.',
    time: '5h ago',
  },
  {
    id: '3',
    icon: 'heart',
    title: 'Recipe saved',
    message: 'Mango Sticky Rice was added to your Favorites.',
    time: '1d ago',
  },
  {
    id: '4',
    icon: 'lock-open',
    title: 'Recipe unlocked',
    message: 'You unlocked "Japanese Tonkotsu Ramen" using your points.',
    time: '2d ago',
  },
  {
    id: '5',
    icon: 'star',
    title: 'Welcome to GoFood!',
    message: 'You got 10 free recipes to start exploring. Happy cooking!',
    time: '5d ago',
  },
];

export default function NotificationsScreen() {
  const router = useRouter();
  const { colors, dark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: dark ? colors.background : WARM_BG }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {SAMPLE_NOTIFICATIONS.map((n) => (
          <View key={n.id} style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.iconBg}>
              <Ionicons name={n.icon} size={20} color={RED} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.rowBetween}>
                <Text style={[styles.title, { color: colors.text }]}>{n.title}</Text>
                <Text style={[styles.time, { color: colors.subtext }]}>{n.time}</Text>
              </View>
              <Text style={[styles.message, { color: colors.subtext }]}>{n.message}</Text>
            </View>
          </View>
        ))}
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  iconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: RED + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  title: { fontSize: 14.5, fontWeight: '700', flexShrink: 1 },
  time: { fontSize: 11 },
  message: { fontSize: 13, lineHeight: 18, marginTop: 3 },
});
