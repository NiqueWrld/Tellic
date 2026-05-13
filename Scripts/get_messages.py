"""
For each contact in contacts.json, exports the WhatsApp Business chat via UI automation,
parses the .txt export into structured messages, and saves them to messages.json.

Tracks progress with a "got_all" boolean per contact so it can be interrupted and resumed.

Usage:
    python Scripts/get_messages.py

Output:
    messages.json   — { "27831234567": { "got_all": true, "messages": [...] }, ... }
    contacts.json   — updated in-place with "got_all" flag per contact
"""

import json
import os
import re
import subprocess
import time
import hashlib
import uiautomator2 as u2
from datetime import datetime

# Core runtime configuration.
# DEVICE: ADB serial for the physical phone used for export automation.
# WA_PKG: WhatsApp Business package name.
# CONTACTS_FILE / MESSAGES_FILE: persistent JSON inputs/outputs for resumable runs.
DEVICE        = "RF8Y10AWLYY"
WA_PKG        = "com.whatsapp.w4b"
CONTACTS_FILE = "contacts.json"
MESSAGES_FILE = "messages.json"
TXT_DIR       = "Exported Chats"
CHAT_LIST_ID  = f"{WA_PKG}:id/conversations_row_contact_name"

# Output schema identifiers (adjust to match your production IDs)
BUSINESS_ID    = "1026a370-4102-459f-956b-f09809735835"
RECEPTIONIST_ID = "jSI05Mk0PHA7VzjUqgLE"

# Matches: [DD/MM/YYYY, HH:MM:SS] Sender: text
MSG_RE = re.compile(
    r"^\[(\d{1,2}/\d{1,2}/\d{4}),\s*(\d{1,2}:\d{2}:\d{2})\]\s*([^:]+):\s*(.*)$"
)

# Matches: YYYY/MM/DD, 5:57 pm - Sender: text  (also DD/MM/YYYY variants)
MSG_RE_ALT = re.compile(
    r"^(\d{1,4}/\d{1,2}/\d{1,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?\s*[apAP]\.?m\.?)\s*-\s*([^:]+?):\s*(.*)$"
)

# Matches system lines without sender: YYYY/MM/DD, 10:34 pm - Messages and calls...
SYS_RE_ALT = re.compile(
    r"^(\d{1,4}/\d{1,2}/\d{1,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?\s*[apAP]\.?m\.?)\s*-\s*(.*)$"
)


# ── ADB helpers ────────────────────────────────────────────────────────────────

def adb(*args):
    # Unified subprocess wrapper for all adb operations.
    return subprocess.run(
        ["adb", "-s", DEVICE] + list(args),
        capture_output=True, text=True, encoding="utf-8", errors="replace"
    )

def list_device_txt_files():
    # Discover exports produced either by WhatsApp default naming or WA Saver naming.
    r = adb(
        "shell",
        "find /sdcard/Download /sdcard/Documents "
        "\\( -name 'WhatsApp*.txt' -o -name 'wa_export_*.txt' \\) 2>/dev/null"
    )
    return set(f.strip() for f in r.stdout.splitlines() if f.strip())


def current_focus_line():
    # Reads current Android foreground window for navigation diagnostics.
    r = adb("shell", "dumpsys", "window")
    for line in r.stdout.splitlines():
        if "mCurrentFocus" in line:
            return line.strip()
    return "<no mCurrentFocus found>"


def ui_exists(sel):
    """Safe exists check for flaky chooser UI calls on some Samsung devices."""
    try:
        return sel.exists
    except Exception:
        return False


# ── Chat export via UI ─────────────────────────────────────────────────────────

def open_chat_by_number(number):
    """Open a WhatsApp Business chat directly via intent using the phone number.
    Number should be in international format without '+' or spaces, e.g. '27655268082'.
    Returns True if the Conversation activity opened successfully.
    """
    # Normalise: strip everything except digits
    num = re.sub(r"\D", "", number)
    # Launches chat via wa.me deep link, which is more reliable than tapping chat list.
    start = adb("shell", "am", "start",
        "-a", "android.intent.action.VIEW",
        "-d", f"https://wa.me/{num}",
        WA_PKG)
    if start.returncode != 0:
        print(f"  [DEBUG] am start failed: {start.stderr.strip()}")
    time.sleep(2.5)
    focus = current_focus_line()
    print(f"  [DEBUG] focus after wa.me: {focus}")
    # Conversation and Composer are valid chat views; ContactPicker means no active chat opened.
    return ("Conversation" in focus) or ("ConversationCompose" in focus)

