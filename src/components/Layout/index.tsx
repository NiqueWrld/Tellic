import { useCallback, useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Footer } from './Footer';
import { HomePage } from '../../pages';

export type Route =
  | 'home'
  | 'overview'
  | 'usage'
  | 'build'
  | 'contribute'
  | 'privacy';

const ROUTES: Record<Route, string> = {
  home: 'Overview',
  overview: 'Project Overview',
  usage: 'Usage',
  build: 'Build',
  contribute: 'Contribute',
  privacy: 'Privacy',
};

function routeFromHash(): Route {
  const h = (location.hash || '').replace(/^#\/?/, '');
  const key = (h.split('/')[0] || 'home') as Route;
  return ROUTES[key] ? key : 'home';
}

export function Layout() {
  const [route, setRoute] = useState<Route>(routeFromHash);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!location.hash) location.hash = '#/';
    const onHash = () => {
      setRoute(routeFromHash());
      setMobileOpen(false);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const openSidebar = useCallback(() => setMobileOpen(true), []);
  const closeSidebar = useCallback(() => setMobileOpen(false), []);

  const toggleTheme = useCallback(() => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.theme = isDark ? 'dark' : 'light';
  }, []);

  return (
    <div className="h-screen flex bg-gray-100 dark:bg-gray-900 overflow-hidden">
      {/* Mobile overlay */}
      <div
        onClick={closeSidebar}
        className={`fixed inset-0 bg-black/50 z-20 md:hidden ${
          mobileOpen ? '' : 'hidden'
        }`}
      />

      {/* Mobile sidebar */}
      <aside
        className={`fixed z-30 top-0 left-0 h-full transition-transform md:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar
          route={route}
          onCloseMobile={closeSidebar}
          onToggleTheme={toggleTheme}
        />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:block h-screen sticky top-0">
        <Sidebar route={route} onToggleTheme={toggleTheme} />
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 h-screen overflow-y-auto md:p-2">
        {!mobileOpen && <Header onOpenSidebar={openSidebar} />}
        <main className="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex-1 p-4 md:p-6 text-gray-800 dark:text-gray-100">
            <PageRouter route={route} />
          </div>
          <Footer />
        </main>
      </div>
    </div>
  );
}

function PageRouter({ route }: { route: Route }) {
  switch (route) {
    case 'home':
      return <HomePage />;
    default:
      return (
        <div className="text-gray-500 dark:text-gray-400">
          Page <span className="font-mono">{route}</span> coming soon.
        </div>
      );
  }
}
