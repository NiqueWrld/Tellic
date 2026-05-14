import { app, BrowserWindow, ipcMain, type IpcMainInvokeEvent } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { execFile } from 'node:child_process';
import started from 'electron-squirrel-startup';
import dotenv from 'dotenv';
import type { Contact, ContactsProgress, ContactsResult } from './types/Contact';
import type {
  Message,
  MessagesProgress,
  MessagesResult,
  SchemaDb,
} from './types/Message';
import crypto from 'node:crypto';

// Load .env from the project root in dev, or from the resources dir in packaged builds.
dotenv.config({
  path: app.isPackaged
    ? path.join(process.resourcesPath, '.env')
    : path.join(__dirname, '..', '..', '.env'),
});

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    icon: path.join(__dirname, '..', '..', 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open the DevTools only outside of production builds.
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
};

// ---------------------------------------------------------------------------
// ADB integration
// ---------------------------------------------------------------------------

export type AdbDevice = {
  serial: string;
  state: string;
  product?: string;
  model?: string;
  device?: string;
  transportId?: string;
  usb?: string;
};

export type AdbListResult = {
  ok: boolean;
  devices: AdbDevice[];
  error?: string;
  raw?: string;
};

function parseAdbDevices(stdout: string): AdbDevice[] {
  const lines = stdout.split(/\r?\n/);
  const devices: AdbDevice[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('List of devices')) continue;
    if (trimmed.startsWith('*')) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length < 2) continue;
    const [serial, state, ...rest] = parts;
    const dev: AdbDevice = { serial, state };
    for (const kv of rest) {
      const idx = kv.indexOf(':');
      if (idx <= 0) continue;
      const key = kv.slice(0, idx);
      const value = kv.slice(idx + 1);
      switch (key) {
        case 'product': dev.product = value; break;
        case 'model': dev.model = value; break;
        case 'device': dev.device = value; break;
        case 'transport_id': dev.transportId = value; break;
        case 'usb': dev.usb = value; break;
      }
    }
    devices.push(dev);
  }
  return devices;
}

function runAdbDevices(): Promise<AdbListResult> {
  return new Promise((resolve) => {
    execFile(
      'adb',
      ['devices', '-l'],
      { windowsHide: true, timeout: 15000 },
      (err, stdout, stderr) => {
        if (err) {
          const code = (err as NodeJS.ErrnoException).code;
          const msg = code === 'ENOENT'
            ? 'adb not found on PATH. Install Android Platform Tools and try again.'
            : (stderr || err.message || String(err)).trim();
          resolve({ ok: false, devices: [], error: msg, raw: stdout });
          return;
        }
        resolve({ ok: true, devices: parseAdbDevices(stdout), raw: stdout });
      },
    );
  });
}

ipcMain.handle('adb:list-devices', async () => runAdbDevices());

// ---------------------------------------------------------------------------
// Contacts pull — ports Scripts/get_contacts.py to TypeScript / Electron
// ---------------------------------------------------------------------------

const PHONE_MIMETYPE = 'vnd.android.cursor.item/phone_v2';
const WHATSAPP_MIMETYPE_PREFIX = 'vnd.android.cursor.item/vnd.com.whatsapp';
const WA_PACKAGES = ['com.whatsapp.w4b', 'com.whatsapp'];
const HOME_ACTIVITY = 'com.whatsapp.home.ui.HomeActivity';
const DUMP_PATH = '/sdcard/ui_dump.xml';
const PHONE_RE = /^\+?\d{7,15}$/;

function adbExec(serial: string, args: string[], timeoutMs = 20000): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      'adb',
      ['-s', serial, ...args],
      { windowsHide: true, timeout: timeoutMs, maxBuffer: 32 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          const code = (err as NodeJS.ErrnoException).code;
          if (code === 'ENOENT') {
            reject(new Error('adb not found on PATH.'));
            return;
          }
          reject(new Error((stderr || err.message || String(err)).trim()));
          return;
        }
        resolve(stdout);
      },
    );
  });
}

function adbShell(serial: string, cmd: string, timeoutMs?: number) {
  return adbExec(serial, ['shell', cmd], timeoutMs);
}

function normalizeNumber(n: string): string {
  return n.replace(/[\s\-()\u00a0\u202f]/g, '');
}

function parseRow(line: string): Record<string, string | null> {
  const body = line.replace(/^Row:\s*\d+\s*/, '');
  const row: Record<string, string | null> = {};
  const re = /(\w+)=(.*?)(?=,\s*\w+=|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const v = m[2].trim();
    row[m[1]] = v === 'NULL' ? null : v;
  }
  return row;
}

