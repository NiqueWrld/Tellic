// Shared Layout + hash router for the docs site.
//
// Shell mode (preferred):
//   <body data-shell>
//     <script src="assets/layout.js"></script>
//     <script>initLayout({ basePath: './' });</script>
//   </body>
//   The layout builds the shell once and loads page fragments from
//   docs/<page>.html based on location.hash (e.g. #/overview).
//
// Legacy page mode:
//   <body><div data-page-content>...</div>...initLayout({ basePath, activeNav })</body>
//   Existing standalone pages keep working.

(function () {
    const APP_NAME = 'WhatsApp Pull Chats';

    // Map of route key -> fragment file (relative to basePath)
    const PAGES = {
        home: 'docs/home.html',
        overview: 'docs/overview.html',
        usage: 'docs/usage.html',
        build: 'docs/build.html',
        contribute: 'docs/contribute.html',
        privacy: 'docs/privacy.html',
    };

    function buildShell() {
        const shell = document.createElement('div');
        shell.className = 'h-screen flex bg-gray-100 dark:bg-gray-900 overflow-hidden';
        shell.innerHTML = `
            <div id="sidebar-overlay" class="fixed inset-0 bg-black/50 z-20 md:hidden hidden"></div>
            <aside id="sidebar-mobile" class="fixed z-30 top-0 left-0 h-full transition-transform md:hidden -translate-x-full"></aside>
            <aside id="sidebar-desktop" class="hidden md:block h-screen sticky top-0"></aside>
            <div class="flex flex-col flex-1 h-screen overflow-y-auto md:p-2">
                <div id="header-host"></div>
                <main class="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div id="page-content-host" class="flex-1 p-4 md:p-6 text-gray-800 dark:text-gray-100"></div>
                    <div id="footer-host"></div>
                </main>
            </div>
        `;
        return shell;
    }

    function loadPartial(url) {
        return fetch(url).then(r => {
            if (!r.ok) throw new Error('Failed to load ' + url);
            return r.text();
        });
    }

    function parseFragmentContent(html) {
        // Extract innerHTML of [data-page-content] from a full HTML doc string.
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const node = doc.querySelector('[data-page-content]');
        return node ? node.innerHTML : html;
    }

    window.initLayout = function initLayout(opts) {
        opts = opts || {};
        const basePath = opts.basePath || './';
        const partialsBase = opts.partialsBase || (basePath + 'docs/components/');
        const isShell = document.body.hasAttribute('data-shell');

        // In legacy mode the active nav comes from the page; in shell mode it
        // is derived from location.hash and re-applied on every navigation.
        let activeNav = opts.activeNav || (isShell ? routeFromHash() : null);

        function routeFromHash() {
            const h = (location.hash || '').replace(/^#\/?/, '');
            const key = h.split('/')[0] || 'home';
            return PAGES[key] ? key : 'home';
        }

        function hrefFor(key) {
            return isShell ? '#/' + (key === 'home' ? '' : key)
                           : basePath + PAGES[key];
        }

        // Move existing page content into the shell (legacy mode only).
        const contentSrc = document.querySelector('[data-page-content]');
        const initialHtml = contentSrc ? contentSrc.innerHTML : '';
        if (contentSrc) contentSrc.remove();

        const shell = buildShell();
        document.body.appendChild(shell);
        const contentHost = document.getElementById('page-content-host');
        if (!isShell) contentHost.innerHTML = initialHtml;

        function toggleSidebar(force) {
            const sb = document.getElementById('sidebar-mobile');
            const ov = document.getElementById('sidebar-overlay');
            const hd = document.getElementById('header-host');
            const open =
                typeof force === 'boolean'
                    ? force
                    : sb.classList.contains('-translate-x-full');
            sb.classList.toggle('-translate-x-full', !open);
            sb.classList.toggle('translate-x-0', open);
            ov.classList.toggle('hidden', !open);
            // Hide the header while the mobile sidebar is open.
            if (hd) hd.classList.toggle('hidden', open);
        }

        function toggleTheme() {
            const isDark = document.documentElement.classList.toggle('dark');
            localStorage.theme = isDark ? 'dark' : 'light';
        }

        function applyNavHrefs(host) {
            host.querySelectorAll('[data-nav]').forEach(a => {
                const key = a.dataset.nav;
                if (PAGES[key]) a.href = hrefFor(key);
            });
            host.querySelectorAll('[data-route]').forEach(a => {
                const r = a.dataset.route;
                if (PAGES[r]) a.href = hrefFor(r);
            });
        }

        function applyActiveNav(host) {
            host.querySelectorAll('[data-navlink]').forEach(a => {
                const isActive = a.dataset.nav === activeNav;
                a.classList.toggle('bg-indigo-50', isActive);
                a.classList.toggle('dark:bg-indigo-900/30', isActive);
                a.classList.toggle('text-indigo-600', isActive);
                a.classList.toggle('dark:text-indigo-400', isActive);
                a.classList.toggle('text-gray-700', !isActive);
                a.classList.toggle('dark:text-gray-300', !isActive);
            });
        }

        function wireSidebar(host) {
            applyNavHrefs(host);
            applyActiveNav(host);
            host.querySelectorAll('[data-action="close-sidebar"]').forEach(b =>
                b.addEventListener('click', () => toggleSidebar(false))
            );
            host.querySelectorAll('[data-action="toggle-theme"]').forEach(b =>
                b.addEventListener('click', toggleTheme)
            );
            // Account menu dropdown
            host.querySelectorAll('[data-account-menu]').forEach(menu => {
                const toggle = menu.querySelector('[data-account-toggle]');
                const drop = menu.querySelector('[data-account-dropdown]');
                if (!toggle || !drop) return;
                toggle.addEventListener('click', e => {
                    e.stopPropagation();
                    const open = drop.classList.toggle('hidden') === false;
                    toggle.setAttribute('aria-expanded', String(open));
                });
                document.addEventListener('click', e => {
                    if (!menu.contains(e.target)) {
                        drop.classList.add('hidden');
                        toggle.setAttribute('aria-expanded', 'false');
                    }
                });
                document.addEventListener('keydown', e => {
                    if (e.key === 'Escape') {
                        drop.classList.add('hidden');
                        toggle.setAttribute('aria-expanded', 'false');
                    }
                });
            });
        }

        function wireHeader(host) {
            applyNavHrefs(host);
            host.querySelectorAll('[data-action="open-sidebar"]').forEach(b =>
                b.addEventListener('click', () => toggleSidebar(true))
            );
            host.querySelectorAll('[data-action="toggle-theme"]').forEach(b =>
                b.addEventListener('click', toggleTheme)
            );
        }

        function wireFooter(host) {
            applyNavHrefs(host);
            host.querySelectorAll('[data-footer-year]').forEach(el => {
                el.textContent = new Date().getFullYear();
            });
            host.querySelectorAll('[data-app-name]').forEach(el => {
                el.textContent = APP_NAME;
            });
        }

        document
            .getElementById('sidebar-overlay')
            .addEventListener('click', () => toggleSidebar(false));

        // ---------- Router ----------
        function loadRoute() {
            if (!isShell) return;
            activeNav = routeFromHash();
            const url = basePath + PAGES[activeNav];
            loadPartial(url)
                .then(html => {
                    contentHost.innerHTML = parseFragmentContent(html);
                    // Wire newly injected in-page nav links.
                    applyNavHrefs(contentHost);
                    // Re-apply active state on persistent chrome.
                    document.querySelectorAll('#sidebar-mobile, #sidebar-desktop')
                        .forEach(applyActiveNav);
                    // Close mobile sidebar after navigation.
                    toggleSidebar(false);
                    // Scroll to top of content.
                    contentHost.scrollTop = 0;
                    contentHost.parentElement.scrollTop = 0;
                })
                .catch(err => {
                    contentHost.innerHTML =
                        '<div class="p-6 text-red-600">Failed to load page: ' +
                        String(err.message || err) + '</div>';
                });
        }

        // Promote /docs/<page>.html visits to hash routes when in shell mode.
        if (isShell && !location.hash) {
            location.hash = '#/';
        }

        Promise.all([
            loadPartial(partialsBase + 'Sidebar/sidebar.html'),
            loadPartial(partialsBase + 'Header/header.html'),
            loadPartial(partialsBase + 'Footer/footer.html'),
        ]).then(([sidebarHtml, headerHtml, footerHtml]) => {
            const mobile = document.getElementById('sidebar-mobile');
            const desktop = document.getElementById('sidebar-desktop');
            mobile.innerHTML = sidebarHtml;
            desktop.innerHTML = sidebarHtml;
            wireSidebar(mobile);
            wireSidebar(desktop);

            const headerHost = document.getElementById('header-host');
            headerHost.innerHTML = headerHtml;
            wireHeader(headerHost);

            const footerHost = document.getElementById('footer-host');
            footerHost.innerHTML = footerHtml;
            wireFooter(footerHost);

            if (isShell) {
                window.addEventListener('hashchange', loadRoute);
                loadRoute();
            } else {
                // In legacy mode, just wire any anchors inside initial content.
                applyNavHrefs(contentHost);
            }
        });
    };
})();
