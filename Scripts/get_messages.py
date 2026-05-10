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
    return subprocess.run(
        ["adb", "-s", DEVICE] + list(args),
        capture_output=True, text=True, encoding="utf-8", errors="replace"
    )

def list_device_txt_files():
    r = adb(
        "shell",
        "find /sdcard/Download /sdcard/Documents "
        "\\( -name 'WhatsApp*.txt' -o -name 'wa_export_*.txt' \\) 2>/dev/null"
    )
    return set(f.strip() for f in r.stdout.splitlines() if f.strip())


def current_focus_line():
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