async function queryData(serial: string, projection: string): Promise<string[]> {
  const out = await adbExec(serial, [
    'shell', 'content', 'query',
    '--uri', 'content://com.android.contacts/data',
    '--projection', projection,
  ], 30000);
  return out.split(/\r?\n/);
}

async function getWhatsAppRawContactIds(serial: string): Promise<Set<string>> {
  const ids = new Set<string>();
  for (const line of await queryData(serial, 'raw_contact_id:mimetype')) {
    if (!line.startsWith('Row:')) continue;
    const row = parseRow(line);
    const mt = row.mimetype || '';
    if (mt.startsWith(WHATSAPP_MIMETYPE_PREFIX)) {
      const rid = row.raw_contact_id;
      if (rid) ids.add(rid);
    }
  }
  return ids;
}

async function getSavedWhatsAppContacts(serial: string): Promise<Contact[]> {
  const ids = await getWhatsAppRawContactIds(serial);
  if (ids.size === 0) return [];

  const contacts = new Map<string, Contact>();
  for (const line of await queryData(serial, 'display_name:data1:mimetype:raw_contact_id')) {
    if (!line.startsWith('Row:')) continue;
    const row = parseRow(line);
    if (row.mimetype !== PHONE_MIMETYPE) continue;
    if (!row.raw_contact_id || !ids.has(row.raw_contact_id)) continue;
    const name = (row.display_name || 'Unknown').trim();
    const data1 = row.data1;
    if (!data1) continue;
    const number = normalizeNumber(data1);
    let c = contacts.get(name);
    if (!c) {
      c = { name, numbers: [] };
      contacts.set(name, c);
    }
    if (!c.numbers.includes(number)) c.numbers.push(number);
  }
  return [...contacts.values()];
}

async function detectWhatsAppPackage(serial: string): Promise<string | null> {
  for (const pkg of WA_PACKAGES) {
    const out = await adbShell(serial, `pm path ${pkg}`).catch(() => '');
    if (out.includes('package:')) return pkg;
  }
  return null;
}

async function getScreenSize(serial: string): Promise<[number, number]> {
  const out = await adbShell(serial, 'wm size').catch(() => '');
  const m = /(\d+)x(\d+)/.exec(out);
  if (m) return [parseInt(m[1], 10), parseInt(m[2], 10)];
  return [1080, 1920];
}

async function uiDump(serial: string): Promise<string> {
  await adbShell(serial, `uiautomator dump ${DUMP_PATH} >/dev/null 2>&1`).catch(() => '');
  return adbShell(serial, `cat ${DUMP_PATH}`).catch(() => '');
}

function extractNumbersFromXml(xml: string): Set<string> {
  const found = new Set<string>();
  const re = /(?:text|content-desc)="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const raw = m[1].trim();
    if (!raw) continue;
    const candidate = normalizeNumber(raw);
    if (PHONE_RE.test(candidate)) found.add(candidate);
  }
  return found;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function scrapeUnsavedNumbers(
  serial: string,
  pkg: string,
  emit: (p: ContactsProgress) => void,
  maxScrolls = 60,
  stallLimit = 3,
): Promise<Set<string>> {
  emit({ phase: 'ui-start', message: `Launching ${pkg}/${HOME_ACTIVITY}…` });
  await adbShell(serial, `am start -n ${pkg}/${HOME_ACTIVITY}`).catch(() => '');
  await sleep(2000);

  const [width, height] = await getScreenSize(serial);
  const x = Math.floor(width / 2);
  const y1 = Math.floor(height * 0.8);
  const y2 = Math.floor(height * 0.25);

  const collected = new Set<string>();
  let stalls = 0;
  for (let i = 0; i < maxScrolls; i++) {
    const xml = await uiDump(serial);
    if (!xml.trimStart().startsWith('<')) {
      emit({ phase: 'ui-scroll', message: 'uiautomator dump failed; stopping UI pass.' });
      break;
    }
    const fresh = extractNumbersFromXml(xml);
    const before = collected.size;
    for (const n of fresh) collected.add(n);
    const gained = collected.size - before;
    emit({
      phase: 'ui-scroll',
      message: `scroll ${i + 1}: +${gained} new (total ${collected.size})`,
      scroll: i + 1,
      totalScrolls: maxScrolls,
      unsaved: collected.size,
    });
    if (gained === 0) {
      stalls++;
      if (stalls >= stallLimit) break;
    } else {
      stalls = 0;
    }
    await adbShell(serial, `input swipe ${x} ${y1} ${x} ${y2} 300`).catch(() => '');
    await sleep(600);
  }
  return collected;
}