def export_chat(d, contact_name):
    """Export the currently open chat. Returns path to the pulled .txt or None."""
    # Snapshot files before export so we can detect the newly created transcript.
    before = list_device_txt_files()
    print(f"  [DEBUG] txt files before export: {len(before)}")

    if not ui_exists(d(description="More options")):
        print("  [DEBUG] More options button not found")
        return None

    d(description="More options").click()
    time.sleep(0.4)

    more = d(text="More") or d(text="more")
    if not more.wait(timeout=3):
        print("  [DEBUG] 'More' entry not found in menu")
        d.press("back")
        return None
    more.click()
    time.sleep(0.4)

    export_btn = d(text="Export chat")
    if not export_btn.wait(timeout=3):
        print("  [DEBUG] 'Export chat' entry not found")
        d.press("back"); d.press("back")
        return None
    export_btn.click()
    time.sleep(0.8)

    without = d(text="Without media")
    if without.wait(timeout=4):
        without.click()
    else:
        print("  [DEBUG] 'Without media' chooser not found")
    time.sleep(2.5)

    # Share sheet behavior varies heavily by OEM skin, so this block is intentionally defensive.
    # Tap "WA Saver" in the share sheet app row.
    # Samsung's ChooserActivity only shows ranked apps — scroll far right,
    # then look for "WA Saver" or a "More apps" / see-all button.
    screen = d.info
    h = screen.get("displayHeight", 2340)
    w = screen.get("displayWidth", 1080)
    app_row_y = int(h * 0.90)   # bottom ~10% of screen where app icons sit

    found = False
    for i in range(30):
        # Check for WA Saver (text or description)
        for label in ["WA Saver", "WaSaver"]:
            if ui_exists(d(text=label)) or ui_exists(d(description=label)):
                (d(text=label) if ui_exists(d(text=label)) else d(description=label)).click()
                found = True
                break
        if found:
            break
        # Check for a "More" / "See all" / "More apps" button
        for more_label in ["More", "See all", "More apps", "More options"]:
            if ui_exists(d(text=more_label)):
                d(text=more_label).click()
                time.sleep(1.0)
                # Now in expanded list — look for WA Saver
                if ui_exists(d(text="WA Saver")):
                    d(text="WA Saver").click()
                    found = True
                else:
                    d.press("back")
                break
        if found:
            break
        # Scroll the app row left to reveal more apps
        d.swipe(int(w * 0.85), app_row_y, int(w * 0.15), app_row_y, duration=0.2)
        time.sleep(0.3)

    if not found:
        # Dump what's on screen now for diagnosis
        print("  [DEBUG] Share sheet contents after scrolling:")
        for el in d():
            info = el.info
            txt = info.get("text","") or info.get("contentDescription","")
            if txt:
                print(f"    text={info.get('text','')!r}  desc={info.get('contentDescription','')!r}")
        d.press("back"); d.press("back")
        return None

    time.sleep(2.0)  # WA Saver saves and finishes instantly

    # Pull new file
    os.makedirs(TXT_DIR, exist_ok=True)
    after = list_device_txt_files()
    new_files = after - before
    print(f"  [DEBUG] txt files after export: {len(after)}")
    print(f"  [DEBUG] new txt files detected: {len(new_files)}")
    for remote in new_files:
        print(f"  [DEBUG] pulling: {remote}")
        fname = os.path.basename(remote)
        dest  = os.path.join(TXT_DIR, fname)
        adb("pull", remote, dest)
        # We only need one transcript per chat export.
        return dest  # return first new file

    return None


# ── .txt parser ────────────────────────────────────────────────────────────────

