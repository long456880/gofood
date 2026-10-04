import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase, useSession } from '@/lib/supabase';
import { apiFetch } from '@/lib/api-fetch';
import { useTheme } from '@/lib/theme-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const RED = '#D62828';
const ADMIN_EMAIL = 'feihengkimborat@gmail.com';

type Profile = {
  username: string;
  avatar_url?: string;
  account_type?: string;
  notifications_enabled?: boolean;
};

export default function ProfileScreen() {
  const { data: session } = useSession();
  const { dark, toggle, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();

  useFocusEffect(
    useCallback(() => {
      apiFetch('/api/profile')
        .then((res) => res.json())
        .then((data) => setProfile(data))
        .finally(() => setLoading(false));
    }, [])
  );

  const pickAndUploadAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('profile_screen.avatar_permission_title'), t('profile_screen.avatar_permission_message'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });

    if (result.canceled || !result.assets[0].base64) return;

    setUploadingAvatar(true);
    try {
      const fileExt = result.assets[0].uri.split('.').pop() || 'jpg';
      const res = await apiFetch('/api/profile/avatar', {
        method: 'POST',
        body: JSON.stringify({ base64: result.assets[0].base64, fileExt }),
      });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert(t('profile_screen.upload_failed'), data.error ?? t('common.something_wrong'));
        return;
      }
      setProfile((prev) => (prev ? { ...prev, avatar_url: data.avatar_url } : prev));
    } catch (err) {
      Alert.alert(t('profile_screen.upload_failed'), t('common.connection_error'));
    } finally {
      setUploadingAvatar(false);
    }
  };

    const handleSignOut = () => {
    Alert.alert(t('profile.sign_out'), t('profile.sign_out_confirm'), [
      { text: t('profile.cancel'), style: 'cancel' },
      {
        text: t('profile.sign_out'),
        style: 'destructive',
        onPress: async () => {
          // 'local' clears this device's session straight away. The default
          // ('global') waits on a server round-trip to revoke every session
          // first, which is what made signing out take several seconds.
          await supabase.auth.signOut({ scope: 'local' });
        },
      },
    ]);
  };

  const handleToggleNotifications = async (value: boolean) => {
    setProfile((prev) => (prev ? { ...prev, notifications_enabled: value } : prev));
    try {
      const res = await apiFetch('/api/profile/notifications-toggle', {
        method: 'POST',
        body: JSON.stringify({ enabled: value }),
      });
      if (!res.ok) {
        setProfile((prev) => (prev ? { ...prev, notifications_enabled: !value } : prev));
        Alert.alert(t('common.failed'), t('profile_screen.notifications_update_failed'));
      }
    } catch {
      setProfile((prev) => (prev ? { ...prev, notifications_enabled: !value } : prev));
      Alert.alert(t('common.failed'), t('profile_screen.notifications_update_failed'));
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={RED} />
      </View>
    );
  }

  // Admin and chef accounts don't place orders, so favorites and order
  // history are customer-only sections.
  const isCustomer = profile?.account_type !== 'chef' && session?.user.email !== ADMIN_EMAIL;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient
        colors={[RED, '#A61E1E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <TouchableOpacity style={styles.avatarRing} onPress={pickAndUploadAvatar} activeOpacity={0.8} disabled={uploadingAvatar}>
          <View style={styles.avatar}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} contentFit="cover" />
            ) : (
              <Ionicons name="person" size={34} color="#FFFFFF" />
            )}
            {uploadingAvatar && (
              <View style={styles.avatarLoadingOverlay}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            )}
          </View>
          <View style={styles.cameraBadge}>
            <Ionicons name="camera" size={14} color={RED} />
          </View>
        </TouchableOpacity>
        <Text style={styles.name}>{profile?.username ?? t('auth.chef')}</Text>
        <Text style={styles.email}>{session?.user.email}</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => router.push('/edit-profile')}
        >
          <Ionicons name="pencil-outline" size={13} color={RED} />
          <Text style={styles.editButtonText}>{t('profile.edit_profile')}</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Menu Card */}
      <View style={[styles.card, styles.menuCardTop, { backgroundColor: colors.card }]}>
        {isCustomer && (
          <>
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/favorites')} activeOpacity={0.7}>
              <View style={styles.menuIcon}>
                <Ionicons name="heart" size={18} color={RED} />
              </View>
              <Text style={[styles.menuText, { color: colors.text }]}>{t('profile.favorites')}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/my-orders')} activeOpacity={0.7}>
              <View style={styles.menuIcon}>
                <Ionicons name="receipt-outline" size={18} color={RED} />
              </View>
              <Text style={[styles.menuText, { color: colors.text }]}>{t('profile.my_orders')}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />
          </>
        )}

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/edit-profile')} activeOpacity={0.7}>
          <View style={styles.menuIcon}>
            <Ionicons name="person-outline" size={18} color={RED} />
          </View>
          <Text style={[styles.menuText, { color: colors.text }]}>{t('profile.edit_profile')}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <TouchableOpacity
          style={styles.menuItem}
          activeOpacity={0.7}
          onPress={() => i18n.changeLanguage(i18n.language === 'km' ? 'en' : 'km')}
        >
          <View style={styles.menuIcon}>
            <Ionicons name="globe-outline" size={18} color={RED} />
          </View>
          <Text style={[styles.menuText, { color: colors.text }]}>
            {i18n.language === 'km' ? 'ភាសាខ្មែរ' : 'English'}
          </Text>
          <Switch
            value={i18n.language === 'km'}
            onValueChange={(val) => { i18n.changeLanguage(val ? 'km' : 'en'); }}
            trackColor={{ false: '#ccc', true: RED }}
            thumbColor="#FFFFFF"
            pointerEvents="none"
          />
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={toggle}>
          <View style={styles.menuIcon}>
            <Ionicons name={dark ? 'moon' : 'sunny-outline'} size={18} color={RED} />
          </View>
          <Text style={[styles.menuText, { color: colors.text }]}>{t('profile.dark_mode')}</Text>
          <Switch
            value={dark}
            onValueChange={() => { toggle(); }}
            trackColor={{ false: '#ccc', true: RED }}
            thumbColor="#FFFFFF"
            pointerEvents="none"
          />
        </TouchableOpacity>

        {session?.user.email !== ADMIN_EMAIL && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={() => router.push('/support-chat')}>
              <View style={styles.menuIcon}>
                <Ionicons name="mail-outline" size={18} color={RED} />
              </View>
              <Text style={[styles.menuText, { color: colors.text }]}>{t('profile.contact_support')}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
            </TouchableOpacity>
          </>
        )}

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <TouchableOpacity
          style={styles.menuItem}
          activeOpacity={0.7}
          onPress={() => handleToggleNotifications(!(profile?.notifications_enabled ?? true))}
        >
          <View style={styles.menuIcon}>
            <Ionicons name="notifications-outline" size={18} color={RED} />
          </View>
          <Text style={[styles.menuText, { color: colors.text }]}>{t('profile.notifications')}</Text>
          <Switch
            value={profile?.notifications_enabled ?? true}
            onValueChange={handleToggleNotifications}
            trackColor={{ false: '#ccc', true: RED }}
            thumbColor="#FFFFFF"
            pointerEvents="none"
          />
        </TouchableOpacity>

      </View>

      {/* Sign Out — its own grouped row, not a CTA button, so it reads as
          part of the settings list rather than a bolted-on action */}
      <View style={[styles.card, styles.signOutCard, { backgroundColor: colors.card }]}>
        <TouchableOpacity style={styles.signOutRow} onPress={handleSignOut} activeOpacity={0.6}>
          <Text style={styles.signOutText}>{t('profile.sign_out')}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    alignItems: 'center',
    paddingBottom: 30,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    marginBottom: -30,
  },
  avatarRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarLoadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 8,
    right: 4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: RED,
  },
  name: { fontSize: 21, fontWeight: 'bold', marginBottom: 3, color: '#fff' },
  email: { fontSize: 13, marginBottom: 14, color: 'rgba(255,255,255,0.85)' },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 5,
  },
  editButtonText: { color: RED, fontSize: 13, fontWeight: '700' },
  card: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  menuCardTop: { marginTop: 46 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: { flex: 1, fontSize: 15 },
  divider: { height: 1, marginLeft: 48, marginVertical: 2 },
  signOutCard: { padding: 0, marginTop: -2 },
  signOutRow: { paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  signOutText: { color: RED, fontSize: 16, fontWeight: '600' },
});