function mergeUnsaved(contacts: Contact[], unsaved: Set<string>): number {
  const known = new Set<string>();
  for (const c of contacts) for (const n of c.numbers) known.add(normalizeNumber(n));
  let added = 0;
  for (const num of [...unsaved].sort()) {
    if (known.has(num)) continue;
    contacts.push({ name: num, numbers: [num], unsaved: true });
    known.add(num);
    added++;
  }
  return added;
}

async function pullContacts(
  serial: string,
  event: IpcMainInvokeEvent,
): Promise<ContactsResult> {
  const emit = (p: ContactsProgress) => {
    if (!event.sender.isDestroyed()) {
      event.sender.send('adb:pull-contacts:progress', p);
    }
  };
  try {
    emit({ phase: 'start', message: 'Querying saved WhatsApp contacts…' });
    const saved = await getSavedWhatsAppContacts(serial);
    emit({
      phase: 'saved',
      message: `Found ${saved.length} saved WhatsApp contacts.`,
      saved: saved.length,
    });

    const pkg = await detectWhatsAppPackage(serial);
    let unsaved = new Set<string>();
    if (pkg) {
      unsaved = await scrapeUnsavedNumbers(serial, pkg, emit);
    } else {
      emit({ phase: 'ui-start', message: 'WhatsApp not installed — skipping UI scrape.' });
    }

    const added = mergeUnsaved(saved, unsaved);
    saved.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

    // Persist to disk so the UI always has the latest snapshot.
    try {
      const filePath = path.join(app.getPath('userData'), 'contacts.json');
      await fs.writeFile(filePath, JSON.stringify(saved, null, 2), 'utf-8');
    } catch {
      /* non-fatal */
    }

    emit({
      phase: 'done',
      message: `Done. ${saved.length} contacts (${added} unsaved added).`,
      saved: saved.length,
      unsaved: added,
    });
    return { ok: true, contacts: saved, added };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    emit({ phase: 'error', message });
    return { ok: false, contacts: [], added: 0, error: message };
  }
}

ipcMain.handle('adb:pull-contacts', (event, serial: string) =>
  pullContacts(serial, event),
);

ipcMain.handle(
  'contacts:save',
  async (_event, contacts: Contact[]): Promise<{ ok: boolean; path?: string; error?: string }> => {
    try {
      const filePath = path.join(app.getPath('userData'), 'contacts.json');
      await fs.writeFile(filePath, JSON.stringify(contacts, null, 2), 'utf-8');
      return { ok: true, path: filePath };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },
);

ipcMain.handle(
  'contacts:load',
  async (): Promise<{ ok: boolean; contacts: Contact[]; path?: string; error?: string }> => {
    const filePath = path.join(app.getPath('userData'), 'contacts.json');
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) {
        return { ok: false, contacts: [], path: filePath, error: 'Invalid contacts.json shape.' };
      }
      return { ok: true, contacts: parsed as Contact[], path: filePath };
    } catch (e) {
      const err = e as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        return { ok: true, contacts: [], path: filePath };
      }
      return { ok: false, contacts: [], path: filePath, error: err.message || String(e) };
    }
  },
);

// ---------------------------------------------------------------------------
// Messages pull — ports Scripts/get_messages.py to TypeScript / Electron
// ---------------------------------------------------------------------------

const BUSINESS_ID =
  process.env.BUSINESS_ID || '1026a370-4102-459f-956b-f09809735835';
const RECEPTIONIST_ID =
  process.env.RECEPTIONIST_ID || 'jSI05Mk0PHA7VzjUqgLE';

const MSG_RE =
  /^\[(\d{1,2}\/\d{1,2}\/\d{4}),\s*(\d{1,2}:\d{2}:\d{2})\]\s*([^:]+):\s*(.*)$/;
const MSG_RE_ALT =
  /^(\d{1,4}\/\d{1,2}\/\d{1,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?\s*[apAP]\.?m\.?)\s*-\s*([^:]+?):\s*(.*)$/;
const SYS_RE_ALT =
  /^(\d{1,4}\/\d{1,2}\/\d{1,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?\s*[apAP]\.?m\.?)\s*-\s*(.*)$/;

const TXT_REMOTE_DIRS = ['/sdcard/Download', '/sdcard/Documents'];

type UiNode = {
  text: string;
  desc: string;
  bounds: [number, number, number, number] | null;
};

function parseBounds(s: string): [number, number, number, number] | null {
  const m = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/.exec(s);
  if (!m) return null;
  return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10), parseInt(m[4], 10)];
}

