import type { Route } from './index';
import { useTheme } from '../../context';

const APP_NAME = 'WhatsApp Pull Chats';

type NavItem = { key: Route; label: string; icon: string };

const NAV: NavItem[] = [
  { key: 'home', label: 'Overview', icon: 'ph-house' },
  { key: 'overview', label: 'Project Overview', icon: 'ph-info' },
  { key: 'usage', label: 'Usage', icon: 'ph-play-circle' },
  { key: 'build', label: 'Build', icon: 'ph-package' },
  { key: 'contribute', label: 'Contribute', icon: 'ph-git-pull-request' },
];

function hrefFor(key: Route) {
  return '#/' + (key === 'home' ? '' : key);
}

type Props = {
  route: Route;
  onCloseMobile?: () => void;
};

export function Sidebar({ route, onCloseMobile }: Props) {
  const { isDark, toggleTheme } = useTheme();
  return (
    <aside className="w-64 bg-white dark:bg-gray-900 lg:bg-transparent lg:dark:bg-transparent h-full flex-shrink-0 flex flex-col overflow-hidden">
      {/* Logo + app name */}
      <a
        href={hrefFor('home')}
        className="flex items-center gap-3 mt-4 mb-6 px-4 hover:opacity-80 transition-opacity"
      >
        <img src="/logo.svg" alt="" className="h-8 w-8 flex-shrink-0" />
        <div className="flex flex-col leading-tight">
          <span className="text-lg font-semibold text-gray-900 dark:text-white">
            {APP_NAME}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            docs
          </span>
        </div>
      </a>

      {/* Main nav */}
      <nav className="flex-1 min-h-0 overflow-hidden flex flex-col px-4">
        <div className="flex-1 min-h-0 overflow-y-auto space-y-1">
          {NAV.map((item) => {
            const isActive = item.key === route;
            const cls = [
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              isActive
                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white',
            ].join(' ');
            return (
              <a key={item.key} href={hrefFor(item.key)} className={cls}>
                <i className={`ph-duotone ${item.icon} text-lg`} />
                {item.label}
              </a>
            );
          })}

          <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700 space-y-1">
            <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Resources
            </div>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <i className="ph-duotone ph-book-open text-lg" />
              <span className="flex-1 text-left">Documentation</span>
              <span className="text-xs text-gray-400">↗</span>
            </a>
            <a
              href="https://discord.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <i className="ph-duotone ph-discord-logo text-lg" />
              <span className="flex-1 text-left">Discord Chat</span>
              <span className="text-xs text-gray-400">↗</span>
            </a>
            <a
              href="#support"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <i className="ph-duotone ph-lifebuoy text-lg" />
              <span className="flex-1 text-left">Contact Support</span>
            </a>
            <button
              type="button"
              onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <i
                className={`ph-duotone ${
                  isDark ? 'ph-sun' : 'ph-moon'
                } text-lg`}
              />
              <span className="flex-1 text-left">
                {isDark ? 'Light mode' : 'Dark mode'}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile close button */}
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden mt-3 self-end p-1 text-gray-500 dark:text-gray-400"
            aria-label="Close menu"
          >
            <i className="ph ph-x text-xl" />
          </button>
        )}
      </nav>

      {/* Footer: developer credit */}
      <div className="mt-auto border-t border-gray-200 dark:border-gray-700 pt-4 pb-4 px-4">
        <a
          href="https://niquewrld.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-1 py-1 rounded-md text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <img
            src="https://www.niquewrld.com/logo.jpg"
            alt="Niquewrld"
            className="h-5 w-5 rounded-full flex-shrink-0"
          />
          <span className="truncate">
            Developed by{' '}
            <span className="font-medium text-gray-700 dark:text-gray-200">
              Niquewrld
            </span>
          </span>
          <span className="ml-auto text-gray-400">↗</span>
        </a>
      </div>
    </aside>
  );
}
