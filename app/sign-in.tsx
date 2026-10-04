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
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

const RED = '#D62828';

export default function SignInScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      Alert.alert(t('auth.sign_in_failed'), error.message);
    }
  };

    const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        console.log('Google sign-in error (from result):', error);
        Alert.alert(t('auth.sign_in_failed'), error.message);
      }
    } catch (err) {
      console.log('Google sign-in error (thrown exception):', err);
      Alert.alert(t('auth.sign_in_failed'), t('auth.google_error'));
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
        {/* Top red wave section */}
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
            <Text style={styles.logoTagline}>{t('home.tagline')}</Text>
          </View>
        </View>

        {/* Form section */}
        <View style={styles.formSection}>
          <Text style={styles.formTitle}>{t('auth.welcome_back')}</Text>
          <Text style={styles.formSubtitle}>{t('auth.sign_in_subtitle')}</Text>

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

          <TouchableOpacity style={styles.forgotButton} onPress={() => router.push('/forgot-password')}>
            <Text style={styles.forgotText}>{t('auth.forgot_password')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? t('auth.signing_in') : t('auth.sign_in')}
            </Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>{t('auth.or')}</Text>
            <View style={styles.divider} />
          </View>

          <TouchableOpacity
            style={[styles.googleButton, googleLoading && styles.buttonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={googleLoading}
          >
            <Ionicons name="logo-google" size={20} color="#111" />
            <Text style={styles.googleButtonText}>
              {googleLoading ? t('auth.connecting') : t('auth.continue_with_google')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.switchButton} onPress={() => router.push('/sign-up')}>
            <Text style={styles.switchText}>{t('auth.no_account')}</Text>
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
    height: 280,
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
  formSubtitle: { fontSize: 14, color: '#888', marginBottom: 28 },
  label: { fontSize: 13, color: '#555', fontWeight: '600', marginBottom: 8, marginLeft: 2 },
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
  forgotButton: { alignSelf: 'flex-end', marginBottom: 18, marginTop: -8 },
  forgotText: { color: RED, fontSize: 13, fontWeight: '600' },
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