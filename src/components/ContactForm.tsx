import { useState } from 'react';
import { useT } from '../i18n';
import { FORMSPREE_ENDPOINT, isContactFormEnabled } from '../config/contact';

/**
 * In-page contact form.
 *
 * Submits to Formspree. The destination email is configured on Formspree's
 * side, never in source code — so the maintainer's address is not exposed
 * on the public GitHub Pages site.
 *
 * Falls back to a disabled state if FORMSPREE_ENDPOINT isn't set yet.
 */

type Category = 'bug' | 'rule_issue' | 'suggestion' | 'general';
type Status = 'idle' | 'sending' | 'sent' | 'error';

const CATEGORIES: Category[] = ['bug', 'rule_issue', 'suggestion', 'general'];
const MIN_MESSAGE_LEN = 10;
const MAX_MESSAGE_LEN = 4000;

export default function ContactForm() {
  const { t, lang } = useT();

  const [category, setCategory] = useState<Category>('general');
  const [message, setMessage] = useState('');
  const [replyEmail, setReplyEmail] = useState('');
  const [honeypot, setHoneypot] = useState(''); // anti-bot field, humans won't fill this
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const enabled = isContactFormEnabled();
  if (!enabled) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-xs text-gray-500 leading-relaxed">
        {t('contactFormDisabled')}
      </div>
    );
  }

  const isValid =
    message.trim().length >= MIN_MESSAGE_LEN && message.trim().length <= MAX_MESSAGE_LEN;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || status === 'sending') return;

    // Honeypot tripped → silently pretend success, drop the submission.
    if (honeypot.trim().length > 0) {
      setStatus('sent');
      return;
    }

    setStatus('sending');
    setErrorMsg('');

    try {
      const payload = {
        category,
        message: message.trim(),
        replyEmail: replyEmail.trim() || '(not provided)',
        lang,
        userAgent: navigator.userAgent,
        submittedAt: new Date().toISOString(),
        // Formspree picks this up as the subject line in the forwarded email
        _subject: `[Pass KYC] ${categoryLabel(category, t)} — ${new Date().toISOString().slice(0, 10)}`,
      };

      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      setStatus('sent');
      setMessage('');
      setReplyEmail('');
      setCategory('general');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  if (status === 'sent') {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-5 py-5 text-sm text-emerald-900">
        <div className="flex items-start gap-3">
          <span className="text-2xl leading-none" aria-hidden>
            ✅
          </span>
          <div className="flex-1">
            <p className="font-semibold">{t('contactFormSentTitle')}</p>
            <p className="text-xs mt-1 leading-relaxed">{t('contactFormSentDesc')}</p>
            <button
              type="button"
              onClick={() => setStatus('idle')}
              className="mt-3 text-xs text-emerald-800 hover:text-emerald-900 font-medium hover:underline"
            >
              {t('contactFormSendAnother')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Category */}
      <div>
        <label className="block text-xs font-semibold text-amazon-dark mb-1.5">
          {t('contactFormCategory')}
        </label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${
                category === c
                  ? 'bg-amazon-orange text-white border-amazon-orange shadow-sm'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-amazon-orange/40'
              }`}
            >
              {categoryLabel(c, t)}
            </button>
          ))}
        </div>
      </div>

      {/* Message */}
      <div>
        <label
          htmlFor="contact-message"
          className="block text-xs font-semibold text-amazon-dark mb-1.5"
        >
          {t('contactFormMessage')} <span className="text-red-500">*</span>
        </label>
        <textarea
          id="contact-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          maxLength={MAX_MESSAGE_LEN}
          placeholder={t('contactFormMessagePlaceholder')}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-amazon-orange focus:ring-2 focus:ring-amazon-orange/20 focus:outline-none transition resize-y"
          required
        />
        <div className="flex justify-between text-[11px] text-gray-400 mt-1">
          <span>
            {message.trim().length < MIN_MESSAGE_LEN
              ? t('contactFormTooShort').replace('{n}', String(MIN_MESSAGE_LEN))
              : ' '}
          </span>
          <span>
            {message.length} / {MAX_MESSAGE_LEN}
          </span>
        </div>
      </div>

      {/* Reply email (optional) */}
      <div>
        <label
          htmlFor="contact-reply-email"
          className="block text-xs font-semibold text-amazon-dark mb-1.5"
        >
          {t('contactFormReplyEmail')} <span className="text-gray-400 font-normal">({t('optional')})</span>
        </label>
        <input
          id="contact-reply-email"
          type="email"
          value={replyEmail}
          onChange={(e) => setReplyEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-amazon-orange focus:ring-2 focus:ring-amazon-orange/20 focus:outline-none transition"
          autoComplete="email"
        />
      </div>

      {/* Honeypot — hidden from real users, bots fill it */}
      <div
        aria-hidden="true"
        style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}
      >
        <label>
          Do not fill this out
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </label>
      </div>

      {status === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
          <strong>{t('contactFormErrorTitle')}</strong> {errorMsg || ''}
        </div>
      )}

      <button
        type="submit"
        disabled={!isValid || status === 'sending'}
        className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
          isValid && status !== 'sending'
            ? 'bg-amazon-orange text-white hover:bg-amazon-orange-hover shadow-cta hover:-translate-y-0.5'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}
      >
        {status === 'sending' ? t('contactFormSending') : t('contactFormSubmit')}
      </button>
    </form>
  );
}

function categoryLabel(c: Category, t: (k: any) => string): string {
  switch (c) {
    case 'bug':
      return t('contactCategoryBug');
    case 'rule_issue':
      return t('contactCategoryRule');
    case 'suggestion':
      return t('contactCategorySuggestion');
    case 'general':
      return t('contactCategoryGeneral');
  }
}
