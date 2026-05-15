// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';
import type { AdbFetchResult, AdbListResult, AdbPathCheckResult } from './main';
import type {
  Contact,
  ContactsProgress,
  ContactsResult,
} from './types/Contact';
import type {
  MessagesProgress,
  MessagesResult,
  SchemaDb,
} from './types/Message';

const adb = {
  listDevices: (): Promise<AdbListResult> =>
    ipcRenderer.invoke('adb:list-devices'),
  checkAdbInPath: (): Promise<AdbPathCheckResult> =>
    ipcRenderer.invoke('adb:check-path'),
  fetchAdb: (): Promise<AdbFetchResult> =>
    ipcRenderer.invoke('adb:fetch'),
  pullContacts: (serial: string): Promise<ContactsResult> =>
    ipcRenderer.invoke('adb:pull-contacts', serial),
  onContactsProgress: (cb: (p: ContactsProgress) => void) => {
    const listener = (_e: unknown, p: ContactsProgress) => cb(p);
    ipcRenderer.on('adb:pull-contacts:progress', listener);
    return () => ipcRenderer.removeListener('adb:pull-contacts:progress', listener);
  },
  saveContacts: (
    contacts: Contact[],
  ): Promise<{ ok: boolean; path?: string; error?: string }> =>
    ipcRenderer.invoke('contacts:save', contacts),
  loadContacts: (): Promise<{
    ok: boolean;
    contacts: Contact[];
    path?: string;
    error?: string;
  }> => ipcRenderer.invoke('contacts:load'),
  pullMessages: (serial: string): Promise<MessagesResult> =>
    ipcRenderer.invoke('adb:pull-messages', serial),
  rebuildMessages: (): Promise<MessagesResult> =>
    ipcRenderer.invoke('messages:rebuild'),
  onMessagesProgress: (cb: (p: MessagesProgress) => void) => {
    const listener = (_e: unknown, p: MessagesProgress) => cb(p);
    ipcRenderer.on('adb:pull-messages:progress', listener);
    return () => ipcRenderer.removeListener('adb:pull-messages:progress', listener);
  },
  loadMessages: (): Promise<{
    ok: boolean;
    db: SchemaDb;
    path?: string;
    error?: string;
  }> => ipcRenderer.invoke('messages:load'),
};

contextBridge.exposeInMainWorld('adb', adb);

export type AdbApi = typeof adb;
