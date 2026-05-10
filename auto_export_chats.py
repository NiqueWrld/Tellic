"""
Automatically exports all WhatsApp Business chats via UI automation.
Taps through each chat -> More -> Export chat -> Without media -> Save to Downloads.
Then pulls all exported .txt files via ADB.
"""

import os
import time
import subprocess
import uiautomator2 as u2

DEVICE_SERIAL = "RF8Y10AWLYY"
WA_BUSINESS_PKG = "com.whatsapp.w4b"
OUTPUT_DIR = "Exported Chats"

def adb(cmd):
    result = subprocess.run(
        ["adb", "-s", DEVICE_SERIAL] + cmd,
        capture_output=True, text=True
    )
    return result.stdout.strip()

def connect():
    print("Connecting to device...")
    d = u2.connect(DEVICE_SERIAL)
    print(f"  Device: {d.device_info.get('productName', DEVICE_SERIAL)}")
    return d

def open_whatsapp_business(d):
    print("Opening WhatsApp Business...")
    current_app = d.app_current()
    already_open = current_app.get("package") == WA_BUSINESS_PKG

    if already_open:
        print("  Already open — navigating to chat list...")
        # Press back several times to get to the main chat list
        for _ in range(5):
            d.press("back")
            time.sleep(0.5)
    else:
        d.app_start(WA_BUSINESS_PKG, stop=False)
        time.sleep(5)
        # Dismiss any open chat/screen
        for _ in range(3):
            d.press("back")
            time.sleep(0.5)

    # Wait until the chat list is visible
    if not d(resourceId=f"{WA_BUSINESS_PKG}:id/conversations_row_contact_name").wait(timeout=10):
        print("  Chat list not visible — force restarting app...")
        d.app_start(WA_BUSINESS_PKG, stop=True)
        time.sleep(5)
        d(resourceId=f"{WA_BUSINESS_PKG}:id/conversations_row_contact_name").wait(timeout=10)

    # Scroll to top of chat list
    d.swipe_ext("down", scale=2.0)
    time.sleep(1)

def _is_group_chat(d):
    """Return True if the currently open chat is a group (shows 'participants' in header)."""
    # WhatsApp shows e.g. '5 participants' or 'You, Name, Name2' in the subtitle
    subtitle = d(resourceId=f"{WA_BUSINESS_PKG}:id/conversation_contact_subtitle")
    if subtitle.exists:
        try:
            text = subtitle.get_text()
            if text and "participant" in text.lower():
                return True
        except Exception:
            pass
    # Fallback: look for any visible text containing 'participants'
    return d(textContains="participants").exists


def _do_export_steps(d, chat_name):
    """Perform the export menu steps while inside an open chat. Returns True on success."""
    # Wait for chat to fully load (3-dot menu must appear)
    if not d(description="More options").wait(timeout=6):
        print(f"  SKIP: Chat view did not load for '{chat_name}'")
        return False

    # Skip group chats
    if _is_group_chat(d):
        print(f"  SKIP: group chat")
        return False

    d(description="More options").click()
    time.sleep(0.4)

    # Tap "More"
    more = d(text="More")
    if not more.wait(timeout=3):
        more = d(text="more")
    if more.exists:
        more.click()
        time.sleep(0.4)
    else:
        print(f"  SKIP: 'More' menu not found for '{chat_name}'")
        d.press("back")
        return False

    # Tap "Export chat"
    export = d(text="Export chat")
    if not export.wait(timeout=3):
        print(f"  SKIP: 'Export chat' not found for '{chat_name}'")
        d.press("back")
        d.press("back")
        return False
    export.click()

    # Wait for "Without media" / "Include media" dialog
    without_media = d(text="Without media")
    include_media = d(text="Include media")
    if not without_media.wait(timeout=5) and not include_media.wait(timeout=2):
        print(f"  SKIP: media dialog not found for '{chat_name}'")
        d.press("back")
        d.press("back")
        d.press("back")
        return False
    # Always choose Without media
    if without_media.exists:
        without_media.click()
    else:
        # Already saved without dialog (rare); continue
        pass

    # Wait for share sheet to appear
    time.sleep(1.2)

    # Save via share sheet
    saved = False
    for save_label in ["Save to Files", "Files", "Save", "Downloads"]:
        btn = d(text=save_label)
        if btn.exists:
            btn.click()
            saved = True
            time.sleep(1.2)
            break
    if not saved and d(description="Files").exists:
        d(description="Files").click()
        time.sleep(1.2)

    # Confirm save dialog if present
    for confirm in ["Save", "Done", "OK"]:
        btn = d(text=confirm)
        if btn.exists:
            btn.click()
            time.sleep(0.4)
            break

    return True


