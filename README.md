# HyperMeal — nutrition & movement dashboard

Photo recognition → user review → editable nutrition → saved diary. The new responsive dashboard adds profiles, workouts, progress, fitness imports, AI chat and a private community board. Open http://127.0.0.1:4180 after running the launcher; the original API explorer remains at /docs.

Read [FEATURES.md](FEATURES.md) for the new workflows, setup, forecast methodology, connection limits and design references. It supersedes the original API-only limitations below.

## Run on this computer

Double-click `Start-HyperMeal.cmd`, then open http://127.0.0.1:4180/docs. It uses the existing Python environment at `D:\Kode Kurrent\legal-studio\.venv`; installed dependencies have not been moved. Stop with Ctrl+C.

For a portable setup: use Python 3.12+, install `requirements.txt` in your own project environment, then run `python server.py`. No framework or build step is required. SQLite creates `data/diary.sqlite3` on the first diary request. Do not commit that private database.

Set `GEMINI_API_KEY` and optionally `HYPERMEAL_MODEL` in the launching shell before starting. `.env.example` documents settings; `.env` is not automatically loaded. The default model is `gemini-3.1-flash-lite`; access and image support depend on the provider/account. The new local launcher can reuse the existing key in memory; see FEATURES.md. Without a key, recognition returns an explicit 503 and manual nutrition/diary remain usable. Gemini is not Gemma: using Gemini alone does not establish Gemma prize eligibility. Choose and verify an accessible image-capable Gemma endpoint separately before making sponsor claims.

## API workflow

1. `POST /api/analyze` with `{"image_base64":"<base64 image bytes>","allow_cloud":true}`. JPEG/PNG/WebP, max 5 MB and 16 million pixels. Images are decoded, resized and re-encoded without original metadata before sending to Google; the server does not save them. Review the provider's retention terms for cloud processing.
2. Review suggested food names and portions. `GET /api/foods?q=rice` searches the offline catalog. `GET /api/products/3017620422003` fetches packaged-food data from Open Food Facts. Missing values are null and must be completed before calculating.
3. `POST /api/estimate` with `{"items":[{"food_id":"rice","grams":150}]}`. For another food, use `{"name":"My food","grams":100,"source":"Package label","per_100g":{"kcal":120,"protein":5,"carbs":15,"fat":4}}` as an item. All four nutrient values are required. Add oil or other ingredients explicitly.
4. `POST /api/meals` with the items plus `date` (YYYY-MM-DD), `title`, `confirmed:true`, and optional `notes`. Dates are explicit diary dates, independent of the server timezone.
5. Read `/api/meals?date=2026-10-25`; retrieve `/api/meals/{id}`; replace with `PUT /api/meals/{id}` using the full confirmed payload; delete with `DELETE /api/meals/{id}`.
6. `/api/summary?date=2026-10-25` totals the day. `/api/export` exports all records as JSON.

Each saved meal snapshots its nutrients and source. Later catalog changes do not silently change old meals. Nutrition calculations use grams / 100; kcal is energy, other macros are grams. `/api/health` reports configuration, not proof of provider availability.

## Data and attribution

The supplied HyperMeal brief links Open Food Facts, not a downloadable meal-photo training corpus. No model has been trained for this prototype.

`data/foods.json` contains about 220 foods (per 100 g edible portion; drinks per 100 ml) with categories and alternative names used for search and photo matching. Plain foods use typical reference values in the style of USDA FoodData Central and Indian food composition tables; cooked dishes are typical home-recipe estimates. They were compiled for convenience and have not been individually checked against those sources, so they are not a validated or clinical dataset. Your own foods (label values, barcode results) are saved in the diary database via `POST /api/foods`, appear in search and photo matches, and can be removed with `DELETE /api/foods/{id}`. Photo scans return up to five database matches per detected food for review before saving.

The live packaged-food connector uses [Open Food Facts API](https://openfoodfacts.github.io/openfoodfacts-server/api/). Results carry source links and ODbL attribution. Observe ODbL attribution/share-alike obligations when redistributing database extracts; images have separate licensing. This app does not download product images or bulk-import their database. Barcode lookups happen on request, with no automatic retries.

Recognition uses the [Google image understanding API](https://ai.google.dev/gemini-api/docs/image-understanding). The model identifies candidates; it is not the authority for nutrition values. Low confidence, hidden ingredients and portion uncertainty require human review. There are no diagnosis, diet prescription or clinical accuracy claims.

## Verification

Run `python -m unittest discover -s tests -v`. Tests use isolated temporary databases and mocked provider responses. They cover nutrient scaling, invalid values, confirmation, dates, persistence, edits/deletion, totals, image decoding, provider response validation, missing label data, HTTP errors, authentication and cross-origin rejection. Mocked recognition is not a live-model accuracy evaluation.

## Deployment later

Local-only by default. This is one private diary per server, not a multi-user platform. Before remote use, configure `HYPERMEAL_API_TOKEN`, `HYPERMEAL_HOST`, and `HYPERMEAL_ALLOWED_HOST` (public hostname only), use TLS via a production reverse proxy, persistent storage, request/rate limits and backups. A non-loopback bind without a token is refused. Shared bearer-token authentication does not isolate multiple users. The Python development HTTP server is not hardened production hosting.

DigitalOcean deployment, a verified Gemma configuration, evaluation photos, presentation and demo video remain later steps. Nothing has been published or submitted. The supplied event document says choose ONE problem statement, while 'both' refers to prize categories; ask organizers before submitting two projects.



## Standalone Android app (0.4)

The current package is `releases/HyperMeal.apk`; see `releases/INSTALL.md`. It is fully independent of this website: it bundles its own copy of the food database, stores all data on the phone, and never connects to the PC. It adds live camera scanning, scan results matched to the food database, and an on-phone "My food database". Double-click `Share-APK-to-Phone.bat` to download it to a phone on the same Wi-Fi. Rebuild with `python android/build_apk.py` (needs the Android SDK build-tools 36 and platform 36 under `%LOCALAPPDATA%\Android\Sdk`, or `ANDROID_HOME`). The website also has the camera screen, which uses a PC webcam.
