import { useI18n, usePreferences } from '../i18n/I18nProvider.jsx';

export default function PreferencesControls({
  showLanguage = true,
  showLanguageLabel = true,
  showTheme = true,
  showThemeLabel = true,
}) {
  const { language, setLanguage, theme, toggleTheme } = usePreferences();
  const { t } = useI18n();
  const nextThemeLabel = theme === 'dark' ? t('Switch to light mode') : t('Switch to dark mode');

  return (
    <div className="preferences-controls">
      {showLanguage && (
        <label className="preferences-controls__language">
          {showLanguageLabel && <span>{t('Language')}</span>}
          <select
            aria-label={t('Language')}
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
          >
            <option value="en">{t('English')}</option>
            <option value="hi">{t('Hindi')}</option>
            <option value="bn">{t('Bengali')}</option>
          </select>
        </label>
      )}
      {showTheme && (
        <button
          type="button"
          className="preferences-controls__theme"
          aria-label={nextThemeLabel}
          title={nextThemeLabel}
          onClick={toggleTheme}
        >
          <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
          {showThemeLabel && <span className="preferences-controls__theme-label">{theme === 'dark' ? t('Light mode') : t('Dark mode')}</span>}
        </button>
      )}
    </div>
  );
}
