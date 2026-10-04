import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/lib/theme-context';
import { apiFetch } from '@/lib/api-fetch';
import { useSession } from '@/lib/supabase';

const RED = '#D62828';

export default function EditProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { data: session } = useSession();
  const [username, setUsername] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    apiFetch('/api/profile')
      .then((res) => res.json())
      .then((data) => {
        setUsername(data.username ?? session?.user.user_metadata?.name ?? '');
      })
      .finally(() => setLoadingProfile(false));
  }, []);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!username.trim()) {
      Alert.alert(t('common.error'), t('edit_profile_screen.name_empty_error'));
      return;
    }
    if (newPassword && !currentPassword) {
      Alert.alert(t('common.error'), t('edit_profile_screen.current_password_required_error'));
      return;
    }
    if (newPassword && newPassword.length < 8) {
      Alert.alert(t('common.error'), t('edit_profile_screen.password_too_short_error'));
      return;
    }

    setLoading(true);
    const res = await apiFetch('/api/profile/update', {
      method: 'POST',
      body: JSON.stringify({
        username: username.trim(),
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      Alert.alert(t('common.failed'), data.error ?? t('common.something_wrong'));
      return;
    }

    Alert.alert(t('common.success'), t('edit_profile_screen.success_message'));
    router.back();
  };
  if (loadingProfile) {
  return (
    <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color="#D62828" />
    </View>
  );
}

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="chevron-back" size={22} color={RED} />
        <Text style={styles.backText}>{t('common.back')}</Text>
      </TouchableOpacity>

      <Text style={[styles.title, { color: colors.text }]}>{t('profile.edit_profile')}</Text>
      <Text style={[styles.subtitle, { color: colors.subtext }]}>
        {t('edit_profile_screen.subtitle')}
      </Text>

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('edit_profile_screen.display_name')}</Text>
        <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.input }]}>
          <Ionicons name="person-outline" size={20} color="#999" style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            value={username}
            onChangeText={setUsername}
            placeholderTextColor="#999"
            placeholder={t('edit_profile_screen.name_placeholder')}
            autoCapitalize="words"
          />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('edit_profile_screen.change_password')}</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.subtext }]}>
          {t('edit_profile_screen.change_password_subtitle')}
        </Text>

        <Text style={[styles.label, { color: colors.subtext }]}>{t('edit_profile_screen.current_password')}</Text>
        <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.input }]}>
          <Ionicons name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry={!showCurrent}
            placeholder={t('edit_profile_screen.current_password_placeholder')}
            placeholderTextColor="#999"
          />
          <TouchableOpacity onPress={() => setShowCurrent((v) => !v)}>
            <Ionicons name={showCurrent ? 'eye-off-outline' : 'eye-outline'} size={20} color="#999" />
          </TouchableOpacity>
        </View>

        <Text style={[styles.label, { color: colors.subtext }]}>{t('edit_profile_screen.new_password')}</Text>
        <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.input }]}>
          <Ionicons name="lock-open-outline" size={20} color="#999" style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showNew}
            placeholder={t('edit_profile_screen.new_password_placeholder')}
            placeholderTextColor="#999"
          />
          <TouchableOpacity onPress={() => setShowNew((v) => !v)}>
            <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={20} color="#999" />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, loading && { opacity: 0.6 }]}
        onPress={handleSave}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.saveButtonText}>{t('edit_profile_screen.save_changes')}</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingTop: 56, paddingBottom: 40 },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backText: { color: RED, fontSize: 16, marginLeft: 2 },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 6 },
  subtitle: { fontSize: 14, marginBottom: 24, lineHeight: 20 },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  sectionSubtitle: { fontSize: 13, marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 8, marginTop: 12 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 4,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, paddingVertical: 13 },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: RED,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: RED,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});