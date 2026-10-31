import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../services/api.js';
import { useI18n } from '../i18n/I18nProvider.jsx';

const suggestedQuestions = [
  'How do I place an order?',
  'How can I check product availability?',
  'What payment methods can I use?',
];

export default function SupportChat() {
  const { t, language } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '',
    },
  ]);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const endOfMessagesRef = useRef(null);

  useEffect(() => {
    setMessages((current) => current.length === 1 && current[0].role === 'assistant'
      ? [{ ...current[0], content: language === 'hi'
        ? 'नमस्ते! मैं InventoryPro सहायता सहायक हूँ। आज मैं आपकी क्या मदद कर सकता हूँ?'
        : language === 'bn'
          ? 'নমস্কার! আমি InventoryPro সহায়তা সহকারী। আজ আপনাকে কীভাবে সাহায্য করতে পারি?'
          : 'Hi! I’m the InventoryPro support assistant. What can I help you with today?' }]
      : current);
  }, [language]);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView?.({ block: 'end' });
  }, [messages, isSending]);

  const sendMessage = async (event) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || isSending) return;

    const conversation = [...messages, { role: 'user', content }];
    setMessages(conversation);
    setDraft('');
    setError('');
    setIsSending(true);

    try {
      const response = await api.support.chat(
        conversation.slice(-10).map(({ role, content: text }) => ({ role, content: text })),
        language
      );
      const result = await response.json();
      if (!response.ok) throw new Error(t('Unable to reach customer support.'));
      if (typeof result.data?.message !== 'string' || !result.data.message.trim()) {
        throw new Error(t('Customer support returned an invalid response.'));
      }
      setMessages((current) => [...current, { role: 'assistant', content: result.data.message }]);
    } catch (requestError) {
      setMessages((current) => current.slice(0, -1));
      setDraft(content);
      setError(t('Unable to reach customer support. Please try again.'));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="support-widget">
      <button
        type="button"
        className="support-widget__trigger"
        aria-label={t(isOpen ? 'Close customer support' : 'Open customer support')}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 5.75A2.75 2.75 0 0 1 6.75 3h10.5A2.75 2.75 0 0 1 20 5.75v7.5A2.75 2.75 0 0 1 17.25 16h-6.1l-4.9 4v-4h-.5A2.75 2.75 0 0 1 3 13.25v-7.5A2.75 2.75 0 0 1 5.75 3" />
          <path d="M8 8h8M8 11.5h5" />
        </svg>
        <span>{t('Support')}</span>
      </button>
      {isOpen && createPortal(
        <section className="support-chat" aria-label={t('Customer support chat')}>
          <header className="support-chat__header">
            <div className="support-chat__avatar" aria-hidden="true">I</div>
            <div>
              <h2>{t('InventoryPro support')}</h2>
              <p><span className="support-chat__status-dot" /> {t('AI assistant')}</p>
            </div>
            <button type="button" className="support-chat__close" aria-label={t('Close chat')} onClick={() => setIsOpen(false)}>
              ×
            </button>
          </header>
          <div className="support-chat__messages" role="log" aria-live="polite">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`support-chat__message support-chat__message--${message.role}`}>
                {message.content}
              </div>
            ))}
            {isSending && <div className="support-chat__typing" role="status">{t('Support is typing…')}</div>}
            <div ref={endOfMessagesRef} aria-hidden="true" />
          </div>
          {messages.length === 1 && (
            <div className="support-chat__suggestions" aria-label={t('Popular topics')}>
              <p>{t('Popular topics')}</p>
              {suggestedQuestions.map((question) => (
                <button key={question} type="button" onClick={() => setDraft(t(question))}>
                  {t(question)}
                </button>
              ))}
            </div>
          )}
          {error && <p className="support-chat__error" role="alert">{error}</p>}
          <form className="support-chat__form" onSubmit={sendMessage}>
            <label className="visually-hidden" htmlFor="support-message">{t('Your message')}</label>
            <textarea
              id="support-message"
              rows="2"
              maxLength="1000"
              placeholder={t('Ask us anything…')}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form.requestSubmit();
                }
              }}
            />
            <button type="submit" disabled={!draft.trim() || isSending} aria-label={t('Send message')}>
              {isSending ? '…' : t('Send')}
            </button>
          </form>
          <p className="support-chat__disclaimer">{t('Messages are sent to Hugging Face for replies. Never share passwords or payment details; AI responses can be inaccurate.')}</p>
        </section>,
        document.body
      )}
    </div>
  );
}
