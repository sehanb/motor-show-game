/* Optional permanent hosted game URL. Empty uses this site's origin.
   Local preview resolves forwarding through the dev server at runtime.
   Never put temporary tunnel addresses in this deployment configuration.

   allowMultipleGameAttempts (Testing Mode):
     true  → every visit to the game opens a fresh registration; the same mobile can play again.
     false → one attempt per mobile number in this browser (event mode). Missing/invalid = false. */
window.SLIC_CONFIG = { gameUrl: '', allowMultipleGameAttempts: true };

/* Standalone touchscreen showroom settings. URLs may be absolute or relative to kioskdisplay.html.
   Product keys: motor-plus, motor-ev, rider, tuk, commercial, ladies-only, pinnacle, drive-60. */
window.SLIC_CONFIG.kioskIdleTimeoutSeconds = 60;
window.SLIC_CONFIG.kioskProductUrls = {};