function findNode(
  xml: string,
  pred: (n: { text: string; desc: string }) => boolean,
): UiNode | null {
  const re = /<node\b([^>]*)\/?>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const attrs = m[1];
    const text = (/\btext="([^"]*)"/.exec(attrs)?.[1] || '').trim();
    const desc = (/\bcontent-desc="([^"]*)"/.exec(attrs)?.[1] || '').trim();
    if (!text && !desc) continue;
    if (pred({ text, desc })) {
      const boundsStr = /\bbounds="([^"]*)"/.exec(attrs)?.[1] || '';
      return { text, desc, bounds: parseBounds(boundsStr) };
    }
  }
  return null;
}

async function tapBounds(serial: string, b: [number, number, number, number]) {
  const cx = Math.floor((b[0] + b[2]) / 2);
  const cy = Math.floor((b[1] + b[3]) / 2);
  await adbShell(serial, `input tap ${cx} ${cy}`).catch(() => '');
}

async function clickByText(
  serial: string,
  needles: string[],
  emit?: (s: string) => void,
): Promise<boolean> {
  const xml = await uiDump(serial);
  const node = findNode(xml, ({ text, desc }) =>
    needles.some((n) => text === n || desc === n),
  );
  if (!node || !node.bounds) {
    emit?.(`not found: ${needles.join(' | ')}`);
    return false;
  }
  await tapBounds(serial, node.bounds);
  return true;
}

async function currentFocus(serial: string): Promise<string> {
  const out = await adbShell(serial, 'dumpsys window').catch(() => '');
  for (const line of out.split(/\r?\n/)) {
    if (line.includes('mCurrentFocus')) return line.trim();
  }
  return '';
}

