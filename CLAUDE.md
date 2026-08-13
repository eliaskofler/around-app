# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

"Around Fitness" — an Expo Router / React Native app (iOS-first, also builds for Android and web) for logging food into a day timeline, mirrored to Apple Health. Bundle id `com.ripledd.around`, EAS project owned by `eliaskofler`.

## Commands

- `npm run ios` / `npm run android` / `npm run web` — start Metro and launch on a platform.
- `npm start` — start Metro without a target.
- `npm run lint` — `expo lint` (flat ESLint config in [eslint.config.js](eslint.config.js), built on `eslint-config-expo`).
- `npx tsc --noEmit` — type-check (`strict: true`, no separate typecheck script defined).
- No test suite exists in this repo.
- `npm run reset-project` — Expo's stock script that moves starter code to `app-example/` and blanks `app/`; effectively irreversible, don't run it without being asked.

This app depends on native modules (HealthKit, camera, image picker, SQLite) via config plugins, so `npx expo prebuild` / a dev client build is needed for full native testing — Expo Go will not have Health access. There are no `ios/`/`android/` native folders checked in (gitignored); they're generated on demand.

## Architecture

### Routing (`app/`, Expo Router)

File-based routing via `expo-router`. [app/_layout.tsx](app/_layout.tsx) defines the single `Stack`:

- `index` — the day pager (the whole app, essentially). Renders its own header via `Stack.Screen options={{ header: ... }}` because the header needs the pager's own state (current day label).
- `add-food` — the method picker (`SectionCard`'s "Add food" routes here). Manual entry and barcode scanning are wired up; "Snap to Track" and "Describe by Text" are still disabled tiles (`route` left unset in `add-food.tsx`'s `METHODS`).
- `manual-entry`, `edit-section`, `settings`, `terms` — standard modal/form-sheet routes.
- `barcode-scan` — full-screen (not a sheet) `expo-camera` barcode scanner; on a match it pushes `food-result`, on no match it offers `food-search`.
- `food-search` — free-text fallback over the Open Food Facts search API when a scanned barcode isn't in the database; the results list is what lets the user pick which product actually matches.
- `food-result` — shared confirm screen for both `barcode-scan` and `food-search`: re-fetches the product by barcode (`utils/open-food-facts.ts`), lets the user set the amount and section, then logs it via `addEntry`.

