import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LogoMark } from '@/components/brand/LogoMark';
import { Wordmark } from '@/components/brand/Wordmark';
import { Button } from '@/components/ui/Button';
import { spacing } from '@/constants/spacing';
import type { ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/lib/appearance';
import { fontFamily, typography } from '@/constants/typography';

export default function WelcomeScreen() {
  const styles = useThemedStyles(makeStyles);
  const { width } = useWindowDimensions();
  const logoSize = Math.round(width * 0.46);

  return (
    <View style={styles.root}>
      <Image
        source={require('../../assets/images/splash-hero.png')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />
      <View style={styles.overlay} />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.brand}>
          <LogoMark size={logoSize} />
          <Wordmark size={36} accent="food" style={styles.wordmark} />
          <Text style={styles.tagline}>Taste. Share. Discover.</Text>
        </View>
        <View style={styles.bottom}>
          <Button
            title="Get Started"
            icon="arrow-forward"
            onPress={() => router.push('/sign-in')}
            style={styles.cta}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => ({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 12, 18, 0.48)',
  },
  safe: {
    flex: 1,
    justifyContent: 'space-between' as const,
  },
  brand: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: spacing.xl,
  },
  wordmark: {
    marginTop: 4,
  },
  tagline: {
    ...typography.body,
    fontFamily: fontFamily.body,
    fontStyle: 'italic' as const,
    color: colors.textPrimary,
    fontSize: 16,
    marginTop: spacing.sm,
  },
  bottom: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  cta: {
    minHeight: 56,
  },
});