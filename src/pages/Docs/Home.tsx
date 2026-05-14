type Card = {
  href: string;
  icon: string;
  title: string;
  desc: string;
};

const CARDS: Card[] = [
  {
    href: '#/overview',
    icon: 'ph-fill ph-info',
    title: 'Overview',
    desc: 'What this project does and how the pieces fit together.',
  },
  {
    href: '#/usage',
    icon: 'ph-fill ph-play-circle',
    title: 'Usage',
    desc: 'Run contacts, export messages, and use the desktop runner.',
  },
  {
    href: '#/build',
    icon: 'ph-fill ph-package',
    title: 'Build',
    desc: 'Build the Windows EXE, Android APK, and record demos.',
  },
  {
    href: '#/contribute',
    icon: 'ph-fill ph-git-pull-request',
    title: 'Contributing',
    desc: 'Project structure, local setup, and contribution workflow.',
  },
];

export function HomePage() {
  return (
    <div className="space-y-8">
      <section className="text-center space-y-3 py-6">
        <h2 className="text-3xl font-bold flex items-center justify-center gap-2">
          <i className="ph-fill ph-chats-circle text-indigo-600" />
          WhatsApp Pull Chats
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Export WhatsApp Business chats into structured JSON.
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <i className="ph-fill ph-book-open text-3xl text-indigo-600" />
          <h2 className="text-2xl font-bold">Documentation</h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {CARDS.map((c) => (
            <a
              key={c.href}
              href={c.href}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500 transition"
            >
              <div className="flex items-center gap-3 mb-2">
                <i className={`${c.icon} text-2xl text-indigo-600`} />
                <h3 className="text-lg font-semibold">{c.title}</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {c.desc}
              </p>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