Sheets share a custom `SheetHeader` (passed as `header` in `_layout.tsx`, not `headerBackground`) and `contentStyle: { backgroundColor: theme.groupedBackground }` — read the comments in `_layout.tsx` before changing header/blur behavior, there's specific reasoning there about why `react-native-screens`' native header blur is being bypassed in favor of a plain gradient (see `constants/navigation.ts`'s `LIQUID_GLASS_HEADER_OPTIONS`).

### State (`hooks/`, React context)

Three app-wide providers wrap the `Stack` in `_layout.tsx`, outermost to innermost: `HealthKitProvider` → `FoodLogProvider` → `NutritionGoalsProvider`. Order matters — `FoodLogProvider` consumes `useHealthKit()`.

- **`use-food-log.tsx`** — the food log itself: `sections` + `entriesByDate`. In-memory state hydrated from `utils/db.ts` (a local SQLite database; `localStorage` on web) on mount, and written back on every mutation — see `dbLoaded` and the mount effect for how hydration is sequenced ahead of Health import. Lives above the route tree because `manual-entry`/`edit-section` are separate routes that write to the same state as the day pager. Also owns the Health import loop: full history on cold launch, a short 7-day catch-up on every foreground (`AppState` listener), independent of the sync-out toggle — this is now a fallback layered on top of the local database, for anything logged in Health by another app rather than the primary way the log survives a restart.
- **`use-health-kit.tsx`** — wraps `@kingstinct/react-native-healthkit`. Writing to Health is opt-in (`enabled`, toggled in Settings, persisted via `KVStore`); reading back in (`importEntries`) runs unconditionally so entries logged elsewhere still show up. A logged entry becomes one `HKCorrelationTypeIdentifierFood` bundling four quantity samples (energy, carbs, protein, fat); the section id round-trips through a custom metadata key (`AroundMealSection`) so a re-import restores the original meal instead of guessing from time of day. Health's schema has no room for `Entry.product`/`imageUrl`/`emoji`, so those only survive via the local database, not a Health round-trip. Degrades to inert/unavailable off-iOS with no platform guards needed elsewhere.
- **`use-nutrition-goals.tsx`** — daily calorie/macro goals. Persisted as one JSON blob under a `KVStore` key (`nutrition-goals`); read back with a shape check that falls back to `DEFAULT_GOALS` on anything unparsable.
- **`use-theme-preference.tsx`** — light/dark/auto, applied through RN's real `Appearance.setColorScheme` (not a hand-rolled color swap) so native surfaces (status bar, glass, the system date picker) pick it up too. No-op on web (`Appearance.setColorScheme` doesn't exist there); web just follows the OS scheme.
- **`kv-store.ts` / `kv-store.web.ts`** — tiny sync key-value wrapper for small preference values (theme, health-sync toggle, nutrition goals) — not the food log, which has its own database (`utils/db.ts`). Native uses `expo-sqlite/kv-store` (so this is in fact backed by SQLite on-device, a separate database file from `utils/db.ts`'s); web has a separate `.web.ts` implementation because the SQLite kv-store pulls in a WASM build Metro can't resolve for web. Platform split via RN's usual `.web.ts` extension resolution, not `Platform.select`.

Everything that matters — the food log, sections, nutrition goals, and preferences — now survives a restart, either via `utils/db.ts` (food log/sections) or `KVStore` (goals/preferences). Per-entry Health sync state (`healthSampleId`) is part of the food log row, so it survives too.

### Domain model (`utils/`, framework-free)

- **`entries.ts`** — `Entry`/`EntryDraft`/`Section` types plus pure helpers: macro↔calorie conversion (4/4/9 kcal/g), goal splitting, `moveEntry` (reorders/reassigns an entry's section, used by drag-and-drop — read its doc comment on how `index` is interpreted). `Entry.loggedAt` is a string, not a `Date`, because `Entry` crosses into Reanimated worklets via the drag machinery and worklets can't copy a `Date`.
- **`sections.ts`** — the day's sections (Breakfast/Lunch/Dinner/Snacks by default, user-editable): icon/color enums (`SECTION_ICONS`, `SECTION_COLORS`) and `sectionForNow` (time-of-day heuristic for where a new/imported entry lands).
- **`date.ts`** — local-time-only date helpers keyed by `YYYY-MM-DD` (`DateKey`). Deliberately avoids UTC/`Date` arithmetic pitfalls by constructing `Date`s from y/m/d parts.
- **`open-food-facts.ts`** — client for the (unauthenticated, public) Open Food Facts API: `lookupBarcode` (exact match), `searchFoodByName` (free-text fallback for `food-search`), and `scaleProduct` (per-100g nutriments scaled to a logged amount). Every result funnels through one `toProduct` shape check that also drops anything without usable calorie data, so `barcode-scan.tsx`/`food-search.tsx`/`food-result.tsx` never have to deal with the raw API response.

### UI building blocks (`components/`)

- **`day-page.tsx`** + **`entry-drag.tsx`** — the day's scrollable list of sections and the custom long-press-to-lift drag-and-drop reordering (Reanimated worklets + `react-native-gesture-handler`, not a drag-and-drop library). These two files are exempted from `react-hooks/immutability` / `react-hooks/refs` lint rules in [eslint.config.js](eslint.config.js) because Reanimated's shared-value/worklet model is fundamentally incompatible with the React Compiler's assumptions — don't "fix" that by removing the exemption.
- **`app-header.tsx`**, **`sheet-header.tsx`**, **`header-gradient-blur.tsx`** — the two header styles (floating day header vs. modal sheet header), both replacing `react-native-screens`' native blur with a drawn gradient — see the comments in `app/_layout.tsx` for why.
- **`section-card.tsx`**, **`entry-row.tsx`**, **`day-summary.tsx`** — section grouping, a single logged row, and the day's calorie/macro progress summary.
- **`day-picker.tsx`** — the inline calendar sheet for jumping to an arbitrary day (separate from the pager's own swipe-driven range growth in `app/index.tsx`).
- **`form.tsx`**, **`sheet-body.tsx`**, **`glass-surface.tsx`**, **`header-action.tsx`**, **`section-picker.tsx`** — shared form/sheet/glass-effect chrome and the section-choosing chip row, used across every "log a food" route (`manual-entry`, `food-result`).

`app/index.tsx` itself is the day pager: a horizontal `ScrollView` of `DayPage`s that starts with a fixed window around today (`PAGER_DAYS_BEFORE_TODAY`) and grows in `GROW_CHUNK_DAYS` chunks as the user nears a loaded edge, while the day picker can jump straight to a date far outside the currently loaded range.

### Theming (`constants/theme.ts`, `hooks/use-theme.ts`)

`Colors.light` / `Colors.dark` are Apple's measured iOS HIG system colors (not guessable hex from `UIColor`), keyed by semantic name (`label`, `groupedBackground`, `separator`, …) — prefer those semantic names over raw tints so components adapt across schemes automatically. `useTheme()` returns the active scheme's color object. Sections pick a tint from a fixed `SECTION_COLORS` subset (`utils/sections.ts`), not the full palette.

## Stray duplicate files

The working tree currently has untracked `*.tsx` files with a `" 2"` suffix (e.g. `components/day-picker 2.tsx`, `components/entry-drag 2.tsx`, `hooks/use-health-kit 2.tsx`) that are stale, older copies of the canonical files sitting alongside them — not part of the app and not imported anywhere. Don't edit them by mistake when the canonical file (without the suffix) is what's wired into routing/imports; flag them for deletion rather than treating them as an alternate implementation to reconcile.
