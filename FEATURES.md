# Dashboard release — 25 October 2026

Run Start-HyperMeal.cmd and open http://127.0.0.1:4180. Stop with Ctrl+C. Existing dependencies stay in place.

## Available now

- Overview: intake, active calories, baseline-plus-active burn, macros, hydration and a transparent daily-habits score.
- Food diary: photo suggestions, human review, editable portions, custom label nutrients, barcode lookup, edit/delete saved meals.
- Movement: adaptable starter routines, activity records, Strava sync and daily fitness CSV import.
- Profile: name, age (20+ prototype), height, starting weight, preferences and user-entered goals.
- Progress: dated weight check-ins, BMI, charts, saved 30-day forecasts and prediction-error feedback.
- AI coach: opt-in Gemini conversation using only the question and selected day's meal totals and titles. No automatic record changes. Conversation lives in the current page.
- Community: persistent posts and replies on a private instance board. No fake users, verified accounts, public discovery or external social network.

The browser test used a separate database with synthetic records. The dashboard-preview.jpg image shows that test data, not the user's health information.

## Credentials and AI

The launcher now uses run_local.py. It can reuse the existing law project's Gemini key in process memory when neither an environment key nor HyperMeal settings file exists. It does not copy that credential into HyperMeal files. Running server.py directly does not reuse the law key.

Alternatively set GEMINI_API_KEY or add a key in Profile & connections. User-entered provider credentials are stored in ignored local data/settings.private.json and never returned to the browser. The file is not encrypted at rest; keep it private and out of shared archives. Environment variables take precedence. A configured key is not proof of live model availability. Gemini is not Gemma and does not itself satisfy the Gemma prize category.

Photo scans and coaching require explicit per-request cloud consent. Original photos are not stored. Chat includes only the question, selected day's meal totals, meal titles and log-completeness flag. No profile measurements or community posts go to the coach.

## Fitness connections

Strava uses a user-supplied access token with activity:read permission. Connect verifies the account; Sync imports selected-day activities using the activity's local date. There is no background sync or automatic refresh; expired tokens must be replaced. Up to 12 activities are accepted per sync. Records without calorie data are skipped and reported. Repeat sync reconciles prior Strava records for that day. Avoid manually duplicating synced activities. Disconnect removes the local token; revoke provider authorization in Strava separately if desired.

Daily CSV import accepts date,active_kcal,steps (up to 366 rows). It validates the whole file before writing. Reimporting replaces the same day. Imported daily active energy overrides individual workout calories for that day; removing the import restores workout totals. Import active energy, not total daily burn. Apple Health and Android Health Connect are not connected automatically; a native bridge or export conversion is needed.

Live Strava account authorization and sync require your credentials and remain unverified against a real account. The adapter is tested with provider-shaped fixtures.

## Habits, BMI and forecasts

The habits score gives 40 points for a complete food log, up to 30 for the chosen hydration target and up to 30 for the chosen movement target. It is not a clinical health score. BMI is weight in kilograms divided by height in metres squared; it is a screening measure, not a complete health assessment.

A forecast requires a weight reading on the selected date and at least seven completed food-log days in the preceding 30 days. Missing days are excluded, not treated as zero intake. Current user-entered baseline energy plus logged active energy produces an exploratory energy balance. The 7700 kcal/kg approximation is not a validated physiological model. The projected daily rate is bounded at +/-0.1 kg/day.

Saved forecasts remain fixed. An actual reading on the target day or up to seven days later gives signed kg error and absolute percentage error = abs(actual - predicted) / actual * 100. Later forecasts use 25% of historical signed error per day, capped at +/-0.03 kg/day. Percentage errors are reported, not multiplied into calorie targets. Goals are never automatically changed. Backdated views cannot use future readings for evaluation.

This modest calibration does not establish prediction accuracy: incomplete food logging, baseline estimates, water changes, body composition and changing energy needs introduce uncertainty. No training dataset, clinical model or guaranteed weight outcome is claimed.

## Verification and remaining work

Sixteen automated tests pass. They cover calculations, API validation, persistent diary records, profiles/BMI, fitness-import atomicity and idempotency, calorie deduplication, forecast eligibility and immutable predictions, percentage error, calibration, future-reading exclusion, mocked Strava sync, community replies and coach consent/context.

Browser checks verified profile setup, saving a 150 g rice meal (195 kcal), workout logging, BMI display and community posting using synthetic data. The dashboard was visually inspected at desktop and mobile widths; no horizontal page overflow was detected at mobile width. Browser console inspection showed no errors. The screenshot is saved as dashboard-preview.jpg.

Public deployment, full social accounts/moderation, automatic mobile health sync, live account validation, model accuracy evaluation, sponsor verification and submission materials remain later work. Nothing was uploaded or submitted.

## References and AI assistance

The original design draws workflow inspiration from [NutriScan](https://nutriscan.app/) and [Calorie Mama](https://caloriemama.ai/app). One Gemini call generated the initial HTML shell from the general tools/ui-brief.txt feature brief, followed by local implementation, refinement and testing. No existing private source or personal health data was sent for that generation.

- [Strava authentication](https://developers.strava.com/docs/authentication/) and [API reference](https://developers.strava.com/docs/reference/).
- [CDC BMI explanation](https://www.cdc.gov/bmi/faq/index.html).
- [NIDDK Body Weight Planner](https://www.niddk.nih.gov/health-information/weight-management/body-weight-planner): a more rigorous alternative to simple energy-balance scenarios. This prototype does not implement that model.
