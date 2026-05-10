# WhatsApp Pull Chats

This project helps export WhatsApp Business chats into JSON using:

1. Python scripts for contacts and message parsing
2. A Tkinter desktop launcher (`app.py`)
3. An Android helper app (`WaSaver`) for share/export capture

## How It Works

### 1. Get Contacts

Run the contacts extractor:

```bash
python Scripts/get_contacts.py
```

This creates `contacts.json`.

### 2. Export and Parse Messages

Run the message pipeline:

```bash
python Scripts/get_messages.py
```

This:

1. Opens chats by number (wa.me intent)
2. Triggers WhatsApp export flow
3. Uses the Android helper app to save exported text files
4. Parses transcripts into structured JSON
5. Writes/updates `messages.json`

### 3. Desktop Runner

Launch the GUI:

```bash
python app.py
```

Buttons:

1. Run Contacts
2. Run Messages
3. Run All
4. Copy JSON (copies `messages.json`, or `contacts.json` fallback)

### 4. Build Windows EXE

```bash
python -m PyInstaller --noconfirm --clean --windowed --name WhatsAppExportRunner --add-data "Scripts;Scripts" app.py
```

Output:

1. `dist/WhatsAppExportRunner/WhatsAppExportRunner.exe`

### 5. Build Android Helper APK

```powershell
powershell -ExecutionPolicy Bypass -File .\WaSaver\build.ps1
```

Output:

1. `WaSaver/apk/wasaver.apk`

## For Contributors

### Project Structure

1. `Scripts/get_contacts.py`: pulls contact list
2. `Scripts/get_messages.py`: exports/parses chats and writes JSON
3. `app.py`: Tkinter launcher for running scripts
4. `WaSaver/`: Android app source + build script

### Local Setup

1. Use Python 3.10+
2. Install dependencies used by scripts (`uiautomator2`, etc.)
3. Ensure ADB is installed and available in PATH
4. Connect Android device and enable USB debugging

### Contribution Workflow

1. Create a feature branch
2. Keep changes focused (script logic, GUI, or Android helper)
3. Validate with:
	1. `python -m py_compile app.py`
	2. `python Scripts/get_contacts.py`
	3. `python Scripts/get_messages.py`
4. If GUI changed, rebuild EXE and test launch
5. Open PR with:
	1. What changed
	2. How to test
	3. Any known limitations

### Git Ignore Notes

Generated artifacts are intentionally ignored, including:

1. `contacts.json`
2. `messages.json`
3. `Exported Chats/`
4. `dist/`, `build/`, and APK build outputs

### Releases

Current release flow:

1. Build EXE
2. Create GitHub release
3. Attach `WhatsAppExportRunner.exe` as asset

For APK releases, attach `WaSaver/apk/wasaver.apk`.