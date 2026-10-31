import { memo, useEffect, useRef, useState } from 'react';
import SupportChat from './SupportChat.jsx';
import PreferencesControls from './PreferencesControls.jsx';
import { useI18n } from '../i18n/I18nProvider.jsx';

function AppHeader({ userName = 'User', onSettings, onProfile, onLogout, onFeedback }) {
  const { t } = useI18n();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const initials = userName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  useEffect(() => {
    if (!isMenuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) setIsMenuOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  const chooseMenuItem = (action) => {
    setIsMenuOpen(false);
    action?.();
  };

  return (
    <header className="app-header">
      <div className="app-header__brand">
        <span className="app-header__brand-mark" aria-hidden="true">I</span>
        <span>InventoryPro</span>
      </div>
      <div className="app-header__actions">
        <PreferencesControls showLanguageLabel={false} showThemeLabel={false} />
        {onFeedback && (
          <button type="button" className="app-header__feedback" onClick={onFeedback}>
            {t('Feedback')}
          </button>
        )}
        <SupportChat />
        <div className="profile-menu" ref={menuRef}>
          <button
            type="button"
            className="profile-menu__trigger"
            aria-label={t('Open user menu')}
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            <span className="profile-menu__avatar" aria-hidden="true">{initials || 'U'}</span>
            <span className="profile-menu__name">{userName}</span>
            <span className="profile-menu__chevron" aria-hidden="true">⌄</span>
          </button>
          {isMenuOpen && (
            <div className="profile-menu__dropdown" role="menu" aria-label={t('User menu')}>
              <button type="button" role="menuitem" onClick={() => chooseMenuItem(onSettings)}>
                {t('Settings')}
              </button>
              <button type="button" role="menuitem" onClick={() => chooseMenuItem(onProfile)}>
                {t('Profile')}
              </button>
              <button type="button" role="menuitem" className="profile-menu__logout" onClick={() => chooseMenuItem(onLogout)}>
                {t('Logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default memo(AppHeader);
