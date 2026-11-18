# SLIC Motor Fest 2026

A static HTML5 campaign and mobile driving challenge. No application build or backend is required. Serve this folder with an HTTP server; `index.html` is the campaign and `motorshow2026.html` is the mobile game (served at `/motorshow2026/`).

## QR and hosting

On a hosted site, QR codes automatically open `/motorshow2026/` on the current origin. An optional **permanent** game URL can be set in [assets/config.js](assets/config.js). Temporary tunnel URLs do not belong in deployment source.

For this machine's local preview, the ignored `assets/preview.local.json` supplies the active public origin so QR scanning works when the campaign is opened on localhost. The tunnel and local server must remain running. This preview file and the `.preview/` tools are excluded from Git and are not needed for IIS hosting.

`web.config` adds WebP and TrueType MIME mappings for IIS. All images, fonts, and the QR library are served locally. Fonts and QR code license notices are included in their asset directories.

## Competition and privacy

The existing 30-second timing, steering, spawning, collisions, and scoring mechanics are preserved. The results screen saves a finished drive immediately and shows the current rank and leading scores. There is no prize wheel or Facebook follow gate.

Registration requires a name and Sri Lankan mobile number (`07XXXXXXXX`, `947XXXXXXXX`, or `+947XXXXXXXX`). Entries remain in that browser's local storage. Mobile numbers are never rendered in standings. Existing scores under `slic_motorfest_2026_board` are retained.

The campaign and game show the **device's** top 10 recorded drives. They do not imply a live shared event leaderboard. Cross-device competition needs a separate backend integration. No demo scores are shipped.

All pictured gifts are proposed marketing concepts. They are labelled unconfirmed and do not promise a prize. Final rewards and competition rules require organiser approval. The campaign uses the approved alternative trust statement rather than an unverified No. 1 ranking claim.

## Content and images

Product summaries were checked against these official sources on 11 November 2026:

- [Motor Plus](https://www.slicgeneral.com/en/personal/motor-insurance/motor-plus)
- [Motor EV](https://www.slicgeneral.com/en/personal/motor-insurance/motor-ev)
- [Motor Plus RIDER](https://www.slicgeneral.com/en/personal/motor-insurance/motor-plus-rider)
- [Motor Plus TUK](https://www.slicgeneral.com/en/personal/motor-insurance/motor-plus-tuk)
- [Motor Plus Commercial Vehicle](https://www.slicgeneral.com/en/business/motor-insurance/motor-plus-commercial-vehicle)
- [Motor Plus Ladies Only](https://www.slicgeneral.com/en/personal/motor-insurance/motor-plus-ladies-only)
- [Motor Plus Pinnacle](https://www.slicgeneral.com/en/personal/motor-insurance/motor-plus-pinnacle)
- [Motor Plus Drive 60](https://www.slicgeneral.com/en/personal/motor-insurance/motor-plus-drive-60)

Policy documents, schedules, eligibility, limits, terms and exclusions govern the covers. Product pages and details panels link to the official information.

Eleven Sri Lankan campaign/reward scenes were created with the built-in image-generation tool and optimized into local WebP assets, with smaller mobile variants. See [image provenance and the final prompt set](assets/IMAGE-NOTES.md). The original SLIC logo is retained.

## Verification

Checked in headless Chromium at 1920×1080, 1440×900, 1024×768, 768×1024, 390×844 and 360×640. Checks include desktop hero bounds, horizontal overflow, mobile QR visibility and bottom navigation, product tabs/dialogs, eight product pages, claims help, QR forwarding, and a complete real-time game with registration validation and score persistence. Preview QA uses isolated browser storage and adds no records to visitors' leaderboards.
