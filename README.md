# Ente Highlights — mobile app

Instagram-style React Native (Expo, Android) client for the
[`ente-highlights-api`](../ente-highlights-api) backend.

## Two views
- **Timeline** — a deduplicated, paginated photo feed. Near-duplicate bursts are
  collapsed to a single cover (stack badge shows the count). The top row shows your
  saved highlights as IG-style stories.
- **Create** — recreate the spike's highlight builder with full settings parity:
  filters (time / person / album / theme), 16 quality-term sliders, distinctness
  blend and diversity controls. A debounced live preview updates as you tweak.
  Save a highlight to add it to your stories.

Tapping a story opens an **auto-advancing slideshow** (tap edges / swipe to skip),
and **Download** saves the whole pack to a named gallery album.

## Run it

```bash
npm install
npx expo install --fix   # aligns native deps to the installed Expo SDK

# Dev build is recommended (expo-media-library / reanimated / pager-view).
npx expo run:android         # local native build on a device/emulator
# or EAS:  eas build --profile development --platform android
```

Then `npx expo start --dev-client` and open on the device.

The API base URL defaults to `https://highlights.ente.stromflix.com` and can be
changed in **Settings**. Sign in with your Ente email + password (credentials are
stored in the device secure store for silent re-login).

> Expo Go won't include the custom native modules; use a dev build.
