# HyperMeal for Android — version 0.4

`HyperMeal.apk` is a standalone app for Android 8 or newer. It does not connect to the HyperMeal website on your PC. The phone and the website each keep their own separate data.

## Install

1. On the PC, double-click `Share-APK-to-Phone.bat`. It prints an address such as `http://192.168.1.20:4184/`.
2. On the phone, connected to the same Wi-Fi, open that address and tap **Download HyperMeal.apk**. If Windows asks whether Python may use the network, allow it on private networks.
3. Open the downloaded file. If Android asks, allow installation from your browser or file manager.

You can also copy `HyperMeal.apk` to the phone by USB. The app is signed with a local key for testing; it is not a Play Store release. If version 0.3 is installed, 0.4 installs over it and keeps its data, because both use the same key.

## What works on the phone

- **Food diary, profile, water, workouts, weight and progress** work offline. Everything is stored on the phone. Uninstalling the app or clearing its storage deletes it.
- **Food database:** about 220 built-in foods, including many Indian dishes, are bundled in the app. Foods you add (label values, barcode results, scanned foods) are saved in **My food database** on the phone.
- **Camera scanning:** on Food diary, tap **Use camera**, allow camera access, fit the plate inside the circle and tap the round button. You can also choose an existing photo with **Scan Photo**.
- **Reviewing a scan:** each detected food is matched to the food database with its nutrition. Change the food or grams, or choose **Enter nutrition facts…** for unmatched foods. Then tick the review box and tap **Save to diary**.

## AI and internet features

Photo recognition and the AI coach need internet and your own Gemini API key. Enter the key in **Profile & connections** and tap **Enable AI**. The key is encrypted with Android Keystore and never bundled in the APK. A photo is sent to Google only after you tick "Send this photo to Google". Provider limits and charges may apply.

Barcode search uses Open Food Facts and needs internet but no key. Strava sync needs your own access token.

## Accuracy

Built-in nutrition values are typical per-100 g references. Cooked dishes vary a lot with recipe and oil. AI food recognition and portion guesses can be wrong; check every item before saving. Nothing here is medical advice.

## Testing done for 0.4

- The signed APK was built and its signature verified.
- The app's bundled pages and data layer were tested in a desktop browser with a simulated camera and a stand-in for the Gemini bridge: camera capture, scan matching, saving to My food database, and saving meals to phone storage.
- 19 backend tests pass.

Not tested: installing and running on a real phone or emulator (none was available), the Android camera-permission prompt, and live Gemini calls from the phone.
