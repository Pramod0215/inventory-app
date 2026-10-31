import { useState } from 'react';
import AppHeader from '../components/AppHeader.jsx';
import { api } from '../services/api.js';
import { useI18n } from '../i18n/I18nProvider.jsx';

const categories = ['General', 'Products', 'Orders', 'Website'];

export default function FeedbackPage({ userName, onSettings, onProfile, onLogout, onFeedback, onBack }) {
  const { t } = useI18n();
  const [category, setCategory] = useState('General');
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: '', text: '' });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: '', text: '' });

    try {
      const response = await api.feedback.submit({ category, rating, message: message.trim() });
      const result = await response.json();
      if (!response.ok) throw new Error(t('Unable to submit your feedback.'));
      setStatus({ type: 'success', text: t('Thank you. Your feedback has been received by our team.') });
      setMessage('');
      setRating(5);
      setCategory('General');
    } catch (error) {
      setStatus({ type: 'error', text: t('Unable to submit your feedback. Please try again.') });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="account-page feedback-page">
      <div className="page-shell">
        <AppHeader
          userName={userName}
          onSettings={onSettings}
          onProfile={onProfile}
          onLogout={onLogout}
          onFeedback={onFeedback}
        />
        <header className="page-header">
          <div>
            <p className="eyebrow">{t('We value your voice')}</p>
            <h1>{t('Share your feedback')}</h1>
            <p className="feedback-intro">{t('Tell us about your experience. Your feedback helps us improve InventoryPro.')}</p>
          </div>
          <button type="button" className="secondary-button" onClick={onBack}>{t('Back to store')}</button>
        </header>

        <div className="feedback-layout">
          <section className="feedback-card">
            <div className="feedback-card__heading">
              <span className="feedback-card__icon" aria-hidden="true">✦</span>
              <div>
                <h2>{t('Your experience matters')}</h2>
                <p>{t('Our team reviews every submission.')}</p>
              </div>
            </div>
            <form className="feedback-form" onSubmit={handleSubmit}>
              <label htmlFor="feedback-category">{t('What is your feedback about?')}</label>
              <select id="feedback-category" value={category} onChange={(event) => setCategory(event.target.value)}>
                {categories.map((option) => <option key={option} value={option}>{t(option)}</option>)}
              </select>

              <fieldset className="feedback-rating">
                <legend>{t('How was your experience?')}</legend>
                <div className="feedback-rating__options">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <label key={value} className={rating === value ? 'selected' : ''}>
                      <input
                        type="radio"
                        name="feedback-rating"
                        value={value}
                        checked={rating === value}
                        onChange={() => setRating(value)}
                      />
                      <span aria-hidden="true">★</span>
                      <span className="visually-hidden">{value} {t(value === 1 ? 'star' : 'stars')}</span>
                    </label>
                  ))}
                  <span>{rating} / 5</span>
                </div>
              </fieldset>

              <label htmlFor="feedback-message">{t('Tell us more')}</label>
              <textarea
                id="feedback-message"
                rows="6"
                minLength="10"
                maxLength="2000"
                required
                placeholder={t('What went well? What could we do better?')}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
              <div className="feedback-form__footer">
                <span>{message.length}/2000 {t('characters')}</span>
                <button type="submit" className="primary-button" disabled={isSubmitting || message.trim().length < 10}>
                  {isSubmitting ? t('Submitting…') : t('Submit feedback')}
                </button>
              </div>
            </form>
            {status.text && (
              <p className={`status ${status.type}`} role={status.type === 'error' ? 'alert' : 'status'}>
                {status.text}
              </p>
            )}
          </section>

          <aside className="feedback-aside">
            <p className="eyebrow">{t('Need help now?')}</p>
            <h2>{t('We’re here for you')}</h2>
            <p>{t('For a quick answer, chat with our AI customer support from the support icon in the header.')}</p>
            <div className="feedback-aside__note">
              <strong>{t('What happens next?')}</strong>
              <span>{t('Your feedback is securely recorded and shared with our product team.')}</span>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
