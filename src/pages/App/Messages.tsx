import { useMemo, useState } from 'react';
import { useMessages } from '../../hooks';

export function MessagesPage() {
  const {
    selected,
    db,
    running,
    progress,
    log,
    error,
    savedPath,
    pull: start,
  } = useMessages();

  const [filter, setFilter] = useState('');
  const [activeConv, setActiveConv] = useState<string | null>(null);

  const conversations = useMemo(() => {
    const list = Object.entries(db.conversations).map(([id, c]) => ({ id, ...c }));
    list.sort((a, b) => (b.lastMessageAt || '').localeCompare(a.lastMessageAt || ''));
    return list;
  }, [db]);

  const filteredConversations = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        c.contactName.toLowerCase().includes(q) || c.phoneNumber.includes(q),
    );
  }, [conversations, filter]);

  const activeMessages = useMemo(() => {
    if (!activeConv) return [];
    return Object.entries(db.messages)
      .filter(([, m]) => m.conversationId === activeConv)
      .map(([id, m]) => ({ id, ...m }))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }, [db, activeConv]);

  const totalMessages = Object.keys(db.messages).length;

  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white">
            Messages
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Export WhatsApp chats from every contact in <code>contacts.json</code>.
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
        <button
          type="button"
          onClick={start}
          disabled={!selected || running}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
        >
          <i className={`ph ${running ? 'ph-spinner animate-spin' : 'ph-download-simple'}`} />
          {running ? 'Exporting…' : totalMessages > 0 ? 'Sync new messages' : 'Export all chats'}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 px-4 py-3 text-sm flex items-start gap-2">
          <i className="ph-fill ph-warning-circle mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {savedPath && totalMessages > 0 && (
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
          {progress?.total && progress.index && (
            <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all"
                style={{
                  width: `${Math.min(100, (progress.index / progress.total) * 100)}%`,
                }}
              />
            </div>
          )}
          {log.length > 1 && (
            <details className="mt-3">
              <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
                Log ({log.length})
              </summary>
              <ul className="mt-2 max-h-48 overflow-y-auto text-xs font-mono text-gray-600 dark:text-gray-400 space-y-0.5">
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

      {conversations.length > 0 ? (
        <div className="grid grid-cols-12 gap-4 h-[calc(100vh-22rem)] min-h-[400px]">
          {/* Conversation list */}
          <div className="col-span-12 md:col-span-4 lg:col-span-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <input
                type="search"
                placeholder="Filter…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {conversations.length} chats · {totalMessages} messages
              </div>
            </div>
            <ul className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
              {filteredConversations.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setActiveConv(c.id)}
                    className={[
                      'w-full text-left px-3 py-2.5 flex items-start gap-2 transition-colors',
                      activeConv === c.id
                        ? 'bg-indigo-50 dark:bg-indigo-900/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/40',
                    ].join(' ')}
                  >
                    <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 text-xs">
                      {c.contactName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
                        {c.contactName}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {c.lastMessage || c.phoneNumber}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
              {filteredConversations.length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                  No matches.
                </li>
              )}
            </ul>
          </div>

          {/* Message pane */}
          <div className="col-span-12 md:col-span-8 lg:col-span-9 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col overflow-hidden">
            {activeConv ? (
              (() => {
                const conv = db.conversations[activeConv];
                return (
                  <>
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm">
                        {conv.contactName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white truncate">
                          {conv.contactName}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                          {conv.phoneNumber}
                        </div>
                      </div>
                      <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                        {activeMessages.length} messages
                      </span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50 dark:bg-gray-950/40">
                      {activeMessages.map((m) => (
                        <div
                          key={m.id}
                          className={[
                            'max-w-[75%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words',
                            m.direction === 'outbound'
                              ? 'ml-auto bg-indigo-600 text-white rounded-br-sm'
                              : m.direction === 'inbound' && m.content.startsWith('Messages')
                                ? 'mx-auto bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs italic'
                                : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-bl-sm',
                          ].join(' ')}
                        >
                          {m.content}
                          <div
                            className={[
                              'mt-1 text-[10px] opacity-70',
                              m.direction === 'outbound' ? 'text-indigo-100' : 'text-gray-400',
                            ].join(' ')}
                          >
                            {new Date(m.timestamp).toLocaleString()}
                          </div>
                        </div>
                      ))}
                      {activeMessages.length === 0 && (
                        <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-10">
                          No messages in this chat.
                        </div>
                      )}
                    </div>
                  </>
                );
              })()
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                Select a chat to view messages.
              </div>
            )}
          </div>
        </div>
      ) : (
        !running && (
          <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-10 text-center">
            <i className="ph-duotone ph-chats-circle text-5xl text-gray-400 dark:text-gray-500" />
            <h2 className="mt-3 text-lg font-medium text-gray-800 dark:text-gray-200">
              No chats exported yet
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Pull your contacts first, then run an export. The phone must have
              WhatsApp Business and the <strong>WA Saver</strong> share target installed.
            </p>
          </div>
        )
      )}
    </div>
  );
}

export default MessagesPage;
