export function ContributePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <i className="ph-fill ph-git-pull-request text-3xl text-indigo-600" />
        <h2 className="text-2xl font-bold">Contributing</h2>
      </div>

      <article className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <div>
          <h4 className="font-semibold flex items-center gap-2 mb-2">
            <i className="ph ph-folder-open text-indigo-600" />
            Project Structure
          </h4>
          <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1">
            <li>
              <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
                src/main.ts
              </code>{' '}
              — Electron main process + ADB automation
            </li>
            <li>
              <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
                src/preload.ts
              </code>{' '}
              — secure IPC bridge exposed to renderer
            </li>
            <li>
              <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
                src/pages/App/
              </code>{' '}
              — app UI pages (Tutorial, Devices, Contacts, Messages)
            </li>
            <li>
              <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
                src/hooks/
              </code>{' '}
              — contacts/messages state and IPC actions
            </li>
            <li>
              <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
                scripts/
              </code>{' '}
              — icon and packaging helpers
            </li>
            <li>
              <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
                WaSaver/
              </code>{' '}
              — Android app source + build script
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold flex items-center gap-2 mb-2">
            <i className="ph ph-wrench text-indigo-600" />
            Local Setup
          </h4>
          <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1">
            <li>Node.js 20+ and npm</li>
            <li>Install dependencies with <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">npm install</code></li>
            <li>ADB installed and on PATH</li>
            <li>Android device with USB debugging enabled</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold flex items-center gap-2 mb-2">
            <i className="ph ph-check-circle text-indigo-600" />
            Workflow
          </h4>
          <ol className="list-decimal list-inside text-gray-700 dark:text-gray-300 space-y-1">
            <li>Create a feature branch</li>
            <li>Keep changes focused</li>
            <li>Run and verify with <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">npm start</code></li>
            <li>Lint with <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">npm run lint</code></li>
            <li>Package with <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">npm run make</code> when release-facing changes are made</li>
            <li>Open PR with what changed, how to test, known limitations</li>
          </ol>
        </div>
      </article>
    </div>
  );
}
