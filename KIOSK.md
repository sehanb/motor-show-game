# SLIC General Interactive Showroom

Open `kioskdisplay.html` directly, for example `https://your-domain/MotorFest/kioskdisplay.html`. The page is intentionally absent from the existing website's navigation. It uses static HTML, CSS and JavaScript and needs no build, database, API or server runtime. Existing IIS WebP/font mappings work unchanged.

## Files

- `kioskdisplay.html`: standalone shell and cinematic welcome screen.
- `assets/kioskdisplay.css`: base portrait showroom styling.
- `assets/kiosk-theme.css`: bright teal, coral, blue and gold theme with Sinhala typography.
- `assets/kiosk-i18n.js`: 305 matching translation keys per language, including dynamic screens, dialogs and accessibility labels.
- `assets/fonts/NotoSansSinhala.ttf`: locally hosted Sinhala font; its SIL OFL license is alongside it.
- `assets/KIOSK-VISUAL-NOTES.md`: generated portrait artwork, exact prompt, resolution and translation-review notes.
- `assets/kioskdisplay.js`: navigation, discovery guide, services, learning cards, QR generation and inactivity handling.
- `assets/kiosk-products.js`: isolated product summaries, image references and official source URLs. Update these summaries when official product information changes. Keeping this separate avoids importing the marketing site's navigation or game code.
- Existing logo, WebP campaign images, local fonts and local QR library are reused.

## Touchscreen operation

The welcome screen leads to the eight-product showroom, Why SLIC General and Our Services. The product gallery has four cards per page; swipe up/down or left/right, or use the arrow controls to see the other four. Product details include Previous, Next and Back to Products. The floating Home control and Back control are available throughout internal screens.

Find Your Motor Protection offers five vehicle types and relevant products to explore. It is explicitly a discovery guide, not a personal recommendation or quotation. Car results include Motor Plus, Ladies Only, Pinnacle and Drive 60 with an eligibility reminder.

Did You Know and Safe Driving Tips are accessible from Why SLIC General. Swipe learning cards horizontally, touch a dot, or use the arrows. The keyboard also supports arrows and Escape; native focus styles and reduced-motion preferences are respected.

Long product content has a dedicated benefits/eligibility scroll panel. The outer showroom stays within the viewport. The design targets 1080×1920 and 2160×3840 portrait screens, with responsive tablet layouts. Browser or device kiosk mode can hide the browser chrome independently of the static application.

## Configuration

The existing `window.SLIC_CONFIG` object retains its game settings. Two isolated showroom settings were appended in `assets/config.js`:

```js
window.SLIC_CONFIG.kioskIdleTimeoutSeconds = 60;
window.SLIC_CONFIG.kioskProductUrls = {};
```

Valid positive timeout values are interpreted as seconds. Missing or invalid values fall back to 60 seconds. Touch/pointer, keyboard, wheel and scrolling activity reset the idle clock. An active held touch prevents an idle interruption. Inactivity closes information panels and returns to Welcome, where the automotive background and promotional captions remain gently animated. Product and guide choices remain temporary. The language preference is the only stored kiosk setting, as described below.

Product QR codes default to the corresponding official SLIC product page, **not** the game or registration route. Override individual destinations with absolute HTTP(S) URLs or paths relative to the kiosk page:

```js
window.SLIC_CONFIG.kioskProductUrls = {
  'motor-ev': 'https://your-domain/MotorFest/products/motor-ev.html'
};
```

Supported keys: `motor-plus`, `motor-ev`, `rider`, `tuk`, `commercial`, `ladies-only`, `pinnacle`, `drive-60`. Invalid URL schemes fall back to the official destination. QR branding remains outside the code for reliable scanning.

Optional `window.SLIC_CONFIG.kioskServiceUrls` can override service QR URLs by zero-based service index: claims, accident/breakdown guidance, enquiries, branches, motor guidance, online policy services. All default destinations are official SLIC pages.

## Content provenance

Product summaries checked against the following official sources on 12 November 2026:

- [Motor Plus](https://www.slicgeneral.com/en/personal/motor-insurance/motor-plus)
- [Motor EV](https://www.slicgeneral.com/en/personal/motor-insurance/motor-ev)
- [Motor Plus RIDER](https://www.slicgeneral.com/en/personal/motor-insurance/motor-plus-rider)
- [Motor Plus TUK](https://www.slicgeneral.com/en/personal/motor-insurance/motor-plus-tuk)
- [Motor Plus Commercial](https://www.slicgeneral.com/en/business/motor-insurance/motor-plus-commercial-vehicle)
- [Motor Plus Ladies Only](https://www.slicgeneral.com/en/personal/motor-insurance/motor-plus-ladies-only)
- [Motor Plus Pinnacle](https://www.slicgeneral.com/en/personal/motor-insurance/motor-plus-pinnacle)
- [Motor Plus Drive 60](https://www.slicgeneral.com/en/personal/motor-insurance/motor-plus-drive-60)
- [Company information and official hotline](https://www.slicgeneral.com/en)
- [Official branch directory](https://www.slicgeneral.com/en/branches)
- [Official customer portal](https://www.slicgeneral.lk/)

Safety reminders paraphrase [World Health Organization road-traffic safety guidance](https://www.who.int/news-room/fact-sheets/detail/road-traffic-injuries), without numerical risk claims. Policy terms, conditions, limits, schedule, eligibility and exclusions remain controlling. No rankings, awards, unsupported guarantees or service-dispatch availability are claimed.

## Privacy and preservation

The kiosk has no registration forms, visitor inputs or customer-data submission. Its only localStorage key is `slic_motorfest_kiosk_language`, containing `en` or `si`; existing player records are neither read nor changed. Talk to Our Team is an information panel displaying the official company hotline and an invitation to speak to an exhibition assistant. Product selection is kept only in temporary page state.

No existing desktop/mobile navigation, game, prize-wheel, registration or Hall of Fame assets were changed. Only the kiosk configuration fields were added to the shared configuration object. Existing player storage keys are neither read nor modified.

## Verification

Headless Chromium checks cover the four portrait sizes above, all eight product detail screens, all five guide choices, six service dialogs, product QR overrides, gallery swipes, learning cards, Back/Home controls, the 60-second idle reset and a customized timeout. Isolated test-player records remain intact with only the isolated language-preference write permitted. Hash checks confirm existing application files remain unchanged. Test utilities and screenshots live in the ignored `.preview/` directory and are not runtime dependencies.

## English and Sinhala

Use EN / සිං in the header or an open dialog to switch immediately without reloading. The current screen, product scroll position, open dialog and QR destination are preserved. All kiosk UI and content use the central dictionary; official product names remain in English. No external translation service is called.

The default `data-retain-language="false"` on the kiosk body starts each new page session in English and returns to English on the existing idle reset. To intentionally retain the saved preference across sessions, change this kiosk-only attribute to `"true"`. Shared game configuration remains unchanged by this redesign.

Sinhala text is a draft requiring professional Sinhala and insurance-content review before production. The conceptual SLIC-branded Colombo building is disclosed on the welcome screen; it is not a photograph of the actual headquarters. See `assets/KIOSK-VISUAL-NOTES.md` for the image prompt and native versus resampled resolutions.

Bilingual verification covers all 29 route states at 1080 x 1920, representative routes at 2160 x 3840, 768 x 1024 and 600 x 960, service-dialog switching, QR invariance, language defaults and retention, the 60-second idle reset, and protected application hashes.
