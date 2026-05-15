# Tellic

Tellic is an Electron desktop app that exports WhatsApp chats from an Android device into structured JSON.

It combines ADB automation, a guided in-app tutorial, contact and message workflows, and local-only storage.

## What Tellic Does

- Detects connected Android devices with ADB.
- Pulls saved WhatsApp contacts.
- Scroll-scrapes unsaved numbers from WhatsApp UI and skips contacts that already exist.
- Exports chats and parses transcripts into `messages.json`.
- Supports rebuild from already exported text files (`Exported Chats/*.txt`).
- Keeps all data local on your machine.

## Tech Stack

- Electron Forge + Vite
- React + TypeScript
- Tailwind CSS + Phosphor Icons
- Node child processes for ADB integration

## Prerequisites

- Node.js 20+ and npm
- Windows with USB drivers for your Android device
- Android phone with USB Debugging enabled

ADB is bundled automatically in `resources/adb` through `scripts/fetch-adb.ps1` during package flows.

## Quick Start

1. Install dependencies:

```bash
npm install --legacy-peer-deps
```

2. Start the app:

```bash
npm start
```

3. In Tellic:
- Open Tutorial (default start page).
- Step 1: enable USB debugging (video).
- Step 2: connect/check device.
- Step 3: pull contacts.
- Step 4: export/sync messages.

## App Flow

### Devices

- Lists connected devices from `adb devices -l`.
- Lets you select the active device.

### Contacts

- Pulls saved WhatsApp contacts from Android contacts provider.
- Runs UI scrolling pass for unsaved numbers.
- Skips numbers already known in contacts while scrolling.
- Writes merged contacts to local `contacts.json`.

### Messages

- Exports and parses chats from the selected device.
- Incremental message ingestion using stable content hash IDs.
- Re-running sync adds only new messages.
- Writes schema DB to local `messages.json`.
- Supports rebuild from `Exported Chats/*.txt`.

## Data and Storage

Tellic stores data locally in Electron user data paths at runtime.

Primary artifacts:

- `contacts.json`
- `messages.json`
- `Exported Chats/*.txt`

No telemetry or remote upload is performed by the app.

## Environment Variables

Tellic reads `.env` from:

- Dev: project root `.env`
- Packaged: `process.resourcesPath/.env`

Template values are in `.env.example`:

```env
BUSINESS_ID=1026a370-4102-459f-956b-f09809735835
RECEPTIONIST_ID=jSI05Mk0PHA7VzjUqgLE
```

## Scripts

- `npm start` -> start app in development
- `npm run lint` -> run ESLint
- `npm run package` -> package app with Electron Forge
- `npm run make` -> build distributables
- `npm run publish` -> publish with Forge
- `npm run fetch:adb` -> download platform-tools and bundle ADB DLL/exe files
- `npm run build:icons` -> generate app icons from SVG

## Build and Packaging

### Desktop Packages

```bash
npm run make
```

Outputs are generated under `out/`.

### Microsoft Store (AppX)

This project is configured with `@electron-forge/maker-appx` in `forge.config.ts`.

Example command:

```bash
npm run make -- --targets=@electron-forge/maker-appx --platform=win32 --arch=x64
```

Store identity values are already set in Forge config for Tellic.

## Troubleshooting

### ADB not found

- Run:

```bash
npm run fetch:adb
```

- Re-launch the app.

### Device shown as unauthorized

- Reconnect USB.
- Accept RSA debugging prompt on phone.
- Run `adb devices` and confirm state is `device`.

### No contacts or no messages found

- Confirm WhatsApp/WhatsApp Business is installed on the phone.
- Make sure chats are accessible and export flow is allowed.
- Retry from Tutorial Steps 2 to 4.

### Dependency install conflict

If npm reports peer dependency conflicts in this workspace, use:

```bash
npm install --legacy-peer-deps
```

## Repository Layout

- `src/main.ts` -> Electron main process and IPC handlers
- `src/preload.ts` -> secure renderer bridge (`window.adb`)
- `src/pages/App/*` -> app UI pages (Tutorial, Devices, Contacts, Messages)
- `src/pages/Docs/*` -> in-app documentation pages
- `src/hooks/*` -> UI data/action hooks
- `scripts/*` -> helper scripts (icons, ADB fetch)
- `resources/adb/*` -> bundled ADB runtime files
- `WaSaver/*` -> Android helper app source

## License

MIT
