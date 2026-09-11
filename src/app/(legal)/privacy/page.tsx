import type { Metadata } from 'next';
import { LEGAL_LAST_UPDATED, LEGAL_CONTACT_EMAIL } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Privacy Policy | DM Agent Portal',
  description:
    'How DM Agent Portal collects and uses information for its invite-only users, including authentication via Clerk and Google Sign-In.',
};

const h2 = 'text-lg font-semibold text-gray-900 mt-8 mb-2';
const p = 'text-sm text-gray-600 leading-relaxed mb-4';
const ul = 'list-disc pl-5 text-sm text-gray-600 leading-relaxed mb-4 space-y-1';

export default function PrivacyPolicyPage() {
  return (
    <article>
      <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-600">
        Legal
      </span>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">Privacy Policy</h1>
      <p className="mt-2 text-sm text-gray-500">Last updated: {LEGAL_LAST_UPDATED}</p>

      <p className={p}>
        DM Agent Portal (&quot;the Application,&quot; &quot;we,&quot; or &quot;us&quot;) is an
        invite-only web application used by authorized team members and partners to manage and
        review marketing content and account activity. This Privacy Policy explains what
        information we collect through the Application and how it is used.
      </p>

      <h2 className={h2}>Invite-Only Access</h2>
      <p className={p}>
        The Application is not open to the public. Access is granted only to individuals who have
        been invited by an authorized administrator.
      </p>

      <h2 className={h2}>Information We Collect</h2>
      <p className={p}>
        Authentication for the Application is provided by Clerk. Users may sign in using an
        email-based method or using Google Sign-In.
      </p>
      <p className={p}>
        When you sign in with Google, the Application may receive basic account information
        necessary for authentication, which can include your name, email address, profile image,
        and Google account identifier, depending on the information made available by Google.
      </p>
      <p className={p}>
        The Application may also store information you provide, or that is generated while using
        the portal — such as filter selections, saved views, and approval or feedback submissions
        — as necessary to provide the service to you.
      </p>

      <h2 className={h2}>How We Use Information</h2>
      <ul className={ul}>
        <li>To authenticate you and confirm you are an authorized user</li>
        <li>To identify and manage your account within the Application</li>
        <li>To provide, operate, and maintain your access to the Application</li>
      </ul>
      <p className={p}>
        Google account information obtained through Google Sign-In is used only for
        authentication, account identification, account management, and providing you access to
        the Application. Google Sign-In is not used to access your Gmail messages, Google Drive
        files, Google Calendar, contacts, or other Google account content.
      </p>
      <p className={p}>
        We do not sell Google user data, and we do not use information obtained through Google
        authentication for advertising purposes.
      </p>

      <h2 className={h2}>Third-Party Services</h2>
      <p className={p}>
        Authentication is provided through Clerk and, where selected, Google. These third-party
        providers may process information as part of the authentication process in accordance
        with their own privacy policies.
      </p>

      <h2 className={h2}>Cookies and Session Technology</h2>
      <p className={p}>
        The Application uses cookies and similar session technologies as necessary to sign you
        in, keep you signed in, and operate core functionality of the portal.
      </p>

      <h2 className={h2}>Data Retention</h2>
      <p className={p}>
        We retain account and application information for as long as your access to the
        Application remains active, or as otherwise needed to operate the service for authorized
        users.
      </p>

      <h2 className={h2}>Changes to This Policy</h2>
      <p className={p}>
        We may update this Privacy Policy from time to time. The current version will always be
        posted on this page along with its last updated date.
      </p>

      <h2 className={h2}>Contact</h2>
      <p className={p}>
        If you have questions about this Privacy Policy or wish to make a request regarding your
        information, please contact us at{' '}
        <strong className="font-medium text-gray-800">{LEGAL_CONTACT_EMAIL}</strong>.
      </p>
    </article>
  );
}