def parse_txt(path):
    """Parse a WhatsApp exported .txt file into a list of message dicts."""
    messages = []
    current  = None
    try:
        with open(path, encoding="utf-8", errors="replace") as f:
            for line in f:
                line = line.rstrip("\n")
                m = MSG_RE.match(line)
                if m:
                    if current:
                        # Finalize previously open message before starting a new one.
                        messages.append(current)
                    current = {
                        "date":   m.group(1),
                        "time":   m.group(2),
                        "sender": m.group(3).strip(),
                        "text":   m.group(4)
                    }
                    continue

                m2 = MSG_RE_ALT.match(line)
                if m2:
                    if current:
                        messages.append(current)
                    current = {
                        "date":   m2.group(1),
                        "time":   m2.group(2),
                        "sender": m2.group(3).strip(),
                        "text":   m2.group(4)
                    }
                    continue

                ms = SYS_RE_ALT.match(line)
                if ms:
                    if current:
                        messages.append(current)
                    current = {
                        "date":   ms.group(1),
                        "time":   ms.group(2),
                        "sender": "system",
                        "text":   ms.group(3)
                    }
                    continue

                elif current:
                    # Continuation line
                    current["text"] += "\n" + line
        if current:
            messages.append(current)
    except Exception as e:
        print(f"  Parse error: {e}")
    return messages


def make_timestamp_iso(date_str, time_str):
    """Best-effort parser for WhatsApp export date/time into ISO format (UTC-style suffix)."""
    clean_time = (time_str or "").replace("\u202f", " ").replace("\xa0", " ").strip().lower()
    clean_time = clean_time.replace("a.m.", "am").replace("p.m.", "pm").replace("a.m", "am").replace("p.m", "pm")

    fmts = [
        ("%Y/%m/%d", "%I:%M %p"),
        ("%Y/%m/%d", "%I:%M:%S %p"),
        ("%d/%m/%Y", "%H:%M:%S"),
        ("%d/%m/%Y", "%H:%M"),
    ]
    for df, tf in fmts:
        try:
            dt = datetime.strptime(f"{date_str} {clean_time}", f"{df} {tf}")
            return dt.strftime("%Y-%m-%dT%H:%M:%S.000Z")
        except ValueError:
            continue
    # Fallback keeps pipeline moving even when a specific line has an unusual date format.
    return datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.000Z")


def empty_schema_db():
    # Top-level schema expected by downstream app/import tooling.
    return {
        "bookings": {},
        "businesses": {},
        "clients": {},
        "conversations": {},
        "errorLogs": {},
        "feedback": {},
        "messages": {},
        "receptionists": {},
        "subscriptions": {}
    }


def ensure_schema_db(db):
    if not isinstance(db, dict):
        return empty_schema_db()
    # Legacy format: top-level keys are phone numbers.
    schema_keys = {"bookings", "businesses", "clients", "conversations", "errorLogs", "feedback", "messages", "receptionists", "subscriptions"}
    if any(k in db for k in schema_keys):
        merged = empty_schema_db()
        merged.update(db)
        for k in schema_keys:
            if k not in merged or not isinstance(merged[k], dict):
                merged[k] = {}
        return merged

    # Convert old structure into the new one.
    converted = empty_schema_db()
    for phone_key, payload in db.items():
        if not isinstance(payload, dict):
            continue
        name = payload.get("name") or "Unknown"
        numbers = payload.get("numbers") or [phone_key]
        phone = re.sub(r"\D", "", numbers[0] if numbers else phone_key)
        client_id = f"cl_{phone}"
        conv_id = f"{RECEPTIONIST_ID}_{phone}"

        converted["clients"][client_id] = {
            "phoneNumber": phone,
            "fullName": name,
            "createdAt": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.000Z"),
            "updatedAt": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.000Z")
        }

        converted["conversations"][conv_id] = {
            "businessId": BUSINESS_ID,
            "receptionistId": RECEPTIONIST_ID,
            "phoneNumber": phone,
            "contactName": name,
            "clientId": client_id,
            "createdAt": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.000Z"),
            "updatedAt": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.000Z")
        }

        for idx, m in enumerate(payload.get("messages", [])):
            # Stable-ish deterministic ID from message payload context.
            digest = hashlib.sha1(f"{conv_id}|{idx}|{m.get('date','')}|{m.get('time','')}|{m.get('sender','')}|{m.get('text','')}".encode("utf-8", errors="ignore")).hexdigest()[:20]
            ts = make_timestamp_iso(m.get("date", ""), m.get("time", ""))
            converted["messages"][digest] = {
                "conversationId": conv_id,
                "businessId": BUSINESS_ID,
                "receptionistId": RECEPTIONIST_ID,
                "clientId": client_id,
                "direction": "inbound" if (m.get("sender") == name or m.get("sender") == "system") else "outbound",
                "content": m.get("text", ""),
                "timestamp": ts
            }
    return converted