async function listDeviceTxtFiles(serial: string): Promise<Set<string>> {
  const cmd =
    `find ${TXT_REMOTE_DIRS.join(' ')} ` +
    `\\( -name 'WhatsApp*.txt' -o -name 'wa_export_*.txt' \\) 2>/dev/null`;
  const out = await adbShell(serial, cmd).catch(() => '');
  return new Set(
    out
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

async function openChatByNumber(serial: string, pkg: string, number: string): Promise<boolean> {
  const num = number.replace(/\D/g, '');
  await adbShell(
    serial,
    `am start -a android.intent.action.VIEW -d https://wa.me/${num} ${pkg}`,
  ).catch(() => '');
  await sleep(2500);
  const focus = await currentFocus(serial);
  return focus.includes('Conversation') || focus.includes('ConversationCompose');
}

async function tapWaSaverInShareSheet(
  serial: string,
  emit: (m: string) => void,
): Promise<boolean> {
  const [w, h] = await getScreenSize(serial);
  const rowY = Math.floor(h * 0.9);

  for (let i = 0; i < 30; i++) {
    const xml = await uiDump(serial);
    const saver = findNode(xml, ({ text, desc }) =>
      ['WA Saver', 'WaSaver'].some((n) => text === n || desc === n),
    );
    if (saver?.bounds) {
      await tapBounds(serial, saver.bounds);
      return true;
    }
    const more = findNode(xml, ({ text }) =>
      ['More', 'See all', 'More apps', 'More options'].includes(text),
    );
    if (more?.bounds) {
      await tapBounds(serial, more.bounds);
      await sleep(1000);
      const xml2 = await uiDump(serial);
      const saver2 = findNode(xml2, ({ text, desc }) =>
        ['WA Saver', 'WaSaver'].some((n) => text === n || desc === n),
      );
      if (saver2?.bounds) {
        await tapBounds(serial, saver2.bounds);
        return true;
      }
      await adbShell(serial, 'input keyevent KEYCODE_BACK').catch(() => '');
    }
    await adbShell(
      serial,
      `input swipe ${Math.floor(w * 0.85)} ${rowY} ${Math.floor(w * 0.15)} ${rowY} 200`,
    ).catch(() => '');
    await sleep(300);
  }
  emit('WA Saver not found in share sheet');
  return false;
}

async function exportChat(
  serial: string,
  pkg: string,
  emit: (m: string) => void,
): Promise<string | null> {
  const before = await listDeviceTxtFiles(serial);

  if (!(await clickByText(serial, ['More options'], emit))) return null;
  await sleep(400);
  if (!(await clickByText(serial, ['More', 'more'], emit))) {
    await adbShell(serial, 'input keyevent KEYCODE_BACK').catch(() => '');
    return null;
  }
  await sleep(400);
  if (!(await clickByText(serial, ['Export chat'], emit))) {
    await adbShell(serial, 'input keyevent KEYCODE_BACK').catch(() => '');
    await adbShell(serial, 'input keyevent KEYCODE_BACK').catch(() => '');
    return null;
  }
  await sleep(800);
  await clickByText(serial, ['Without media']);
  await sleep(2500);

  if (!(await tapWaSaverInShareSheet(serial, emit))) {
    await adbShell(serial, 'input keyevent KEYCODE_BACK').catch(() => '');
    await adbShell(serial, 'input keyevent KEYCODE_BACK').catch(() => '');
    return null;
  }
  await sleep(2000);

  const after = await listDeviceTxtFiles(serial);
  const created = [...after].filter((p) => !before.has(p));
  if (created.length === 0) return null;

  const exportDir = path.join(app.getPath('userData'), 'Exported Chats');
  await fs.mkdir(exportDir, { recursive: true });
  const remote = created[0];
  const local = path.join(exportDir, path.basename(remote));
  await adbExec(serial, ['pull', remote, local], 60000).catch(() => '');
  // Best-effort cleanup so the next run's diff stays tidy.
  await adbShell(serial, `rm -f '${remote}'`).catch(() => '');
  return local;
}

function parseExportFile(content: string): Message[] {
  const out: Message[] = [];
  let cur: Message | null = null;
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    let m = MSG_RE.exec(line);
    if (m) {
      if (cur) out.push(cur);
      cur = { date: m[1], time: m[2], sender: m[3].trim(), text: m[4] };
      continue;
    }
    m = MSG_RE_ALT.exec(line);
    if (m) {
      if (cur) out.push(cur);
      cur = { date: m[1], time: m[2], sender: m[3].trim(), text: m[4] };
      continue;
    }
    m = SYS_RE_ALT.exec(line);
    if (m) {
      if (cur) out.push(cur);
      cur = { date: m[1], time: m[2], sender: 'system', text: m[3] };
      continue;
    }
    if (cur) cur.text += '\n' + line;
  }
  if (cur) out.push(cur);
  return out;
}

function pad2(n: number) {
  return n.toString().padStart(2, '0');
}

function makeIso(date: string, time: string): string {
  const fallback = new Date().toISOString().replace(/\.\d{3}Z$/, '.000Z');
  const cleanTime = (time || '')
    .replace(/[\u202f\u00a0]/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/a\.?m\.?/, 'am')
    .replace(/p\.?m\.?/, 'pm');

  const parts = (date || '').split('/').map((s) => parseInt(s, 10));
  if (parts.length !== 3 || parts.some(isNaN)) return fallback;
  let y: number, mo: number, d: number;
  if (parts[0] > 31) {
    [y, mo, d] = parts;
  } else {
    [d, mo, y] = parts;
  }

  const ampm = /(am|pm)\s*$/.exec(cleanTime)?.[1];
  const hms = cleanTime.replace(/\s*(am|pm)\s*$/, '').split(':').map((s) => parseInt(s, 10));
  if (hms.some(isNaN) || hms.length < 2) return fallback;
  let [h, mi, s = 0] = hms;
  if (ampm === 'pm' && h < 12) h += 12;
  if (ampm === 'am' && h === 12) h = 0;
  return `${y}-${pad2(mo)}-${pad2(d)}T${pad2(h)}:${pad2(mi)}:${pad2(s)}.000Z`;
}

function emptySchemaDb(): SchemaDb {
  return {
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
}

function ensureSchemaDb(raw: unknown): SchemaDb {
  const base = emptySchemaDb();
  if (!raw || typeof raw !== 'object') return base;
  const obj = raw as Record<string, unknown>;
  for (const k of Object.keys(base) as (keyof SchemaDb)[]) {
    if (obj[k] && typeof obj[k] === 'object') {
      (base as Record<string, unknown>)[k] = obj[k] as Record<string, unknown>;
    }
  }
  return base;
}

function upsertContactMessages(
  db: SchemaDb,
  contactName: string,
  numbers: string[],
  msgs: Message[],
): { added: number; parsed: number } {
  const phone = (numbers[0] || '').replace(/\D/g, '');
  if (!phone) return { added: 0, parsed: msgs.length };
  const clientId = `cl_${phone}`;
  const convId = `${RECEPTIONIST_ID}_${phone}`;
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '.000Z');

  const existingClient = db.clients[clientId];
  db.clients[clientId] = {
    phoneNumber: phone,
    fullName: contactName,
    createdAt: existingClient?.createdAt || now,
    updatedAt: now,
  };

  const existingConv = db.conversations[convId];
  const conv = {
    businessId: BUSINESS_ID,
    receptionistId: RECEPTIONIST_ID,
    phoneNumber: phone,
    contactName,
    clientId,
    createdAt: existingConv?.createdAt || now,
    updatedAt: now,
    lastMessageAt: existingConv?.lastMessageAt,
    lastMessage: existingConv?.lastMessage,
  };

  // WhatsApp's export labels the contact with the name as saved in this device's
  // address book. That label may not equal `contactName` exactly (e.g. saved as
  // "NW IT" but the chat shows "NW IT Solutions PTY LTD"). A strict ===
  // comparison would flag every message as outbound. Instead pick the sender
  // label that best matches `contactName`; everything else is the device owner.
  const contactSender = pickContactSender(msgs, contactName);

  let added = 0;
  let lastTs: string | undefined;
  let lastText = '';
  for (const m of msgs) {
    const ts = makeIso(m.date, m.time);
    const direction: 'inbound' | 'outbound' =
      m.sender === 'system' || (contactSender !== null && m.sender === contactSender)
        ? 'inbound'
        : 'outbound';
    // Stable, content-addressed hash — re-exports produce the same id, so
    // existing messages overwrite themselves and only new ones grow the DB.
    const key = `${convId}|${m.date}|${m.time}|${m.sender}|${m.text}`;
    const hash = crypto.createHash('sha1').update(key).digest('hex').slice(0, 20);
    if (!(hash in db.messages)) added++;
    db.messages[hash] = {
      conversationId: convId,
      businessId: BUSINESS_ID,
      receptionistId: RECEPTIONIST_ID,
      clientId,
      direction,
      content: m.text,
      timestamp: ts,
    };
    lastTs = ts;
    lastText = m.text;
  }

  if (lastTs) {
    conv.lastMessageAt = lastTs;
    conv.lastMessage = lastText;
  }
  db.conversations[convId] = conv;
  return { added, parsed: msgs.length };
}

// Picks the sender label that most likely represents the contact (vs. the
// device owner). Returns null when there are no human senders.
function pickContactSender(msgs: Message[], contactName: string): string | null {
  const senders = new Set<string>();
  for (const m of msgs) {
    if (m.sender && m.sender !== 'system') senders.add(m.sender);
  }
  if (senders.size === 0) return null;
  if (senders.size === 1) return [...senders][0];

  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cn = norm(contactName);
  if (!cn) return [...senders][0];

  let best: string | null = null;
  let bestScore = -1;
  for (const s of senders) {
    const ns = norm(s);
    let score: number;
    if (ns === cn) score = 1000;
    else if (ns.includes(cn) || cn.includes(ns)) score = 500 + Math.min(ns.length, cn.length);
    else {
      // Longest common substring length as a fallback similarity score.
      let lcs = 0;
      for (let i = 0; i < ns.length; i++) {
        for (let j = 0; j < cn.length; j++) {
          let k = 0;
          while (i + k < ns.length && j + k < cn.length && ns[i + k] === cn[j + k]) k++;
          if (k > lcs) lcs = k;
        }
      }
      score = lcs;
    }
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  }
  return best;
}

async function loadSchemaDb(): Promise<SchemaDb> {
  const filePath = path.join(app.getPath('userData'), 'messages.json');
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return ensureSchemaDb(JSON.parse(data));
  } catch {
    return emptySchemaDb();
  }
}

