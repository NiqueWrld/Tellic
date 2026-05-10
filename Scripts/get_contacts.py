"""
Pulls all contacts from the Android device via ADB and saves to contacts.json.
Uses the Android Contacts Provider (no root needed).

Usage:
    python Scripts/get_contacts.py
Output:
    contacts.json
"""

import json
import re
import subprocess

DEVICE  = "RF8Y10AWLYY"
OUTPUT  = "contacts.json"

def adb(*args):
    result = subprocess.run(
        ["adb", "-s", DEVICE] + list(args),
        capture_output=True, text=True, encoding="utf-8", errors="replace"
    )
    return result.stdout

PHONE_MIMETYPE = "vnd.android.cursor.item/phone_v2"

def parse_row(line):
    """Parse 'Row: N display_name=X, data1=Y, mimetype=Z' into a dict."""
    # Strip leading 'Row: N '
    body = re.sub(r"^Row:\s*\d+\s*", "", line)
    row = {}
    # Match each key=value pair — values run until the next ', key=' or end
    for m in re.finditer(r"(\w+)=(.*?)(?=,\s*\w+=|$)", body):
        k, v = m.group(1), m.group(2).strip()
        row[k] = None if v == "NULL" else v
    return row

def get_contacts():
    print("Querying device contacts...")
    result = subprocess.run(
        ["adb", "-s", DEVICE, "shell",
         "content", "query",
         "--uri", "content://com.android.contacts/data",
         "--projection", "display_name:data1:mimetype"],
        capture_output=True, text=True, encoding="utf-8", errors="replace"
    )

    contacts = {}
    for line in result.stdout.splitlines():
        if not line.startswith("Row:"):
            continue
        row = parse_row(line)
        if row.get("mimetype") != PHONE_MIMETYPE:
            continue
        name   = (row.get("display_name") or "Unknown").strip()
        number = row.get("data1")
        if not number:
            continue
        number = re.sub(r"[\s\-()]", "", number)
        if name not in contacts:
            contacts[name] = {"name": name, "numbers": []}
        if number not in contacts[name]["numbers"]:
            contacts[name]["numbers"].append(number)

    return list(contacts.values())

def main():
    contacts = get_contacts()
    if not contacts:
        print("No contacts found. Make sure USB debugging is authorised.")
        return

    contacts.sort(key=lambda c: c["name"].lower())

    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(contacts, f, ensure_ascii=False, indent=2)

    print(f"Saved {len(contacts)} contacts to {OUTPUT}")

if __name__ == "__main__":
    main()
