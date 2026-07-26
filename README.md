# Ente Highlights — mobile app

React Native (Expo, Android) client for the
[`ente-highlights-api`](../ente-highlights-api) backend. The app is focused on **one
thing: curating and viewing photo highlights** — your normal timeline already lives in
the Ente app.

## Screens

- **Highlights** (home) — a gallery of your saved highlights as cover cards. Tap a card
  to open it; long-press to delete. A floating **Create** button starts a new highlight,
  and the header has **sync** (kick off the server-side ingest) and **settings**.
- **Create** — build a highlight from:
  - **People** — pick one or more named people (avatar chips). With two or more selected,
    an **Any / All** toggle chooses between "anyone appears" and "everyone together".
  - **When** — a specific calendar month (year stepper + month grid), quick *This month / This
    year* chips, or a custom **From / To** date range.
  - **Theme** — a free-text vibe/scene search (semantic).
  - **How many** highlights, plus an **Advanced** section (quality-term weights, diversity and
    distinctness controls) tucked away by default.

  The preview is run **on demand** with a **Run preview** button (it's not a live filter); a
  loading indicator shows while it runs, and tapping any preview thumbnail opens the full
  viewer. Save adds the highlight to the home gallery.
- **Highlight viewer** — a full-screen, **swipeable, pinch-to-zoom** gallery. Share or save a
  single photo, peek a near-duplicate **stack**, or **download the whole highlight** into a
  named gallery album.

## Run it

```bash
npm install
npx expo install --fix   # aligns native deps to the installed Expo SDK

# Dev build is recommended (expo-media-library / reanimated / gesture-handler).
npx expo run:android         # local native build on a device/emulator
# or EAS:  eas build --profile development --platform android
```

Then `npx expo start --dev-client` and open on the device.

It also runs in the browser for quick UI checks:

```bash
npx expo start --web
```

The API base URL defaults to `https://highlights.ente.stromflix.com` and can be changed in
**Settings**. Sign in with your Ente email + password (stored in the device secure store —
or `localStorage` on web — for silent re-login).

> Expo Go won't include the custom native modules; use a dev build for the device.

## Build an installable Android APK

The `android/` project is checked in. Build a standalone, installable APK with Gradle:

```bash
# one-time, only if android/ is missing or native deps changed:
npx expo prebuild --platform android

cd android
./gradlew assembleRelease        # or assembleDebug for a debug build
```

The APK lands at:

```
android/app/build/outputs/apk/release/app-release.apk      # release
android/app/build/outputs/apk/debug/app-debug.apk          # debug
```

Install it on a connected device/emulator:

```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

Or just copy the `.apk` to the phone and open it (enable "install unknown apps").

> The `release` build is currently **debug-signed** (see `signingConfigs` in
> `android/app/build.gradle`), so it installs directly for sideloading but isn't
> Play-Store-ready. App id: `com.stromflix.entehighlights`. For a Play-signed
> bundle use `eas build --profile production --platform android` (produces an `.aab`).

## Offline behaviour and caching

Server state is React Query, persisted to `AsyncStorage` so a cold start paints from
cache instead of a spinner. Only stable keys are persisted (`saved`, `saved-items`,
`people`, `terms`, `config`, `sync`) — previews and cluster lookups are always refetched.
Connectivity is tracked with NetInfo via React Query's `onlineManager`, so queries pause
offline, resume on reconnect, and an **offline banner** explains that results are cached.

Signing out — or pointing the app at a different API base URL — clears the persisted
cache. If you change what a cached key contains, bump `CACHE_BUSTER` in
[src/lib/query.ts](src/lib/query.ts).

## Regenerating the icon and splash

App artwork is generated from the vendored Ente Photos launcher icon in `assets/vendor/`
with a sparkle badge added, mirroring the heart badge's placement, tilt, outline, shadow
and specular highlight.

```bash
uv venv /tmp/.imgvenv
uv pip install --python /tmp/.imgvenv/bin/python pillow

/tmp/.imgvenv/bin/python scripts/make_assets.py            # writes assets/*.png
/tmp/.imgvenv/bin/python scripts/make_assets.py --preview  # contact sheet of style variants
```

This writes `icon.png`, `adaptive-icon.png`, `splash-icon.png` and `favicon.png`. Re-run
`npx expo prebuild --platform android --clean` afterwards so the Android launcher icons
are regenerated.

