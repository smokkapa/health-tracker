# Setup

How to get the Health Tracker app running locally on your machine.

## Prerequisites

- **Node.js 20+** (LTS recommended). Check with `node -v`.
- **npm** (ships with Node) or your package manager of choice. The lockfile is npm.
- For native development:
  - **iOS**: macOS, Xcode installed, an iOS simulator or a physical device running the Expo Go app.
  - **Android**: Android Studio with an emulator, or a physical device running Expo Go.
- For web only: any modern browser. No additional tooling needed.

## Install

```bash
git clone <repo-url> health-tracker
cd health-tracker
npm install
```

This installs all dependencies pinned in `package.json`. Expo manages native versions automatically — you don't run `pod install` or anything else manually.

## Run

### Web (fastest way to try it)

```bash
npx expo start --web
```

A browser tab opens at `http://localhost:8081` (or similar). Hot reload is on by default. The web build uses `react-native-web` and a WASM-compiled SQLite running in your browser — no server needed.

### iOS

```bash
npx expo start --ios
```

Launches the iOS simulator (macOS only) and loads the app. Alternatively, scan the QR code from `npx expo start` in the Expo Go app on a physical device.

### Android

```bash
npx expo start --android
```

Launches an emulator from Android Studio, or scan the QR code in Expo Go.

### Interactive launcher

Just running `npx expo start` (no flag) gives you a CLI menu — press `w` for web, `i` for iOS, `a` for Android, `r` to reload.

## First-time use

1. The app boots to a **Sign In** screen.
2. Click **"Don't have an account? Sign up"** to create a local account (email + password ≥ 6 chars).
3. After sign-up you're routed to the **Dashboard**. The app starts empty.
4. Tap the **Log** tab to add your first reading.
5. The dashboard's per-metric cards show sparkline trends as soon as you have data. Tap any card for a detailed chart with normal-range bands, a sliding-window selector, and a full legend.

If you're the legacy data owner (`sridharcoolandfire@gmail.com`), signing up or signing in with that exact email auto-attaches any orphaned historical entries (e.g. from `xlsx` imports made before authentication was added) to your account.

## Importing your existing data

If you have a spreadsheet of past readings:

1. **Settings** → **Import from Excel** → pick your `.xlsx` file.
2. If the spreadsheet has columns for multiple people, you'll be prompted to choose which one to import.
3. The parser handles:
   - Blood Pressure sheet — cells like `131/81/108 @ 05:52` (sys/dia/optional pulse + optional time)
   - sugar sheet — cells like `338 mg/dl @ 23:14` + adjacent `fasting or not` and `notes` columns

Duplicates (same metric + same timestamp) are skipped on re-import.

## Exporting

**Settings → Export to CSV** writes a CSV containing every entry in the selected date range. On native it opens the system share sheet; on web it triggers a browser download.

## Project structure (high-level)

```
health-tracker/
├── app/                     # Expo Router screens (file-based routing)
│   ├── (auth)/              # Sign-in, sign-up, password reset
│   ├── (tabs)/              # Dashboard, Log, History, Settings
│   ├── _layout.tsx          # Root layout: AuthProvider + AuthGate
│   └── profile.tsx          # Personal health profile (modal route)
├── src/
│   ├── auth/                # Auth adapters + context
│   ├── components/          # Charts, forms, UI primitives
│   ├── db/                  # SQLite client + schema + queries
│   ├── integrations/        # Garmin / device integration stubs
│   ├── storage/             # StorageAdapter interface + SQLite impl
│   ├── stores/              # Zustand stores
│   ├── types/               # Shared TypeScript types
│   └── utils/               # Helpers (alerts, formatters, import/export, etc.)
├── assets/                  # Bundled assets (seed JSON, icons)
└── package.json
```

For a file-by-file feature map, see [`DEVELOPERS.md`](./DEVELOPERS.md).

## Common tasks

| Task | Command |
| --- | --- |
| Start dev server (interactive) | `npx expo start` |
| Start dev server (web) | `npx expo start --web` |
| Type-check | `npx tsc --noEmit` |
| Build a web bundle | `npx expo export --platform web` |
| Update Expo SDK deps | `npx expo install --check` |

## Platform-specific notes

### Web

- SQLite runs as WebAssembly via `expo-sqlite`'s web target. The DB persists in the browser's storage and survives reloads. Clearing site data wipes both the DB and the session.
- `Alert.alert` with multiple buttons is silently broken on `react-native-web`, so we use a small `notify` / `confirm` / `choose` wrapper in `src/utils/alerts.ts` that falls back to `window.confirm` / `window.prompt`. Always use these helpers — do **not** call `Alert.alert` directly.
- The browser tooltip in History uses a `.web.tsx` Metro override of `<Tooltip>` to render an HTML `title` attribute. Native is a no-op passthrough.
- File picker uses a hidden `<input type="file">`; CSV export uses a Blob + anchor download.

### Native (iOS / Android)

- File picker uses `expo-document-picker`; CSV export uses `expo-file-system` + `expo-sharing` to invoke the system share sheet.
- Date inputs in some screens use plain `TextInput`s for portability (no platform-specific date picker library has been adopted).

## Troubleshooting

- **Metro cache weirdness after schema or dependency changes**: stop the dev server and re-run `npx expo start --clear`.
- **"no such column" errors after pulling new schema migrations**: the local DB needs to upgrade. The migration runs automatically on next launch, but if you're in a weird state, you can wipe local data via **Settings → Danger Zone → Delete all data**, or for web just clear site data in the browser.
- **TypeScript errors on first install**: ensure you ran `npm install`. Then `npx tsc --noEmit` should be clean.
- **Skia / CanvasKit errors**: shouldn't happen — we removed Skia in favour of pure `react-native-svg`. If you somehow see one, check that `victory-native` or `@shopify/react-native-skia` haven't been re-added by an `npx expo install` upgrade.
