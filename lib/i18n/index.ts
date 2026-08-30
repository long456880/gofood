import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import km from './km.json';

i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v4',
    lng: 'en',
    fallbackLng: 'en',
    resources: {
      en: { translation: en },
      km: { translation: km },
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;