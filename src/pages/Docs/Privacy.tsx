export function PrivacyPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <i className="ph-fill ph-shield-check text-3xl text-indigo-600" />
        <h2 className="text-2xl font-bold">Privacy</h2>
      </div>

      <article className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4 text-gray-700 dark:text-gray-300">
        <p>
          Tellic runs locally on your machine. Your contacts,
          messages, and exported JSON never leave your device.
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>No telemetry or analytics are collected.</li>
          <li>No data is sent to remote servers.</li>
          <li>Output files are written to local app data and exported chat files on your machine.</li>
        </ul>
      </article>
    </div>
  );
}
