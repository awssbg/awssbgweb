# Original homepage preservation manifest

This directory is an exact source backup captured before the temporary Doomsday
homepage edition was mounted. It is not part of the allow-listed production build.

| File | SHA-256 |
| --- | --- |
| `index.html` | `C15408E76221ADBCA48FA623C88CC745C0210DF9479B60F6B3ABE5C4F45AAD2D` |
| `styles.css` | `38AB957D5501B19EDCBBFE16083CC7F3B3A8B8D7CD79A82E0F9AAF8BEFF559D8` |
| `app.js` | `66C5E344C3ED1ABD37B07D86BC73446A269A14F373C33916F4FE0EB9BEAF570E` |

The `assets/` directory is included in full because it contains the logo and team
images consumed by the homepage. This snapshot predates Phase 2, so its
`index.html` still contains the then-active launch-mask mount. The automatic
restoration target is the live homepage source with `doomsday-homepage.js` inactive;
do not wholesale-copy this historical `index.html` when retiring the edition.

For manual retirement, remove the `doomsday-homepage.js` mount and its allow-list
entry. The backup remains an immutable source-and-asset recovery record.
