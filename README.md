# Health Tracker

A cross-platform personal health metrics tracker. Log blood pressure, blood sugar, and weight (with optional pulse and body fat %) on iOS, Android, or in your browser. Charts, trend bands, a hover-rich history, CSV export, and Excel import — all backed by a local SQLite database so your data stays on your device.

## What it does

- **Track core metrics**
  - Blood pressure (systolic / diastolic / optional pulse)
  - Blood sugar (with fasting flag and free-text notes)
  - Weight (with optional body fat %)
- **Visualise trends** with interactive charts that highlight normal vs. out-of-range readings, plus a draggable sliding window to scrub through history.
- **Log new readings** through a context-aware form (the inputs adapt to the metric you pick).
- **Browse history** in a list or table, filter by metric and date, hover for full details (notes, fasting state, source, etc.).
- **Import** historical data from an Excel spreadsheet — auto-discovers per-person columns so you can import just your own data from a shared family sheet.
- **Export** to CSV at any date range.
- **Per-user accounts** with a 15-minute inactivity session timeout. Local password storage today, designed to swap to Supabase Auth tomorrow.
- **Personal health profile** for static info you only enter once: date of birth, sex, height, conditions, medications, family history, allergies, genetics, lab notes.

## Why

The project started as a family-shared spreadsheet for tracking blood pressure and blood sugar across multiple people. The spreadsheet became unwieldy, didn't visualise trends well, and didn't fit a single-person mobile UX. This app keeps the same data shape but moves it to a per-user, mobile-first home with proper charting and a clean separation between storage, auth, and integrations — so adding cloud sync (Supabase) or device sync (Garmin / Apple Health) later is a single-adapter change rather than a rewrite.

## Tech stack

- **React Native + Expo** (SDK 54) — one codebase runs on iOS, Android, and the web (desktop browser)
- **TypeScript** end to end
- **Expo Router** — file-based navigation, with separate `(auth)` and `(tabs)` route groups
- **expo-sqlite** — local persistence
- **Zustand** — state management
- **react-native-svg** — charts (pure SVG, no Skia, works everywhere)
- **SheetJS (`xlsx`)** — client-side spreadsheet parsing for imports

## Status

Local-first single-user-per-device. The architecture (`StorageAdapter`, `AuthAdapter`, `IntegrationAdapter`) is designed so the planned upgrades — Supabase Auth + cloud sync, Garmin Health API integration, Apple Health / Google Fit — drop in as new adapter implementations without touching any UI code.

## Documentation

- [`SETUP.md`](./SETUP.md) — install, run, and platform-specific gotchas
- [`DEVELOPERS.md`](./DEVELOPERS.md) — file-by-file map of where each feature lives
