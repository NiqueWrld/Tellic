import { useState } from 'react';
import { useContacts } from '../../hooks';

export function ContactsPage() {
  const {
    selected,
    contacts,
    running,
    progress,
    log,
    error,
    savedPath,
    pull: start,
  } = useContacts();
  const [filter, setFilter] = useState('');

  const filtered = filter.trim()
    ? contacts.filter((c) => {
        const q = filter.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.numbers.some((n) => n.includes(filter))
        );
      })
    : contacts;

  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white">
            Contacts
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Pull WhatsApp contacts from the current device.
            {selected ? (
              <>
                {' '}
                Target:{' '}
                <code className="text-indigo-600 dark:text-indigo-400">
                  {selected.serial}
                </code>
              </>
            ) : (
              <> No device selected — pick one on the Devices page.</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={start}
            disabled={!selected || running}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
          >
            <i className={`ph ${running ? 'ph-spinner animate-spin' : 'ph-arrows-clockwise'}`} />
            {running ? 'Pulling…' : contacts.length > 0 ? 'Refresh' : 'Pull contacts'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 px-4 py-3 text-sm flex items-start gap-2">
          <i className="ph-fill ph-warning-circle mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {savedPath && contacts.length > 0 && (
        <div className="mb-4 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
          <i className="ph ph-database" />
          <span>
            Loaded from <code className="font-mono">{savedPath}</code>
          </span>
        </div>
      )}

      {(running || log.length > 0) && (
        <div className="mb-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
            <i
              className={`ph ${
                running ? 'ph-spinner animate-spin' : 'ph-check'
              } text-indigo-600 dark:text-indigo-400`}
            />
            <span>{progress?.message ?? 'Starting…'}</span>
          </div>
          {progress?.totalScrolls && progress.scroll && (
            <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    (progress.scroll / progress.totalScrolls) * 100,
                  )}%`,
                }}
              />
            </div>
          )}
          {log.length > 1 && (
            <details className="mt-3">
              <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
                Log ({log.length})
              </summary>
              <ul className="mt-2 max-h-40 overflow-y-auto text-xs font-mono text-gray-600 dark:text-gray-400 space-y-0.5">
                {log.map((l, i) => (
                  <li key={i}>
                    <span className="text-gray-400">[{l.phase}]</span> {l.message}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {contacts.length > 0 && (
        <>
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              {contacts.length} contacts
              <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                ({contacts.filter((c) => c.unsaved).length} unsaved)
              </span>
            </h2>
            <input
              type="search"
              placeholder="Filter…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/60 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-2 text-left font-medium w-12">#</th>
                  <th className="px-4 py-2 text-left font-medium">Name</th>
                  <th className="px-4 py-2 text-left font-medium">Numbers</th>
                  <th className="px-4 py-2 text-left font-medium w-24">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((c, i) => (
                  <tr
                    key={`${c.name}-${i}`}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/40"
                  >
                    <td className="px-4 py-2 text-gray-400 dark:text-gray-500 font-mono text-xs">
                      {i + 1}
                    </td>
                    <td className="px-4 py-2 text-gray-900 dark:text-white font-medium">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 text-xs">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-600 dark:text-gray-300">
                      {c.numbers.join(', ')}
                    </td>
                    <td className="px-4 py-2">
                      {c.unsaved ? (
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                          unsaved
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                          saved
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400 text-center"
                    >
                      No matches.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default ContactsPage;
