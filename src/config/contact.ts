/**
 * Contact form configuration.
 *
 * We use Formspree (https://formspree.io) as a transport so sellers can send
 * feedback without us exposing an email address on the public site.
 *
 * HOW TO ENABLE:
 *   1. Go to https://formspree.io/, sign up (free plan = 50 submissions/month).
 *   2. Create a new form. Set the destination to the email where you want
 *      feedback delivered.
 *   3. Copy the form's "endpoint" URL — it looks like:
 *        https://formspree.io/f/XXXXXXXX
 *   4. Paste it below as FORMSPREE_ENDPOINT.
 *   5. Rebuild and redeploy.
 *
 * If FORMSPREE_ENDPOINT is left empty, the About page will gracefully fall
 * back to showing only the GitHub link — the form is hidden, nothing breaks.
 */
export const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xqennqpr';

/** Public GitHub repo URL used as a secondary contact channel. */
export const GITHUB_REPO_URL = 'https://github.com/eddiechu1009-bit/amazon-kyc-precheck';

export function isContactFormEnabled(): boolean {
  return FORMSPREE_ENDPOINT.startsWith('https://formspree.io/f/');
}
