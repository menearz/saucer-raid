# Saucer Raid — store wrap

The **website stays on GitHub Pages**. The **store wrap is this extra build**. Upload waits on a Google Play developer account (**$25**) and an Apple Developer account (**$99**). Do not upload from this PR.

## Two builds, same game

| | Website (live) | Store wrap |
| --- | --- | --- |
| Command | `npm run build:pages` | `npm run build:wrap` |
| Vite config | `vite.pages.config.ts` | `vite.wrap.config.ts` |
| `base` | `/saucer-raid/` | `/` |
| Output | `docs/` | `dist/` |
| Used for | github.io | Capacitor WebView (Android / iOS) |

Pages **must** keep `base: '/saucer-raid/'`. A wrapped WebView **must** use `base: '/'` — the Pages path would 404 inside the app.

Game sim, physics, and art are not changed. Leftover better-auth / pglite / login files stay in the repo; the wrap uses the same no-account SPA as Pages.

## App identity

- **Name:** Saucer Raid
- **Package / bundle id:** `com.menearz.saucerraid`

## Icon slot (Spectre)

Drop the real **square** icon here later:

```
resources/icon.png
```

`resources/icon.png` is a placeholder (1024×1024, night-sky saucer). Do not run `scripts/write-placeholder-icon.py` after Spectre drops the real file — that script redraws the placeholder. After Spectre replaces it, on a machine with the native toolchains:

```bash
npx @capacitor/assets generate --iconBackgroundColor '#090b0e' --iconBackgroundColorDark '#090b0e' --assetPath resources
```

That stamps Android mipmaps and the iOS App Icon set. A Mac is **not** required to land this wrap — only to make an IPA later.

## Build the wrap (any machine with Node)

```bash
npm install
npm run build:wrap          # web bundle at dist/ with base /
npm run cap:sync            # rebuild + copy into android/ and ios/
```

`dist/` is gitignored. After you change the game, run `cap:sync` again before opening the native IDEs.

`npm run build:pages` is unchanged. Use it whenever you want to refresh github.io. Do not point Capacitor at `docs/`.

## Android (Chief, after the Google $25 account)

You do **not** need a Mac.

1. Install [Android Studio](https://developer.android.com/studio) (JDK comes with it).
2. From this repo:

   ```bash
   npm install
   npm run cap:sync
   npm run cap:android
   ```

   Or open the `android/` folder in Android Studio.
3. First open: let Gradle sync. Accept any SDK / build-tools prompts.
4. Run on an emulator or a USB phone to play-test.
5. For Play: **Build → Generate Signed App Bundle / APK → Android App Bundle**.
6. Upload the `.aab` in [Play Console](https://play.google.com/console). Package id must stay `com.menearz.saucerraid`.

Signing keys stay on Chief’s machine. This repo does not ship a keystore.

## iOS (Chief, after the Apple $99 account)

The `ios/` folder is already in git so this PR does not need a Mac. You **cannot** compile or upload an IPA on Linux. On a Mac:

1. Install Xcode from the Mac App Store and open it once (accept licenses).
2. From this repo:

   ```bash
   npm install
   npm run cap:sync
   npm run cap:ios
   ```

   Or open `ios/App/App.xcodeproj` (Swift Package Manager — no CocoaPods).
3. In Xcode: select the **App** target → **Signing & Capabilities** → your Team (the $99 account). Bundle id is `com.menearz.saucerraid`.
4. Run on a simulator or a plugged-in iPhone.
5. **Product → Archive**, then **Distribute App → App Store Connect**.

## What this wrap does not do

- No login, accounts, or IAP
- No new genre or knockoff ships
- No store upload from CI or from this repo
- No change to the live Pages game unless someone runs `build:pages` and commits `docs/`

When the accounts exist, Chief opens Android Studio / Xcode as above and uploads. Spectre drops the square icon in `resources/icon.png` first if the placeholder is still there.
