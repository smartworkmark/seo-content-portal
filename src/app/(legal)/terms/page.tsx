import type { Metadata } from 'next';
import { LEGAL_LAST_UPDATED, LEGAL_CONTACT_EMAIL } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Terms of Service | DM Agent Portal',
  description: 'Terms governing access to and use of DM Agent Portal, an invite-only web application.',
};

const h2 = 'text-lg font-semibold text-gray-900 mt-8 mb-2';
const p = 'text-sm text-gray-600 leading-relaxed mb-4';
const ul = 'list-disc pl-5 text-sm text-gray-600 leading-relaxed mb-4 space-y-1';

export default function TermsOfServicePage() {
  return (
    <article>
      <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-600">
        Legal
      </span>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">Terms of Service</h1>
      <p className="mt-2 text-sm text-gray-500">Last updated: {LEGAL_LAST_UPDATED}</p>

      <p className={p}>
        These Terms of Service (&quot;Terms&quot;) govern your access to and use of DM Agent
        Portal (&quot;the Application&quot;). By accessing or using the Application, you agree to
        these Terms. If you do not agree, do not access or use the Application.
      </p>

      <h2 className={h2}>Invite-Only Access</h2>
      <p className={p}>
        The Application is private and invite-only. Access is limited to individuals who have
        been specifically authorized or invited. You may not access the Application if you have
        not been authorized to do so, and you may not share your access with anyone who has not.
      </p>

      <h2 className={h2}>Account Responsibilities</h2>
      <p className={p}>
        You are responsible for maintaining the confidentiality and security of your account and
        authentication credentials, and for all activity that occurs under your account. Notify
        us promptly if you become aware of any unauthorized use of your account.
      </p>

      <h2 className={h2}>Acceptable Use</h2>
      <p className={p}>You agree not to:</p>
      <ul className={ul}>
        <li>Attempt to bypass, disable, or circumvent any access control or authentication mechanism of the Application;</li>
        <li>Interfere with or disrupt the operation of the Application, or the servers or networks used to make it available;</li>
        <li>Access, or attempt to access, data or accounts that you are not authorized to access; or</li>
        <li>Use the Application for any purpose other than its intended business purpose.</li>
      </ul>

      <h2 className={h2}>Purpose of the Application</h2>
      <p className={p}>
        The Application and its functionality are provided solely for their intended business
        purpose of supporting authorized users in managing and reviewing marketing content and
        related account activity.
      </p>

      <h2 className={h2}>Suspension and Termination</h2>
      <p className={p}>
        We may suspend or terminate your access to the Application at any time, with or without
        notice, including if we believe you have violated these Terms or if your access is no
        longer needed for its intended business purpose.
      </p>

      <h2 className={h2}>Changes to the Service</h2>
      <p className={p}>
        We may change, update, add to, suspend, or discontinue any part of the Application at any
        time, with or without notice.
      </p>

      <h2 className={h2}>Disclaimer</h2>
      <p className={p}>
        The Application is provided on an &quot;as is&quot; and &quot;as available&quot; basis.
        We do not guarantee that the Application will be uninterrupted, timely, or error-free.
      </p>

      <h2 className={h2}>Limitation of Liability</h2>
      <p className={p}>
        To the fullest extent permitted by law, we will not be liable for any indirect,
        incidental, or consequential damages arising out of or relating to your access to or use
        of, or inability to access or use, the Application.
      </p>

      <h2 className={h2}>Changes to These Terms</h2>
      <p className={p}>
        We may update these Terms from time to time. The current version will always be posted on
        this page along with its last updated date. Continued use of the Application after
        changes are posted constitutes acceptance of the updated Terms.
      </p>

      <h2 className={h2}>Contact</h2>
      <p className={p}>
        If you have questions about these Terms, please contact us at{' '}
        <strong className="font-medium text-gray-800">{LEGAL_CONTACT_EMAIL}</strong>.
      </p>
    </article>
  );
}
