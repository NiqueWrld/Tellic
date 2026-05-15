export function OverviewPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <i className="ph-fill ph-info text-3xl text-indigo-600" />
        <h2 className="text-2xl font-bold">Overview</h2>
      </div>

      <article className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <p className="text-gray-700 dark:text-gray-300 mb-3">
          Tellic exports WhatsApp chats into structured JSON using:
        </p>
        <ul className="space-y-2 text-gray-700 dark:text-gray-300">
          <li className="flex items-start gap-2">
            <i className="ph ph-desktop text-indigo-600 mt-1" />
            Electron + React desktop UI for device selection, contacts, messages,
            and tutorial flow
          </li>
          <li className="flex items-start gap-2">
            <i className="ph ph-terminal-window text-indigo-600 mt-1" />
            Electron main process ADB automation for contact pull and message
            export/import
          </li>
          <li className="flex items-start gap-2">
            <i className="ph ph-android-logo text-indigo-600 mt-1" />
            An Android helper app (
            <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">WaSaver</code>) for share/export capture
          </li>
          <li className="flex items-start gap-2">
            <i className="ph ph-database text-indigo-600 mt-1" />
            Local JSON persistence in app data (
            <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">contacts.json</code>,{' '}
            <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">messages.json</code>, and exported
            <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">.txt</code> files)
          </li>
        </ul>
      </article>
    </div>
  );
}