def upsert_contact_messages(db, contact_name, numbers, msgs):
    # Uses the first number as canonical conversation key for this contact.
    phone = re.sub(r"\D", "", numbers[0]) if numbers else ""
    client_id = f"cl_{phone}"
    conv_id = f"{RECEPTIONIST_ID}_{phone}"
    now_iso = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.000Z")

    db["clients"][client_id] = {
        "phoneNumber": phone,
        "fullName": contact_name,
        "updatedAt": now_iso,
        "createdAt": db["clients"].get(client_id, {}).get("createdAt", now_iso)
    }

    conversation = db["conversations"].get(conv_id, {})
    conversation.update({
        "businessId": BUSINESS_ID,
        "receptionistId": RECEPTIONIST_ID,
        "phoneNumber": phone,
        "contactName": contact_name,
        "clientId": client_id,
        "createdAt": conversation.get("createdAt", now_iso),
        "updatedAt": now_iso,
    })

    last_ts = None
    last_text = ""
    for idx, m in enumerate(msgs):
        ts = make_timestamp_iso(m.get("date", ""), m.get("time", ""))
        sender = (m.get("sender") or "").strip()
        direction = "inbound" if (sender == contact_name or sender == "system") else "outbound"
        content = m.get("text", "")

        msg_hash = hashlib.sha1(f"{conv_id}|{idx}|{m.get('date','')}|{m.get('time','')}|{sender}|{content}".encode("utf-8", errors="ignore")).hexdigest()[:20]
        db["messages"][msg_hash] = {
            "conversationId": conv_id,
            "businessId": BUSINESS_ID,
            "receptionistId": RECEPTIONIST_ID,
            "clientId": client_id,
            "direction": direction,
            "content": content,
            "timestamp": ts
        }
        last_ts = ts
        last_text = content

    if last_ts:
        # Useful for showing conversation preview in a UI later.
        conversation["lastMessageAt"] = last_ts
        conversation["lastMessage"] = last_text
    db["conversations"][conv_id] = conversation


# ── Main ───────────────────────────────────────────────────────────────────────

def load_json(path, default):
    # Safe file load helper with default fallback when file does not exist yet.
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    return default

def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def main():
    # contacts.json is the source-of-truth queue for which contacts to export.
    contacts = load_json(CONTACTS_FILE, [])
    if not contacts:
        print(f"No contacts found in {CONTACTS_FILE}. Run get_contacts.py first.")
        return

    raw_db = load_json(MESSAGES_FILE, {})
    # Accept either legacy output or the newer app schema.
    messages_db = ensure_schema_db(raw_db)

    print(f"Loaded {len(contacts)} contacts.")
    print("Connecting to device...")
    d = u2.connect(DEVICE)

    total   = len(contacts)
    done    = 0
    skipped = 0

    for i, contact in enumerate(contacts):
        name    = contact["name"]
        numbers = contact.get("numbers", [])

        # Skip if already done
        if contact.get("got_all"):
            skipped += 1
            continue

        if not numbers:
            print(f"\n[{i+1}/{total}] {name} — SKIP: no number")
            continue

        print(f"\n[{i+1}/{total}] {name}  ({numbers[0]})")

        # Open chat via intent using the first number
        if not open_chat_by_number(numbers[0]):
            print(f"  SKIP: could not open chat")
            continue

        # Export
        txt_path = export_chat(d, name)
        if not txt_path:
            print(f"  SKIP: export failed")
            continue

        # Parse
        msgs = parse_txt(txt_path)
        print(f"  Parsed {len(msgs)} messages.")

        upsert_contact_messages(messages_db, name, contact["numbers"], msgs)

        # Mark contact done
        contact["got_all"] = True
        done += 1

        # Save progress after every contact
        # This makes the run resumable if interrupted mid-way.
        save_json(MESSAGES_FILE, messages_db)
        save_json(CONTACTS_FILE, contacts)
        print(f"  Saved. Progress: {done} done, {skipped} skipped.")

    print(f"\n=== Done ===")
    print(f"  Exported : {done}")
    print(f"  Skipped  : {skipped}")
    print(f"  Output   : {MESSAGES_FILE}")

if __name__ == "__main__":
    main()
