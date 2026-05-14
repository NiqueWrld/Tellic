import { useCallback, useEffect, useRef, useState } from 'react';
import { useDevice } from '../context';
import type { Contact, ContactsProgress } from '../types/Contact';

const MAX_LOG = 80;

export function useContacts() {
  const { selected } = useDevice();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<ContactsProgress | null>(null);
  const [log, setLog] = useState<ContactsProgress[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savedPath, setSavedPath] = useState<string | null>(null);

  const unsubRef = useRef<(() => void) | null>(null);

  // Load whatever is currently in contacts.json on mount.
  useEffect(() => {
    if (!window.adb) return;
    let cancelled = false;
    window.adb.loadContacts().then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setContacts(res.contacts);
        if (res.path) setSavedPath(res.path);
      } else if (res.error) {
        setError(res.error);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Subscribe to pull progress events.
  useEffect(() => {
    if (!window.adb) return;
    unsubRef.current = window.adb.onContactsProgress((p) => {
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
      const res = await window.adb.pullContacts(selected.serial);
      if (!res.ok) {
        setError(res.error || 'Pull failed.');
      } else {
        setContacts(res.contacts);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }, [selected]);

  return {
    selected,
    contacts,
    running,
    progress,
    log,
    error,
    savedPath,
    pull,
  };
}

export default useContacts;
