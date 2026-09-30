# TourOps mobile

React Native app for the TourOps platform. It talks to the existing API in
`apps/api` — there is no separate mobile backend.

## Running it

```bash
# 1. Point the app at your API. The phone cannot reach "localhost",
#    so use your machine's LAN IP.
cp apps/mobile/.env.example apps/mobile/.env
#    It points at the deployed backend by default; edit it only to run
#    against a local API.

# 2. Start the API and the app
npm run dev --workspace=apps/api
npm run start --workspace=apps/mobile
```

Scan the QR code with Expo Go on a physical device. An emulator works too, but
the camera flow — the point of the visa screens — needs a real phone.

## What is here

| Screen | Route | State |
|---|---|---|
| Login | `app/(auth)/login.tsx` | Done |
| Dashboard | `app/(tabs)/index.tsx` | Done |
| Travel files (list) | `app/(tabs)/travel-files.tsx` | Done |
| Travel file (detail) | `app/travel-file/[id].tsx` | Done — read-only |
| Visas (3 tabs) | `app/(tabs)/visas.tsx` | Done — read-only lists |
| Visa group (detail) | `app/visa-group/[id].tsx` | Done — add entry with camera, download manifest |
| Customers | `app/(tabs)/customers.tsx` | Done — list and tap-to-call |
| More | `app/(tabs)/more.tsx` | Done |

Not built yet: creating customers and travel files, recording payments, the
payment verification queue, bookings, and the packages/reports/billing screens
(those stay on the web app for now, and `More` says so rather than
dead-ending).

## Conventions

- `app/` holds routes only. Everything else lives in `src/`.
- One accent colour, `#0d6e52`, in `src/lib/brand.ts` and `tailwind.config.js`.
  No per-agency theming and no dark mode — same rule as the web app.
- Tokens go in SecureStore, never AsyncStorage. `src/lib/api.ts` refreshes once
  on a 401 and shares a single in-flight refresh across concurrent requests.
- Money is never computed here; the API returns it already derived.

## Gotchas that cost time

- **Version pinning**: take native module versions from SDK 57's
  `bundledNativeModules.json`, never from npm `latest`. React must be
  `19.2.3` for React Native 0.86.3.
- **Metro in a monorepo**: `watchFolders` must include the workspace root and
  `nodeModulesPaths` must list both node_modules directories. Do *not* set
  `disableHierarchicalLookup` — expo-router's transitive dependencies will not
  resolve.
- **expo-file-system v57** uses the `File`/`Paths` API. `cacheDirectory` and
  `downloadAsync` now live in `expo-file-system/legacy`.
- **FormData uploads** need `{ uri, name, type }`, not a browser `File`.
- **Android cleartext** is enabled via `expo-build-properties` for development
  against an `http://` LAN API. Remove it for production.
