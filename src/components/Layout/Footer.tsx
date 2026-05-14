import { useTheme } from '../../context';

const APP_NAME = 'WhatsApp Pull Chats';

export function Footer() {
  const { isDark, toggleTheme } = useTheme();
  return (
    <footer className="bg-transparent px-6 py-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-sm text-gray-500 dark:text-gray-400">
      <span>
        &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
      </span>
      <span className="hidden sm:inline text-gray-300 dark:text-gray-600">
        ·
      </span>
      <a
        href="#/privacy"
        className="hover:text-gray-700 dark:hover:text-gray-200"
      >
        Privacy
      </a>
      <span className="hidden sm:inline text-gray-300 dark:text-gray-600">
        ·
      </span>
      <button
        type="button"
        onClick={toggleTheme}
        className="inline-flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200"
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        <i
          className={`ph-duotone ${isDark ? 'ph-sun' : 'ph-moon'}`}
        />
        <span>{isDark ? 'Light' : 'Dark'} mode</span>
      </button>
    </footer>
  );
}
