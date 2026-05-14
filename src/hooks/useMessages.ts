import { useCallback, useEffect, useRef, useState } from 'react';
import { useDevice } from '../context';
import type { MessagesProgress } from '../types/Message';
import type { SchemaDb } from '../types/Message';

const MAX_LOG = 200;

const EMPTY_DB: SchemaDb = {
  bookings: {},
  businesses: {},
  clients: {},
  conversations: {},
  errorLogs: {},
  feedback: {},
  messages: {},
  receptionists: {},
  subscriptions: {},
};

export function useMessages() {
  const { selected } = useDevice();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<MessagesProgress | null>(null);
  const [log, setLog] = useState<MessagesProgress[]>([]);
  const [db, setDb] = useState<SchemaDb>(EMPTY_DB);
  const [error, setError] = useState<string | null>(null);
  const [savedPath, setSavedPath] = useState<string | null>(null);

  const unsubRef = useRef<(() => void) | null>(null);

  // Load existing messages.json on mount.
  useEffect(() => {
    if (!window.adb) return;
    let cancelled = false;
    window.adb.loadMessages().then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setDb(res.db);
        if (res.path) setSavedPath(res.path);
      } else if (res.error) {
        setError(res.error);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Subscribe to progress.
  useEffect(() => {
    if (!window.adb) return;
    unsubRef.current = window.adb.onMessagesProgress((p) => {
      setProgress(p);
      setLog((prev) => [...prev.slice(-MAX_LOG + 1), p]);
    });
    return () => {
      unsubRef.current?.();
    };
  }, []);

  const pull = useCallback(async () => {
    if (!selected || !window.adb) return;
    setRunning(true);
    setError(null);
    setLog([]);
    setProgress(null);
    try {
      const res = await window.adb.pullMessages(selected.serial);
      if (!res.ok) {
        setError(res.error || 'Pull failed.');
      } else {
        // Reload the persisted DB to reflect newly-written messages.
        const fresh = await window.adb.loadMessages();
        if (fresh.ok) setDb(fresh.db);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }, [selected]);

  const rebuild = useCallback(async () => {
    if (!window.adb) return;
    setRunning(true);
    setError(null);
    setLog([]);
    setProgress(null);
    try {
      const res = await window.adb.rebuildMessages();
      if (!res.ok) {
        setError(res.error || 'Rebuild failed.');
      } else {
        const fresh = await window.adb.loadMessages();
        if (fresh.ok) setDb(fresh.db);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }, []);

  return {
    selected,
    db,
    running,
    progress,
    log,
    error,
    savedPath,
    pull,
    rebuild,
  };
}

export default useMessages;
