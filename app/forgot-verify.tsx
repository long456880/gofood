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
import { supabase } from '@/lib/supabase';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

const RED = '#D62828';

export default function ForgotVerifyScreen() {
  const { t } = useTranslation();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async () => {
    if (!code.trim()) {
      Alert.alert(t('auth.forgot_password'), t('auth.enter_code'));
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: 'recovery',
    });
    setLoading(false);
    if (error) {
      Alert.alert(t('auth.sign_in_failed'), error.message);
      return;
    }
    // A verified recovery code signs the user in with a temporary session —
    // app/_layout.tsx detects that and routes to /new-password automatically.
  };

  const handleResend = async () => {
    setResending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setResending(false);
    if (error) {
      Alert.alert(t('auth.sign_in_failed'), error.message);
      return;
    }
    Alert.alert(t('auth.forgot_password'), t('auth.code_resent'));
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets={true}>
        <View style={styles.topSection}>
          <View style={styles.circle1} />
          <View style={styles.circle2} />
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.iconBg}>
            <Ionicons name="mail-open-outline" size={36} color="#fff" />
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.formTitle}>{t('auth.enter_code_title')}</Text>
          <Text style={styles.formSubtitle}>{t('auth.enter_code_subtitle', { email })}</Text>

          <Text style={styles.label}>{t('auth.code')}</Text>
          <View style={styles.inputRow}>
            <Ionicons name="keypad-outline" size={20} color="#999" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholderTextColor="#999"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? t('auth.verifying') : t('auth.verify_code')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.switchButton} onPress={handleResend} disabled={resending}>
            <Text style={styles.switchText}>
              {resending ? t('auth.sending_code') : t('auth.resend_code')}
            </Text>
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
    height: 220,
    justifyContent: 'flex-end',
    paddingBottom: 40,
    alignItems: 'center',
    overflow: 'hidden',
  },
  backBtn: { position: 'absolute', top: 54, left: 20, zIndex: 2, padding: 4 },
  circle1: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(255,255,255,0.08)', top: -100, right: -80 },
  circle2: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.06)', bottom: -60, left: -40 },
  iconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
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
  formSubtitle: { fontSize: 14, color: '#888', marginBottom: 28, lineHeight: 20 },
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
  input: { flex: 1, color: '#111', fontSize: 15, paddingVertical: 14, letterSpacing: 4 },
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
  switchButton: { alignItems: 'center', paddingVertical: 4, marginTop: 20 },
  switchText: { color: RED, fontSize: 14, fontWeight: '600' },
});
