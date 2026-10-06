import { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { supabase } from '@/lib/supabase';
import { signInWithGoogle } from '@/lib/google-auth';
import { apiFetch } from '@/lib/api-fetch';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

const RED = '#D62828';

type AccountType = 'home_cook' | 'chef';

export default function SignUpScreen() {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>('home_cook');
  const [agreedChefTerms, setAgreedChefTerms] = useState(false);

    const handleSignUp = async () => {
    if (accountType === 'chef' && !agreedChefTerms) {
      Alert.alert(t('auth.chef_terms_required_title'), t('auth.chef_terms_required_message'));
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    if (error) {
      setLoading(false);
      Alert.alert(t('auth.sign_up_failed'), error.message);
      return;
    }

    // Supabase returns a success response with no error even when the email
    // is already taken (by design, so a sign-up form can't be used to probe
    // which emails exist) — an empty `identities` array is the only signal
    // that nothing was actually created. Left unchecked, this reads as a
    // successful sign-up with no password ever attached to the account.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setLoading(false);
      Alert.alert(t('auth.sign_up_failed'), t('auth.email_already_registered'));
      return;
    }

    try {
      await apiFetch('/api/profile/account-type', {
        method: 'POST',
        body: JSON.stringify({ accountType }),
      });
    } catch (err) {
      console.warn('Failed to save account type:', err);
      Alert.alert(t('auth.account_created'), t('auth.account_type_save_failed'));
    }

    setLoading(false);
  };

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        Alert.alert(t('auth.sign_up_failed'), error.message);
      }
    } catch (err) {
      console.log('Google sign-up error (thrown exception):', err);
      Alert.alert(t('auth.sign_up_failed'), t('auth.google_error'));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
     <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets={true}>
        {/* Top red section */}
        <View style={styles.topSection}>
          <View style={styles.circle1} />
          <View style={styles.circle2} />
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Image
                source={require('../assets/images/gofood-hat.png')}
                style={styles.logoHat}
                contentFit="contain"
              />
            </View>
            <Text style={styles.logoText}>GoFood</Text>
            <Text style={styles.logoTagline}>{t('auth.sign_up_tagline')}</Text>
          </View>
        </View>

        {/* Form */}
        <View style={styles.formSection}>
          <Text style={styles.formTitle}>{t('auth.create_account')}</Text>
          <Text style={styles.formSubtitle}>{t('auth.sign_up_subtitle')}</Text>

          {/* Account type selection */}
          <Text style={styles.label}>{t('auth.account_type')}</Text>
          <View style={styles.roleRow}>
            <TouchableOpacity
              style={[styles.roleCard, accountType === 'home_cook' && styles.roleCardActive]}
              onPress={() => setAccountType('home_cook')}
              activeOpacity={0.8}
            >
              <Text style={[styles.roleTitle, accountType === 'home_cook' && styles.roleTitleActive]}>
                {t('auth.home_cook')}
              </Text>
              <Text style={[styles.roleDesc, accountType === 'home_cook' && styles.roleDescActive]}>
                {t('auth.home_cook_desc')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleCard, accountType === 'chef' && styles.roleCardActive]}
              onPress={() => setAccountType('chef')}
              activeOpacity={0.8}
            >
              <Text style={[styles.roleTitle, accountType === 'chef' && styles.roleTitleActive]}>
                {t('auth.chef')}
              </Text>
              <Text style={[styles.roleDesc, accountType === 'chef' && styles.roleDescActive]}>
                {t('auth.chef_desc')}
              </Text>
            </TouchableOpacity>
          </View>

          {accountType === 'chef' && (
            <TouchableOpacity
              style={styles.chefTermsBox}
              onPress={() => setAgreedChefTerms((v) => !v)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, agreedChefTerms && styles.checkboxChecked]}>
                {agreedChefTerms && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={styles.chefTermsText}>{t('auth.chef_terms_text')}</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.label}>{t('auth.name')}</Text>
          <View style={styles.inputRow}>
            <Ionicons name="person-outline" size={20} color="#999" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholderTextColor="#999"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          <Text style={styles.label}>{t('auth.email')}</Text>
          <View style={styles.inputRow}>
            <Ionicons name="mail-outline" size={20} color="#999" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <Text style={styles.label}>{t('auth.password')}</Text>
          <View style={styles.inputRow}>
            <Ionicons name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="#999"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignUp}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? t('auth.creating') : t('auth.sign_up')}
            </Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>{t('auth.or')}</Text>
            <View style={styles.divider} />
          </View>

          <TouchableOpacity
            style={[styles.googleButton, googleLoading && styles.buttonDisabled]}
            onPress={handleGoogleSignUp}
            disabled={googleLoading}
          >
            <Ionicons name="logo-google" size={20} color="#111" />
            <Text style={styles.googleButtonText}>
              {googleLoading ? t('auth.connecting') : t('auth.continue_with_google')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.switchButton} onPress={() => router.push('/sign-in')}>
            <Text style={styles.switchText}>{t('auth.have_account')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flexGrow: 1 },
  topSection: {
    backgroundColor: RED,
    height: 260,
    justifyContent: 'flex-end',
    paddingBottom: 40,
    alignItems: 'center',
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -100,
    right: -80,
  },
  circle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -60,
    left: -40,
  },
  logoContainer: { alignItems: 'center', zIndex: 1 },
  logoIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  logoHat: { width: 46, height: 38 },
  logoText: { fontSize: 32, fontWeight: 'bold', color: '#FFFFFF', letterSpacing: 1 },
  logoTagline: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  formSection: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24,
    padding: 28,
    paddingTop: 32,
  },
  formTitle: { fontSize: 24, fontWeight: 'bold', color: '#111', marginBottom: 4 },
  formSubtitle: { fontSize: 14, color: '#888', marginBottom: 24 },
  label: { fontSize: 13, color: '#555', fontWeight: '600', marginBottom: 8, marginLeft: 2 },
  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  roleCard: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  roleCardActive: {
    borderColor: RED,
    backgroundColor: RED,
  },
  roleIconBg: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  roleIconBgActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  roleTitle: { fontSize: 14, fontWeight: '700', color: '#111', marginBottom: 4 },
  roleTitleActive: { color: '#FFFFFF' },
  roleDesc: { fontSize: 11, color: '#888', textAlign: 'center', lineHeight: 15 },
  roleDescActive: { color: 'rgba(255,255,255,0.85)' },
  chefTermsBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
  },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: '#D0D0D0', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxChecked: { backgroundColor: RED, borderColor: RED },
  chefTermsText: { fontSize: 12.5, flex: 1, lineHeight: 18, color: '#555' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, color: '#111', fontSize: 15, paddingVertical: 14 },
  button: {
    flexDirection: 'row',
    backgroundColor: RED,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    shadowColor: RED,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 10 },
  divider: { flex: 1, height: 1, backgroundColor: '#E8E8E8' },
  dividerText: { color: '#999', fontSize: 13 },
  googleButton: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  googleButtonText: { color: '#111', fontSize: 15, fontWeight: '700' },
  switchButton: { alignItems: 'center', paddingVertical: 4 },
  switchText: { color: RED, fontSize: 14, fontWeight: '600' },
});