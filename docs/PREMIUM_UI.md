# Premium storefront — 2026-11-05

## Design and behavior

BBP Center remains a single-operator Roblox account and farming store. Existing purchase, reservation, wallet, farm, OAuth and owner routes are preserved.

- Dark navy default with electric-blue actions and cyan highlights. Saved light/system choices still apply; the initial HTML uses the same default to avoid a flash.
- New home hero uses the existing BBP logo, subtle ambient movement and a logo entrance. No external animation or audio asset downloads.
- Catalog artwork remains square (1:1), uncropped, in 2/3/4-column responsive grids. Card tilt is limited to fine pointers and disabled during keyboard/form focus.
- Shared cards, buttons, field focus, account tabs, farm steps/price summary, login branding and owner controls use the same tokens.
- Viewport card reveals, route entrance, native confirmation dialogs with entry/exit motion, skeleton loading and success toasts.
- Native dialogs trap focus, support Escape, restore the trigger focus and display API errors inside the dialog.
- Sound defaults OFF. The header speaker button stores only the preference in `bbp-sound`. AudioContext is created/resumed from an explicit gesture. No page-load sound. Short synthesized click/menu/success cues use a 75 ms throttle.
- Success feedback follows successful API responses. Pending/review or failed top-ups never get a success cue. There is no cart in the existing purchase flow, so no unrelated cart was added.
- `prefers-reduced-motion` disables decorative movement/tilt and uses minimal transition behavior. Mobile disables continuous hero animations. Sound is independent and remains opt-in.

## Changed files

- `app/index.html`, `app/src/index.css`, `app/src/store/theme.ts`: theme, design tokens, shared motion and responsive styling.
- `app/src/components/ui.tsx`, `StoreExperience.tsx`, `CatalogSkeleton.tsx`: shared primitives, dialog, SFX, toast and loading.
- `app/src/production/Layout.tsx`, `Storefront.tsx`: navigation, route motion, home, catalog and farm presentation.
- `app/src/production/Account.tsx`, `Admin.tsx`, `Inventory.tsx`: login/wallet/account presentation, owner navigation, confirmations.
- `app/src/production/api.ts`, `api.test.ts`: confirmed-result UI notifications and regression coverage.
- `app/.21st/design.json`, `DESIGN.md`: design context and durable decisions.

No server implementation, database schema, prices, payment configuration or OAuth credentials changed.

## Verification performed

- Production TypeScript/Vite build passed; JS about 151 kB gzip, CSS about 7.5 kB gzip. No new runtime dependency.
- Frontend: 16 tests passed, including failure/pending/confirmed success feedback.
- Backend: 25 tests passed covering OAuth validation/linking, authentication/CSRF, wallet isolation, atomic purchase/reservation, farm pricing, payment retry/reconciliation, private delivery, image validation and nested inventory.
- 21st review: 7 changed component files, zero findings. Component search required sign-in, so the implementation reused the existing project primitives.
- Browser QA uses an isolated in-memory database at localhost:5188. Checked home, catalog, farm quote 100,000 = 160 THB, password login, account, admin settings save/toast, sound toggle/persistence, dialog Escape and focus restoration.
- Responsive checks at 320, 390 and 768 pixels show no horizontal overflow; desktop checked at the browser default width (~1265 px). Reduced-motion behavior reviewed in CSS and MotionConfig, not OS-level emulation.
- Live-money redemption/purchases and a fresh external Google/Discord authorization are not performed by this UI change. Automated OAuth/payment provider tests use fixtures.

## Deployment

Use the existing NAS public Compose overlay (`compose.nas.https.yaml` + `compose.nas.public.yaml`), preserve all environment files and persistent data, save a verified SQLite online backup plus delivery.key, and keep the previous image tagged before replacing only `web`. Never copy the isolated preview data to NAS.

### Verified deployment result

- NAS backup: `backups/premium-20261105T081031Z` (SQLite integrity check passed, delivery key retained).
- Previous image: `bbp-center-nas:before-premium`.
- Updated web container healthy; HTTPS/ngrok and existing farm/tunnel containers remain running.
- `/api/health` returned 200 with payments enabled; `/api/auth/providers` returned 200 with Google and Discord enabled.
- Public site checked after deployment: new home, light/dark themes, catalog, item detail and login. Actual category/product image frames measured 294.25 x 294.25 px with all images loaded. Both OAuth buttons enabled; no browser errors observed.
