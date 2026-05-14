import { useEffect, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'privacyAccepted';
const PRIVACY_VERSION = '1';

function hasAccepted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === PRIVACY_VERSION;
  } catch {
    return false;
  }
}

function recordAcceptance() {
  try {
    localStorage.setItem(STORAGE_KEY, PRIVACY_VERSION);
  } catch {
    /* ignore quota / disabled storage */
  }
}

export function PrivacyGate({ children }: { children: ReactNode }) {
  const [accepted, setAccepted] = useState<boolean>(hasAccepted);
  const [agreeChecked, setAgreeChecked] = useState(false);

  useEffect(() => {
    if (accepted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [accepted]);

  if (accepted) return <>{children}</>;

  const onAccept = () => {
    if (!agreeChecked) return;
    recordAcceptance();
    setAccepted(true);
  };

  const onDecline = () => {
    // Closing the window is the only way to "decline" in Electron.
    window.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]">
        <div className="px-6 pt-6 pb-3 flex items-center gap-3 border-b border-gray-200 dark:border-gray-700">
          <i className="ph-fill ph-shield-check text-3xl text-indigo-600" />
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Privacy &amp; Consent
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Please review before continuing
            </p>
          </div>
        </div>

        <div className="px-6 py-4 overflow-y-auto text-sm text-gray-700 dark:text-gray-300 space-y-3">
          <p>
            <strong>WhatsApp Pull Chats</strong> runs entirely on your local
            machine. By using this app you acknowledge and agree to the
            following:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              Contacts, messages, and exported JSON files are read from a
              device you own or are authorised to access.
            </li>
            <li>
              All data stays on this computer. No telemetry, analytics, or
              network uploads are performed by the app.
            </li>
            <li>
              You are responsible for complying with WhatsApp&apos;s Terms of
              Service and any applicable laws or regulations in your
              jurisdiction.
            </li>
            <li>
              You will not use exported chat data to harass, impersonate, or
              violate the privacy of any third party.
            </li>
            <li>
              The app is provided <em>as-is</em> with no warranty. The authors
              accept no liability for misuse or data loss.
            </li>
          </ul>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            You can review the full policy any time from the{' '}
            <span className="font-medium">Privacy</span> page in the footer.
          </p>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
          <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreeChecked}
              onChange={(e) => setAgreeChecked(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>
              I have read and agree to the terms above and confirm I am
              authorised to access any data exported with this app.
            </span>
          </label>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button
              type="button"
              onClick={onDecline}
              className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Decline &amp; Exit
            </button>
            <button
              type="button"
              onClick={onAccept}
              disabled={!agreeChecked}
              className="px-4 py-2 rounded-md text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 dark:disabled:bg-indigo-900/40 disabled:cursor-not-allowed transition-colors"
            >
              Agree &amp; Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