async function saveSchemaDb(db: SchemaDb): Promise<string> {
  const filePath = path.join(app.getPath('userData'), 'messages.json');
  await fs.writeFile(filePath, JSON.stringify(db, null, 2), 'utf-8');
  return filePath;
}

async function loadContactsFromDisk(): Promise<Contact[]> {
  const filePath = path.join(app.getPath('userData'), 'contacts.json');
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? (parsed as Contact[]) : [];
  } catch {
    return [];
  }
}

async function saveContactsToDisk(contacts: Contact[]): Promise<void> {
  const filePath = path.join(app.getPath('userData'), 'contacts.json');
  await fs.writeFile(filePath, JSON.stringify(contacts, null, 2), 'utf-8');
}

async function pullMessages(
  serial: string,
  event: IpcMainInvokeEvent,
): Promise<MessagesResult> {
  const emit = (p: MessagesProgress) => {
    if (!event.sender.isDestroyed()) {
      event.sender.send('adb:pull-messages:progress', p);
    }
  };
  try {
    const contacts = await loadContactsFromDisk();
    if (contacts.length === 0) {
      const msg = 'No contacts found. Pull contacts first.';
      emit({ phase: 'error', message: msg });
      return { ok: false, exported: 0, skipped: 0, added: 0, contacts: [], error: msg };
    }

    const pkg = await detectWhatsAppPackage(serial);
    if (!pkg) {
      const msg = 'WhatsApp not installed on device.';
      emit({ phase: 'error', message: msg });
      return { ok: false, exported: 0, skipped: 0, added: 0, contacts, error: msg };
    }

    const db = await loadSchemaDb();
    const total = contacts.length;
    let exported = 0;
    let skipped = 0;
    let addedTotal = 0;

    emit({
      phase: 'start',
      message: `Incremental export of ${total} contacts via ${pkg}…`,
      total,
    });

    for (let i = 0; i < total; i++) {
      const c = contacts[i];
      const name = c.name;
      const numbers = c.numbers || [];

      if (numbers.length === 0) {
        skipped++;
        emit({
          phase: 'contact-skip',
          message: `[${i + 1}/${total}] ${name} — no number`,
          index: i + 1,
          total,
          name,
        });
        continue;
      }

      emit({
        phase: 'contact-open',
        message: `[${i + 1}/${total}] ${name} (${numbers[0]})`,
        index: i + 1,
        total,
        name,
      });

      const opened = await openChatByNumber(serial, pkg, numbers[0]);
      if (!opened) {
        emit({
          phase: 'contact-skip',
          message: `  could not open chat`,
          index: i + 1,
          total,
          name,
        });
        continue;
      }

      emit({
        phase: 'contact-export',
        message: `  exporting…`,
        index: i + 1,
        total,
        name,
      });
      const txt = await exportChat(serial, pkg, (m) =>
        emit({ phase: 'contact-export', message: `  ${m}`, index: i + 1, total, name }),
      );
      if (!txt) {
        emit({
          phase: 'contact-skip',
          message: `  export failed`,
          index: i + 1,
          total,
          name,
        });
        continue;
      }

      let parsed: Message[] = [];
      try {
        const raw = await fs.readFile(txt, 'utf-8');
        parsed = parseExportFile(raw);
      } catch (e) {
        emit({
          phase: 'contact-skip',
          message: `  parse error: ${e instanceof Error ? e.message : String(e)}`,
          index: i + 1,
          total,
          name,
        });
        continue;
      }

      const { added } = upsertContactMessages(db, name, numbers, parsed);
      addedTotal += added;
      c.got_all = true;
      exported++;

      // Persist after every contact for resumability.
      await saveSchemaDb(db);
      await saveContactsToDisk(contacts);

      emit({
        phase: 'contact-done',
        message:
          added > 0
            ? `  +${added} new (parsed ${parsed.length})`
            : `  up to date (parsed ${parsed.length})`,
        index: i + 1,
        total,
        name,
        parsed: parsed.length,
        added,
      });
    }

    emit({
      phase: 'done',
      message: `Done. ${exported} chats processed, ${addedTotal} new messages, ${skipped} skipped.`,
      total,
    });
    return { ok: true, exported, skipped, added: addedTotal, contacts };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    emit({ phase: 'error', message });
    return { ok: false, exported: 0, skipped: 0, added: 0, contacts: [], error: message };
  }
}

