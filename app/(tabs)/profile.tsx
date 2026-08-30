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

type Profile = {
  username: string;
  avatar_url?: string;
  account_type?: string;
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
      Alert.alert('Permission needed', 'Please allow photo access to change your profile picture.');
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
        Alert.alert('Upload failed', data.error ?? 'Something went wrong');
        return;
      }
      setProfile((prev) => (prev ? { ...prev, avatar_url: data.avatar_url } : prev));
    } catch (err) {
      Alert.alert('Upload failed', 'Please check your connection and try again.');
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
          await supabase.auth.signOut();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={RED} />
      </View>
    );
  }

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
        <Text style={styles.name}>{profile?.username ?? 'Chef'}</Text>
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
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/favorites')} activeOpacity={0.7}>
          <View style={[styles.menuIcon, { backgroundColor: '#FDEDEC' }]}>
            <Ionicons name="heart-outline" size={18} color={RED} />
          </View>
          <Text style={[styles.menuText, { color: colors.text }]}>{t('profile.favorites')}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/my-orders')} activeOpacity={0.7}>
          <View style={[styles.menuIcon, { backgroundColor: '#FDEDEC' }]}>
            <Ionicons name="receipt-outline" size={18} color={RED} />
          </View>
          <Text style={[styles.menuText, { color: colors.text }]}>{t('profile.my_orders')}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/edit-profile')} activeOpacity={0.7}>
          <View style={[styles.menuIcon, { backgroundColor: '#F7DBDA' }]}>
            <Ionicons name="pencil-outline" size={18} color="#A61E1E" />
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
          <View style={[styles.menuIcon, { backgroundColor: '#F2C9C8' }]}>
            <Ionicons name="language-outline" size={18} color="#8B1A1A" />
          </View>
          <Text style={[styles.menuText, { color: colors.text }]}>{t('profile.language')}</Text>
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
          <View style={[styles.menuIcon, { backgroundColor: '#EFC0BF' }]}>
            <Ionicons name="moon-outline" size={18} color="#6E0000" />
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

      </View>

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={20} color={RED} />
        <Text style={styles.signOutText}>{t('profile.sign_out')}</Text>
      </TouchableOpacity>

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
    ...StyleSheet.absoluteFillObject,
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
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: RED,
    backgroundColor: '#FFF5F5',
    marginHorizontal: 20,
  },
  signOutText: { color: RED, fontSize: 16, fontWeight: '600' },
});