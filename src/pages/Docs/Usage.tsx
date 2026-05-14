export function UsagePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <i className="ph-fill ph-play-circle text-3xl text-indigo-600" />
        <h2 className="text-2xl font-bold">Usage</h2>
      </div>

      <article className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
        <div>
          <h4 className="font-semibold flex items-center gap-2 mb-2">
            <i className="ph ph-device-mobile text-indigo-600" />
            0. Enable USB Debugging (Samsung)
          </h4>
          <p className="text-gray-700 dark:text-gray-300 mb-3">
            USB Debugging on Samsung is a vital feature for users looking to
            unlock the full potential of their Android device. In this
            tutorial, you will learn exactly how to enable USB Debugging and
            access the Developer Options hidden menu on your Samsung Galaxy
            phone. Whether you need to transfer data, run advanced ADB
            commands from a computer, or develop your own mobile applications,
            activating these professional-level controls is the first step.
          </p>
          <div
            className="relative w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
            style={{ paddingTop: '56.25%' }}
          >
            <iframe
              className="absolute inset-0 w-full h-full"
              src="https://www.youtube.com/embed/rv8HGw9y98U"
              title="How to enable USB Debugging on Samsung"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            <a
              href="https://youtu.be/rv8HGw9y98U?si=WkQP3exrdokmz0DH"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Watch on YouTube <i className="ph ph-arrow-up-right" />
            </a>
          </p>
        </div>

        <div>
          <h4 className="font-semibold flex items-center gap-2 mb-2">
            <i className="ph ph-address-book text-indigo-600" />
            1. Get Contacts
          </h4>
          <pre className="bg-gray-900 text-gray-100 rounded-lg p-3 text-sm overflow-x-auto">
            <code>python Scripts/get_contacts.py</code>
          </pre>
          <p className="text-gray-700 dark:text-gray-300 mt-2">
            Creates{' '}
            <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
              contacts.json
            </code>
            .
          </p>
        </div>

        <div>
          <h4 className="font-semibold flex items-center gap-2 mb-2">
            <i className="ph ph-chat-text text-indigo-600" />
            2. Export &amp; Parse Messages
          </h4>
          <pre className="bg-gray-900 text-gray-100 rounded-lg p-3 text-sm overflow-x-auto">
            <code>python Scripts/get_messages.py</code>
          </pre>
          <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mt-2 space-y-1">
            <li>Opens chats by number (wa.me intent)</li>
            <li>Triggers WhatsApp export flow</li>
            <li>Uses the Android helper app to save exported text files</li>
            <li>Parses transcripts into structured JSON</li>
            <li>
              Writes/updates{' '}
              <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
                messages.json
              </code>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold flex items-center gap-2 mb-2">
            <i className="ph ph-app-window text-indigo-600" />
            3. Desktop Runner
          </h4>
          <pre className="bg-gray-900 text-gray-100 rounded-lg p-3 text-sm overflow-x-auto">
            <code>python app.py</code>
          </pre>
          <p className="text-gray-700 dark:text-gray-300 mt-2">
            Buttons: Run Contacts, Run Messages, Run All, Copy JSON.
          </p>
        </div>
      </article>
    </div>
  );
}
