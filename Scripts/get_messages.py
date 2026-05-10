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
import uiautomator2 as u2

DEVICE        = "RF8Y10AWLYY"
WA_PKG        = "com.whatsapp.w4b"
CONTACTS_FILE = "contacts.json"
MESSAGES_FILE = "messages.json"
TXT_DIR       = "Exported Chats"
CHAT_LIST_ID  = f"{WA_PKG}:id/conversations_row_contact_name"

# Matches: [DD/MM/YYYY, HH:MM:SS] Sender: text
MSG_RE = re.compile(
    r"^\[(\d{1,2}/\d{1,2}/\d{4}),\s*(\d{1,2}:\d{2}:\d{2})\]\s*([^:]+):\s*(.*)$"
)


# ── ADB helpers ────────────────────────────────────────────────────────────────

def adb(*args):
    return subprocess.run(
        ["adb", "-s", DEVICE] + list(args),
        capture_output=True, text=True, encoding="utf-8", errors="replace"
    )

def list_device_txt_files():
    r = adb("shell", "find /sdcard/Download /sdcard/Documents -name 'WhatsApp*.txt' 2>/dev/null")
    return set(f.strip() for f in r.stdout.splitlines() if f.strip())


# ── Chat export via UI ─────────────────────────────────────────────────────────

def open_chat_by_number(number):
    """Open a WhatsApp Business chat directly via intent using the phone number.
    Number should be in international format without '+' or spaces, e.g. '27655268082'.
    Returns True if the Conversation activity opened successfully.
    """
    # Normalise: strip everything except digits
    num = re.sub(r"\D", "", number)
    adb("shell", "am", "start",
        "-a", "android.intent.action.VIEW",
        "-d", f"https://wa.me/{num}",
        WA_PKG)
    time.sleep(2.5)
    # Confirm Conversation activity is now focused
    result = adb("shell", "dumpsys", "window", "|", "grep", "mCurrentFocus")
    return "Conversation" in result.stdout

def export_chat(d, contact_name):
    """Export the currently open chat. Returns path to the pulled .txt or None."""
    before = list_device_txt_files()

    if not d(description="More options").exists:
        return None

    d(description="More options").click()
    time.sleep(0.4)

    more = d(text="More") or d(text="more")
    if not more.wait(timeout=3):
        d.press("back")
        return None
    more.click()
    time.sleep(0.4)

    export_btn = d(text="Export chat")
    if not export_btn.wait(timeout=3):
        d.press("back"); d.press("back")
        return None
    export_btn.click()
    time.sleep(0.8)

    without = d(text="Without media")
    if without.wait(timeout=4):
        without.click()
    time.sleep(1.2)

    # Share sheet — tap Save to Files / Files / Downloads
    saved = False
    for label in ["Save to Files", "Files", "Save", "Downloads"]:
        btn = d(text=label)
        if btn.exists:
            btn.click()
            saved = True
            time.sleep(1.2)
            break
    if not saved and d(description="Files").exists:
        d(description="Files").click()
        time.sleep(1.2)

    for confirm in ["Save", "Done", "OK"]:
        btn = d(text=confirm)
        if btn.exists:
            btn.click()
            time.sleep(0.5)
            break

    # Pull new file
    os.makedirs(TXT_DIR, exist_ok=True)
    after = list_device_txt_files()
    new_files = after - before
    for remote in new_files:
        fname = os.path.basename(remote)
        dest  = os.path.join(TXT_DIR, fname)
        adb("pull", remote, dest)
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
                        messages.append(current)
                    current = {
                        "date":   m.group(1),
                        "time":   m.group(2),
                        "sender": m.group(3).strip(),
                        "text":   m.group(4)
                    }
                elif current:
                    # Continuation line
                    current["text"] += "\n" + line
        if current:
            messages.append(current)
    except Exception as e:
        print(f"  Parse error: {e}")
    return messages


# ── Main ───────────────────────────────────────────────────────────────────────

def load_json(path, default):
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    return default

def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def main():
    contacts = load_json(CONTACTS_FILE, [])
    if not contacts:
        print(f"No contacts found in {CONTACTS_FILE}. Run get_contacts.py first.")
        return

    messages_db = load_json(MESSAGES_FILE, {})

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

        # Use first number as key (normalised)
        key = re.sub(r"\D", "", contact["numbers"][0]) if contact["numbers"] else name

        messages_db[key] = {
            "name":     name,
            "numbers":  contact["numbers"],
            "got_all":  True,
            "messages": msgs
        }

        # Mark contact done
        contact["got_all"] = True
        done += 1

        # Save progress after every contact
        save_json(MESSAGES_FILE, messages_db)
        save_json(CONTACTS_FILE, contacts)
        print(f"  Saved. Progress: {done} done, {skipped} skipped.")

    print(f"\n=== Done ===")
    print(f"  Exported : {done}")
    print(f"  Skipped  : {skipped}")
    print(f"  Output   : {MESSAGES_FILE}")

if __name__ == "__main__":
    main()
