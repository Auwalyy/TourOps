# Build prompt — TourOps mobile app

Hand this whole file to a coding agent. It assumes the agent has the TourOps
monorepo open and can read `apps/api` and `apps/web`.

---

## The task

Build a React Native mobile app for **TourOps**, a multi-tenant B2B travel and
visa operations SaaS used by travel agencies in Kano, Nigeria (Hajj/Umrah
operators, visa consultants). It lives in `apps/mobile` of the existing npm
workspaces monorepo and talks to the **existing** Express + MongoDB API in
`apps/api`. Do not build a new backend, do not change the API's contracts, and
do not duplicate business logic that already lives on the server.

## Fixed technical decisions — do not substitute

| Thing | Version / choice | Why |
|---|---|---|
| Expo SDK | **57** (`expo@~57.0.26`) | Current stable |
| React Native | **0.86.3** | Pinned by SDK 57 — take it from `bundledNativeModules.json`, never guess |
| Routing | **expo-router ~57.0.24** (file-based) | Matches the web app's file-based routing so screens map 1:1 |
| Styling | **NativeWind 4.2.7** + **tailwindcss ^3.4** | Stable. NativeWind 5 needs Tailwind v4 but is still RC |
| Server state | **@tanstack/react-query v5** | Same as web — query keys can be copied |
| Client state | **zustand** | Same as web |
| Forms | **react-hook-form + zod** | Same as web |
| Token storage | **expo-secure-store** | Never `AsyncStorage` for tokens |
| Icons | **lucide-react-native** | Same icon set as web |

Pin every Expo-managed native module to the version in SDK 57's
`bundledNativeModules.json`. Run `npx expo install <pkg>` rather than
`npm install` for anything with native code.

## Non-negotiable product rules

1. **One fixed brand colour.** The accent is `#0d6e52` (green), with `#1c3a5e`
   navy as a rare secondary. There is **no** per-agency theming, no colour
   picker, and **no dark mode**. The user has asked for this repeatedly. An
   agency brands its *documents* with its logo and company name, never the
   interface.
2. **Multi-tenancy is server-side.** `agencyId` is always derived from the
   authenticated session. The client must never send it as input.
3. **Money is never computed on the client.** Totals, balances and
   `amountPaid` come from the API, which derives them from the `Payment`
   collection.
4. **Naira formatting**: `₦` with thousands separators, via a shared
   `formatCurrency` helper. Never hand-roll it per screen.

## Backend contract

- Base URL `<API>/api/v1`. Set it from `EXPO_PUBLIC_API_URL`.
- **Auth**: `POST /auth/login` → `{ accessToken, refreshToken, user }`. Access
  token expires in 15 minutes; refresh via `POST /auth/refresh`. Store both in
  SecureStore and refresh on 401 exactly once before logging out. The web
  client does this in `apps/web/src/lib/api.ts` — copy the interceptor logic,
  swapping `localStorage` for SecureStore. Note the web app relies on cookies
  as a fallback; mobile must send `Authorization: Bearer <token>` explicitly.
- **Errors** come back as `{ success: false, message, details? }`. Two status
  codes need special client handling:
  - **402** — subscription lapsed. `details.state` is `grace` (read-only),
    `locked` or `suspended`. Show a blocking screen for locked/suspended and a
    banner for grace.
  - **403 with `details.upgradeRequired`** — the agency's plan does not include
    that feature. Show the upgrade notice, not a generic error toast.
- **Entitlements**: `GET /subscription` returns `entitlements` —
  `{ maxUsers, packages, groups, reports, portal, branches, refunds, ai }`.
  Hide or lock UI accordingly, but never rely on this for security; the server
  enforces it too.
- Read the route files in `apps/api/src/routes/` for the full surface rather
  than inventing endpoints.

## Screens to build, in priority order

Build in this order and make each one work end to end before moving on. The
first four are what an agency owner actually opens on a phone.

1. **Login** — email + password, SecureStore persistence, auto-redirect if a
   valid session exists.
2. **Dashboard** — the KPI row (total customers, active bookings, pending
   visas, revenue, outstanding) from `GET /dashboard/kpis`, plus recent
   activity. Cards, not charts, on a phone.
3. **Travel files** — list with search and status filter; detail screen showing
   the customer, bookings, documents and the payment ledger with the balance.
4. **Visas** — three tabs matching the web app: Applications (the pipeline),
   Issued — Groups, Issued — Individual.
5. **Issued visas — group detail** — add an entry with camera/gallery upload
   (`expo-image-picker`) or a file (`expo-document-picker`), and download the
   branded PDF manifest via `expo-file-system` + `expo-sharing`.
6. **Customers** — list, search, detail, create.
7. **Bookings** — list with type and status filters; Family & Groups tab gated
   on the `groups` entitlement.
8. **Payments** — record a payment, and the verification queue for
   finance/owner roles.
9. **More** — team, billing, settings, sign out.

Camera-first matters: an agent standing at an embassy counter photographs a
visa rather than typing it. Make upload one tap from the group screen.

## Architecture requirements

- `app/` holds only routes. Real work goes in `src/`.
- Route groups: `app/(auth)/` for signed-out, `app/(tabs)/` for the signed-in
  shell, detail screens as `app/<resource>/[id].tsx`.
- Bottom tabs: Dashboard, Files, Visas, Customers, More. Five maximum.
- One `src/services/api.service.ts` mirroring the web app's, so a query key and
  call site look the same in both apps.
- Shared UI primitives in `src/components/ui/` — `Button`, `Card`, `Badge`,
  `Input`, `Screen`, `EmptyState`. Every screen composes these; no ad-hoc
  styling of buttons per screen.
- **Metro in a monorepo**: set `watchFolders` to the workspace root and add the
  root `node_modules` to `nodeModulesPaths`, or hoisted dependencies will not
  resolve.

## Definition of done

- `npx tsc --noEmit` passes.
- The app runs on a physical Android device over Expo Go against a real API.
- Logging in, pulling to refresh, going offline and coming back all behave.
- A locked subscription blocks the app; a grace-period subscription allows
  reads and refuses writes with the server's message.
- No hardcoded colours outside `src/lib/brand.ts` and `tailwind.config.js`.

## Things that will bite you

- **Android cleartext**: a `http://` API on a LAN IP is blocked by default.
  Use `expo-build-properties` with `usesCleartextTraffic` for development, or
  test against HTTPS.
- `localhost` from a phone is the phone. Use the machine's LAN IP.
- FormData uploads need `{ uri, name, type }`, not a browser `File`.
- The API's rate limit is 2000 requests per 15 minutes per IP; a retry loop
  will trip it.
