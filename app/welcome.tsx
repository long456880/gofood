import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const RED = '#D62828';

const FEATURES: { icon: keyof typeof Ionicons.glyphMap; key: string }[] = [
  { icon: 'color-wand-outline', key: 'welcome.feature_animations' },
  { icon: 'restaurant-outline', key: 'welcome.feature_chefs' },
  { icon: 'language-outline', key: 'welcome.feature_bilingual' },
];

export default function WelcomeScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const isKhmer = i18n.language === 'km';

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#E8342F', RED, '#A81F1F']} style={styles.hero}>
        <View style={styles.circleTop} />
        <View style={styles.circleBottom} />

        <Animated.View
          entering={FadeIn.duration(500)}
          style={[styles.langRow, { paddingTop: insets.top + 8 }]}
        >
          <TouchableOpacity
            style={styles.langPill}
            activeOpacity={0.8}
            onPress={() => i18n.changeLanguage(isKhmer ? 'en' : 'km')}
          >
            <Ionicons name="globe-outline" size={14} color="#FFFFFF" />
            <Text style={styles.langText}>{isKhmer ? 'ភាសាខ្មែរ' : 'English'}</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.heroBody}>
          <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.logoBadge}>
            <Image
              source={require('../assets/images/gofood-hat-512.png')}
              style={styles.logoHat}
              contentFit="contain"
            />
          </Animated.View>

          <Animated.Text entering={FadeInDown.delay(220).duration(600)} style={styles.wordmark}>
            GoFood
          </Animated.Text>

          <Animated.Text entering={FadeInDown.delay(320).duration(600)} style={styles.tagline}>
            {t('home.tagline')}
          </Animated.Text>

          <View style={styles.features}>
            {FEATURES.map((feature, index) => (
              <Animated.View
                key={feature.key}
                entering={FadeInDown.delay(440 + index * 110).duration(600)}
                style={styles.featureRow}
              >
                <View style={styles.featureIcon}>
                  <Ionicons name={feature.icon} size={15} color="#FFFFFF" />
                </View>
                <Text style={styles.featureText}>{t(feature.key)}</Text>
              </Animated.View>
            ))}
          </View>
        </View>
      </LinearGradient>

      <Animated.View
        entering={FadeInUp.delay(300).duration(600)}
        style={[styles.sheet, { paddingBottom: insets.bottom + 22 }]}
      >
        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.9}
          onPress={() => router.push('/sign-up')}
        >
          <Text style={styles.primaryButtonText}>{t('welcome.get_started')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          activeOpacity={0.7}
          onPress={() => router.push('/sign-in')}
        >
          <Text style={styles.secondaryButtonText}>{t('auth.have_account')}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: RED },
  hero: { flex: 1, overflow: 'hidden' },
  circleTop: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -120,
    right: -90,
  },
  circleBottom: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: 40,
    left: -80,
  },
  langRow: { alignItems: 'flex-end', paddingHorizontal: 20 },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  langText: { color: '#FFFFFF', fontSize: 12.5, fontWeight: '700' },
  heroBody: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  logoBadge: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  logoHat: { width: 68, height: 56 },
  wordmark: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginTop: 20,
  },
  tagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.88)',
    marginTop: 8,
    textAlign: 'center',
  },
  features: { marginTop: 34, gap: 14, alignSelf: 'stretch' },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { flex: 1, color: 'rgba(255,255,255,0.95)', fontSize: 13.5, fontWeight: '600' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 26,
    paddingTop: 26,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: RED,
    borderRadius: 16,
    paddingVertical: 17,
    shadowColor: RED,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16.5, fontWeight: '800' },
  secondaryButton: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  secondaryButtonText: { color: RED, fontSize: 14, fontWeight: '600' },
});