ipcMain.handle('adb:pull-messages', (event, serial: string) =>
  pullMessages(serial, event),
);

// ---------------------------------------------------------------------------
// Rebuild messages.json from already-exported .txt files
// ---------------------------------------------------------------------------

async function rebuildMessagesFromExports(
  event: IpcMainInvokeEvent,
): Promise<MessagesResult> {
  const emit = (p: MessagesProgress) => {
    if (!event.sender.isDestroyed()) {
      event.sender.send('adb:pull-messages:progress', p);
    }
  };
  try {
    const contacts = await loadContactsFromDisk();
    const exportDir = path.join(app.getPath('userData'), 'Exported Chats');
    let files: string[] = [];
    try {
      files = (await fs.readdir(exportDir)).filter((f) => f.toLowerCase().endsWith('.txt'));
    } catch {
      // ignore
    }
    if (files.length === 0) {
      const msg = 'No .txt files found in Exported Chats/.';
      emit({ phase: 'error', message: msg });
      return { ok: false, exported: 0, skipped: 0, added: 0, contacts, error: msg };
    }

    // Incremental: load existing DB so we only add genuinely new messages.
    const db = await loadSchemaDb();
    let exported = 0;
    let skipped = 0;
    let addedTotal = 0;
    const total = files.length;

    emit({
      phase: 'start',
      message: `Rebuilding from ${total} export file(s)…`,
      total,
    });

    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

    for (let i = 0; i < total; i++) {
      const file = files[i];
      const full = path.join(exportDir, file);
      let raw: string;
      try {
        raw = await fs.readFile(full, 'utf-8');
      } catch (e) {
        skipped++;
        emit({
          phase: 'contact-skip',
          message: `[${i + 1}/${total}] ${file} — read error`,
          index: i + 1,
          total,
          name: file,
        });
        continue;
      }
      const parsed = parseExportFile(raw);
      if (parsed.length === 0) {
        skipped++;
        emit({
          phase: 'contact-skip',
          message: `[${i + 1}/${total}] ${file} — no parsable messages`,
          index: i + 1,
          total,
          name: file,
        });
        continue;
      }

      // Collect non-system senders, then fuzzy-match to a contact by name.
      const senders = new Set<string>();
      for (const m of parsed) {
        if (m.sender && m.sender !== 'system') senders.add(m.sender);
      }
      let match: Contact | null = null;
      let matchSender: string | null = null;
      let bestScore = -1;
      for (const s of senders) {
        const ns = norm(s);
        for (const c of contacts) {
          const nc = norm(c.name);
          if (!nc || !ns) continue;
          let score: number;
          if (ns === nc) score = 1000;
          else if (ns.includes(nc) || nc.includes(ns))
            score = 500 + Math.min(ns.length, nc.length);
          else {
            let lcs = 0;
            for (let a = 0; a < ns.length; a++) {
              for (let b = 0; b < nc.length; b++) {
                let k = 0;
                while (
                  a + k < ns.length &&
                  b + k < nc.length &&
                  ns[a + k] === nc[b + k]
                )
                  k++;
                if (k > lcs) lcs = k;
              }
            }
            score = lcs;
          }
          if (score > bestScore && score >= 3) {
            bestScore = score;
            match = c;
            matchSender = s;
          }
        }
      }

      if (!match || (match.numbers || []).length === 0) {
        skipped++;
        emit({
          phase: 'contact-skip',
          message: `[${i + 1}/${total}] ${file} — no contact match (senders: ${[...senders].join(', ') || 'none'})`,
          index: i + 1,
          total,
          name: file,
        });
        continue;
      }

      emit({
        phase: 'file-parse',
        message: `[${i + 1}/${total}] ${file} → ${match.name} (${matchSender})`,
        index: i + 1,
        total,
        name: match.name,
      });

      const { added } = upsertContactMessages(db, match.name, match.numbers, parsed);

      if (added === 0) {
        skipped++;
        emit({
          phase: 'contact-skip',
          message: `[${i + 1}/${total}] ${file} → ${match.name} — already up to date (${parsed.length} messages)`,
          index: i + 1,
          total,
          name: match.name,
          parsed: parsed.length,
          added: 0,
        });
        continue;
      }

      addedTotal += added;
      exported++;

      // Persist incrementally so a crash mid-rebuild keeps progress.
      await saveSchemaDb(db);

      emit({
        phase: 'contact-done',
        message: `  +${added} messages (parsed ${parsed.length})`,
        index: i + 1,
        total,
        name: match.name,
        parsed: parsed.length,
        added,
      });
    }

    emit({
      phase: 'done',
      message: `Rebuilt. ${exported} files imported, ${skipped} skipped, ${addedTotal} messages.`,
      total,
    });
    return { ok: true, exported, skipped, added: addedTotal, contacts };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    emit({ phase: 'error', message });
    return { ok: false, exported: 0, skipped: 0, added: 0, contacts: [], error: message };
  }
}

ipcMain.handle('messages:rebuild', (event) => rebuildMessagesFromExports(event));

ipcMain.handle(
  'messages:load',
  async (): Promise<{ ok: boolean; db: SchemaDb; path?: string; error?: string }> => {
    const filePath = path.join(app.getPath('userData'), 'messages.json');
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return { ok: true, db: ensureSchemaDb(JSON.parse(data)), path: filePath };
    } catch (e) {
      const err = e as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') return { ok: true, db: emptySchemaDb(), path: filePath };
      return { ok: false, db: emptySchemaDb(), path: filePath, error: err.message || String(e) };
    }
  },
);

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
