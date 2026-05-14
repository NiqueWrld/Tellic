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
                Scripts/get_contacts.py
              </code>{' '}
              — pulls contact list
            </li>
            <li>
              <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
                Scripts/get_messages.py
              </code>{' '}
              — exports/parses chats and writes JSON
            </li>
            <li>
              <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
                app.py
              </code>{' '}
              — Tkinter launcher
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
            <li>Python 3.10+</li>
            <li>
              Install dependencies (
              <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
                uiautomator2
              </code>
              , etc.)
            </li>
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
            <li>
              Validate with{' '}
              <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
                python -m py_compile app.py
              </code>
            </li>
            <li>Rebuild EXE if GUI changed</li>
            <li>Open PR with what changed, how to test, known limitations</li>
          </ol>
        </div>
      </article>
    </div>
  );
}
