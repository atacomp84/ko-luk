import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    debug: false,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already safes from xss
    },
    resources: {
      en: {
        translation: {}, // will be loaded automatically
      },
      tr: {
        translation: {}, // will be loaded automatically
      },
    },
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
  });

// We need to manually load the initial namespaces
const loadTranslations = async () => {
  const en = await import('../public/locales/en/translation.json');
  const tr = await import('../public/locales/tr/translation.json');
  i18n.addResourceBundle('en', 'translation', en.default);
  i18n.addResourceBundle('tr', 'translation', tr.default);
  // This is a workaround to trigger a re-render after loading resources
  i18n.changeLanguage(i18n.language);
};

loadTranslations();

export default i18n;