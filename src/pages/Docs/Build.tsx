export function BuildPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <i className="ph-fill ph-package text-3xl text-indigo-600" />
        <h2 className="text-2xl font-bold">Build</h2>
      </div>

      <article className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
        <div>
          <h4 className="font-semibold flex items-center gap-2 mb-2">
            <i className="ph ph-terminal text-indigo-600" />
            Development Run
          </h4>
          <pre className="bg-gray-900 text-gray-100 rounded-lg p-3 text-sm overflow-x-auto">
            <code>
              npm install
              {'\n'}npm start
            </code>
          </pre>
          <p className="text-gray-700 dark:text-gray-300 mt-2">
            Starts the Electron app with Vite for local development.
          </p>
        </div>

        <div>
          <h4 className="font-semibold flex items-center gap-2 mb-2">
            <i className="ph ph-windows-logo text-indigo-600" />
            Desktop Package (Electron Forge)
          </h4>
          <pre className="bg-gray-900 text-gray-100 rounded-lg p-3 text-sm overflow-x-auto">
            <code>
              npm run make
            </code>
          </pre>
          <p className="text-gray-700 dark:text-gray-300 mt-2">
            Output goes to{' '}
            <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
              out/
            </code>
            . Use the generated installer/package for distribution.
          </p>
        </div>

        <div>
          <h4 className="font-semibold flex items-center gap-2 mb-2">
            <i className="ph ph-storefront text-indigo-600" />
            Microsoft Store Package (AppX)
          </h4>
          <pre className="bg-gray-900 text-gray-100 rounded-lg p-3 text-sm overflow-x-auto">
            <code>npm run make -- --targets=@electron-forge/maker-appx --platform=win32 --arch=x64</code>
          </pre>
          <p className="text-gray-700 dark:text-gray-300 mt-2">
            Generates AppX artifacts for Partner Center submission.
          </p>
        </div>

        <div>
          <h4 className="font-semibold flex items-center gap-2 mb-2">
            <i className="ph ph-android-logo text-indigo-600" />
            Android Helper APK
          </h4>
          <pre className="bg-gray-900 text-gray-100 rounded-lg p-3 text-sm overflow-x-auto">
            <code>{`powershell -ExecutionPolicy Bypass -File .\\WaSaver\\build.ps1`}</code>
          </pre>
          <p className="text-gray-700 dark:text-gray-300 mt-2">
            Output:{' '}
            <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
              WaSaver/apk/wasaver.apk
            </code>
          </p>
        </div>

        <div>
          <h4 className="font-semibold flex items-center gap-2 mb-2">
            <i className="ph ph-video-camera text-indigo-600" />
            Record Demo (scrcpy)
          </h4>
          <pre className="bg-gray-900 text-gray-100 rounded-lg p-3 text-sm overflow-x-auto">
            <code>{`adb devices
New-Item -ItemType Directory -Force .\\demo | Out-Null
scrcpy -s RF8Y10AWLYY --no-audio --max-size 1280 --max-fps 30 --time-limit 120 --record demo/how-it-works.mp4`}</code>
          </pre>
        </div>
      </article>
    </div>
  );
}