def export_all_chats_single_pass(d):
    """
    Single-pass export: processes chats top-to-bottom as they appear on screen.
    No scroll-back-to-top per chat — runs much faster than the scan+seek approach.
    """
    print("Starting single-pass export (scan + export in one scroll)...")
    seen = set()
    exported = 0
    failed = []
    index = 0
    no_new_streak = 0
    CHAT_LIST_ID = f"{WA_BUSINESS_PKG}:id/conversations_row_contact_name"

    while no_new_streak < 4:
        # Find first visible chat that hasn't been processed yet
        items = d(resourceId=CHAT_LIST_ID)
        new_item = None
        new_name = None

        for item in items:
            try:
                name = item.get_text()
                if name and name not in seen:
                    new_item = item
                    new_name = name
                    break
            except Exception:
                pass

        if new_item is None:
            # All visible chats are done — scroll down for more
            no_new_streak += 1
            d.swipe_ext("up", scale=0.4)
            time.sleep(0.6)
            continue

        no_new_streak = 0
        seen.add(new_name)
        index += 1
        print(f"[{index}] Exporting: {new_name}")

        # Snapshot existing files before export so we can detect the new one
        before_files = _list_device_txt_files()

        # Click the visible chat item directly (no searching needed)
        try:
            new_item.click()
        except Exception:
            print(f"  SKIP: click failed for '{new_name}'")
            failed.append(new_name)
            continue

        success = _do_export_steps(d, new_name)
        if success:
            exported += 1
            print(f"  Done.")
            # Pull the newly created file immediately
            _pull_new_file(before_files)
        else:
            failed.append(new_name)

        # Return to chat list — press back until chat list appears (max 4 presses)
        for _ in range(4):
            if d(resourceId=CHAT_LIST_ID).exists:
                break
            d.press("back")
            time.sleep(0.4)

        # Final check
        d(resourceId=CHAT_LIST_ID).wait(timeout=6)
        time.sleep(0.3)

    print(f"\n=== Single-pass complete ===")
    print(f"  Exported : {exported}")
    if failed:
        print(f"  Failed   : {len(failed)}")
        for f in failed:
            print(f"    - {f}")
    return exported, failed

def _list_device_txt_files():
    """Return set of WhatsApp .txt file paths currently on the device."""
    result = subprocess.run(
        ["adb", "-s", DEVICE_SERIAL, "shell",
         "find /sdcard/Download /sdcard/Documents -name 'WhatsApp*.txt' 2>/dev/null"],
        capture_output=True, text=True
    )
    return set(f.strip() for f in result.stdout.splitlines() if f.strip())


def _pull_new_file(before_files):
    """Pull any .txt file that appeared since before_files snapshot. Returns filename or None."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    after_files = _list_device_txt_files()
    new_files = after_files - before_files
    for f in new_files:
        fname = os.path.basename(f)
        dest = os.path.join(OUTPUT_DIR, fname)
        subprocess.run(["adb", "-s", DEVICE_SERIAL, "pull", f, dest],
                       capture_output=True)
        print(f"  Pulled: {fname}")
    return len(new_files)


def convert_to_html():
    """Convert all pulled .txt files to HTML using whatsapp-chat-exporter."""
    txt_files = [f for f in os.listdir(OUTPUT_DIR) if f.endswith(".txt")]
    if not txt_files:
        print("No .txt files to convert.")
        return

    html_dir = os.path.join(OUTPUT_DIR, "HTML")
    os.makedirs(html_dir, exist_ok=True)
    print(f"\nConverting {len(txt_files)} chat(s) to HTML...")

    for fname in txt_files:
        fpath = os.path.join(OUTPUT_DIR, fname)
        chat_out = os.path.join(html_dir, fname.replace(".txt", ""))
        result = subprocess.run(
            ["wtsexporter", "-e", fpath, "--business", "-o", chat_out, "--no-banner"],
            capture_output=True, text=True
        )
        if result.returncode == 0:
            print(f"  Converted: {fname}")
        else:
            print(f"  Failed:    {fname} — {result.stderr.strip()[:80]}")

    print(f"HTML output saved to: {html_dir}/")


def main():
    d = connect()
    open_whatsapp_business(d)

    # Single-pass: scroll top-to-bottom, export each chat as it appears
    exported, failed = export_all_chats_single_pass(d)

    print(f"\nAll done. {exported} chat(s) exported to '{OUTPUT_DIR}/'")

    # Convert exported .txt files to HTML
    convert_to_html()

if __name__ == "__main__":
    main()
