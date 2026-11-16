# Kiosk visual and language assets

## Portrait artwork

Created with the built-in `image_gen` tool for this kiosk. The image depicts a **conceptual** SLIC-branded office building in an imagined Colombo setting, not the actual SLIC headquarters. The welcome screen discloses this in both languages. No official photograph of the actual building was present in the project assets.

Saved files:

- `images/kiosk-colombo-concept-master.png`: native generated source, 941 × 1672.
- `images/kiosk-colombo-concept.webp`: optimized native-size WebP.
- `images/kiosk-colombo-concept-small.webp`: 900-pixel-wide optimized version.
- `images/kiosk-colombo-concept-4k.webp`: 2160 × 3840 display derivative, resampled from the native source using Lanczos3. This is not a native 4K generation.

The composition keeps the illuminated architectural SLIC lettering and the SUV within the frame. Only the architectural SLIC signage is embedded in the image; all interface text is real HTML. Responsive preload/source selection avoids fetching both native and display versions unnecessarily.

### Final generation prompt

Use case: ads-marketing. Create a dedicated high-resolution 2160x3840 9:16 portrait photorealistic automotive campaign background for a SLIC General interactive insurance kiosk in Sri Lanka. Cinematic Colombo city at warm sunset blending into elegant early evening. Recognisable distant Colombo Lotus Tower, tropical palms, realistic illuminated contemporary Sri Lankan urban buildings, rich blue sky with soft warm gold clouds, tasteful turquoise-blue-gold reflections on wet polished roadway. A fully visible premium modern pearl-white SUV in the lower-middle foreground, front three-quarter angle, anatomically credible vehicle design, wheels and glass, NO vehicle cropping, whole vehicle within the image, ideally vehicle at 49-70 percent of image height. A prominent beautiful modern office building in upper-middle-right (about 25-43 percent of image height), with clearly legible elegant turquoise-white illuminated architectural letters exactly 'SLIC' attached naturally to its facade near the top. This building is a CONCEPTUAL SLIC-branded building, NOT a depiction of actual SLIC headquarters. No floating logos or oversized signage. Upper-left quarter has calm sky and soft distant skyline with generous clean negative space for real UI headlines to be overlaid later. Bottom 25 percent is a subtly lit road/plaza with no important subjects because interface buttons will sit over it. Premium, welcoming, bright but sophisticated, believable photographic architecture and lighting, restrained reflections, no heavy navy wash, no neon cyberpunk. Only text in the image is the small architectural 'SLIC' lettering. No other typography, captions, interface, signs, logos, watermarks, people or license-plate text. Portrait composition designed from scratch, not a crop of a landscape image.

## Sinhala typography and copy

`fonts/NotoSansSinhala.ttf` is locally hosted Noto Sans Sinhala with variable weights. Its SIL Open Font License is included at `fonts/NotoSansSinhala-LICENSE.txt`. No remote font or translation service is required at runtime.

The central English/Sinhala dictionary is `kiosk-i18n.js`, containing 305 matching translation keys per language. It covers visible interface text, product descriptions and benefits, eligibility, guide choices, services and dialogs, learning cards, QR instructions, idle captions and accessibility labels. Official product and brand names remain in English where appropriate and use explicit English language markup.

**Production review required:** the Sinhala copy is a prepared draft and has not been approved by an independent professional translator or Sinhala-speaking insurance reviewer. Obtain professional Sri Lankan Sinhala and product/compliance review before production use. Review the wording against the unchanged English source and original policy conditions, especially eligibility, monetary limits and working-hour qualifications. No external translation API or Google Translate was used.

New sessions default to English. Language selection is saved only under `slic_motorfest_kiosk_language`. Existing player records and settings are not accessed or changed. See `../KIOSK.md` for intentional retention and idle-session behaviour.

## User-supplied replacement backgrounds

The active desktop homepage now uses `images/colombo-desktop.webp` (1672 x 941), and the mobile homepage and kiosk welcome use `images/colombo-portrait.webp` (941 x 1672). Sources: user-supplied Rainy Waterfront Skyline with Illuminated Towers.png and Rainy Coastal Skyline at Dusk.png. Responsive 960px landscape and 480px portrait derivatives avoid sending full-size images to smaller displays. Encoded locally using Sharp WebP quality 80 (77 for small variants), metadata stripped, no enlargement. The earlier generated artwork is retained as an inactive source. The new cityscape remains conceptual imagery.
