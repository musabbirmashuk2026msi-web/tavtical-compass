# TACTICAL COMPASS

Mobile-first React + TypeScript web app. Angular convention: **360° = 6400 mils = 6000 rukhs**. Includes a browser orientation compass, converter/back bearings, camera overlay, GPS capture, named local locations, WGS 84 / UTM projection (built-in Krueger series, no external projection library), geographic distance/bearing, JSON import/export, dark/light theme.

## Run/build
Requires Node.js 20+ and npm. Run `npm install`, `npm test`, `npm run lint`, `npm run build`, `npm run dev`. Vite production output is `dist/`. Deploy to a static HTTPS host for camera and geolocation permissions.

## Android delivery
This is a web app project, not a prebuilt APK. Use on Android via HTTPS and “Add to Home screen” where supported. Native APK packaging requires a separate wrapper/build step (for example Capacitor + Android tooling or CI).

## Honest limitations
Browser orientation APIs vary. The app uses `webkitCompassHeading` when available or labels absolute device orientation as not guaranteed magnetic heading. Physical sensor behavior has not been verified on your handset. Camera overlay is not precision sensor fusion. GPS accuracy is shown only when reported. Saved records use browser localStorage and can be cleared by the browser/OS; export backups. UTM supports WGS 84 from 80°S to 84°N with Norway/Svalbard special-zone selection. External map links require internet. Calculations and saved records are local; no server uploads are implemented.

## Build the Android APK (works fully offline)
1. Create a GitHub repository and upload all files from this folder (including the hidden `.github` folder; if it does not upload, create `.github/workflows/build-apk.yml` in the GitHub web editor and paste `build-apk-workflow-copy.yml`).
2. Open the **Actions** tab. "Build Tactical Compass APK" runs on every push (about 5-8 minutes the first time).
3. When it is green, open the repo's **Releases** page on your phone, download `TacticalCompass.apk`, and install it (allow "Install unknown apps" for your browser when asked).
All app files are bundled inside the APK, so no internet is needed after install. The APK is debug-signed (fine for personal use, not for the Play Store).
