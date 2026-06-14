# QA Cross-Device Matrix — SUBSTRATE

Generated 2026-06-14T17:53:19.661Z · preview `http://localhost:4184` (strict port 4184).
Widths: 320, 768, 1440, 3840. Slugs: `/`, `/chip`, `/device`, `/network`, `/data`, `/about`.

**Result: ✅ PASS** — 0 error(s), 0 overflow failure(s).

Overflow rule: `document.documentElement.scrollWidth <= window.innerWidth + 2`.

## Width matrix (route `/`)

| Width | Errors | scrollWidth | innerWidth | Overflow |
|---|---|---|---|---|
| 320 | 0 | 320 | 320 | ✅ none |
| 768 | 0 | 768 | 768 | ✅ none |
| 1440 | 0 | 1440 | 1440 | ✅ none |
| 3840 | 0 | 3840 | 3840 | ✅ none |

## Deep-link slugs (1440×900)

| Slug | Errors | scrollWidth | Overflow |
|---|---|---|---|
| `/` | 0 | 1440 | ✅ none |
| `/chip` | 0 | 1440 | ✅ none |
| `/device` | 0 | 1440 | ✅ none |
| `/network` | 0 | 1440 | ✅ none |
| `/data` | 0 | 1440 | ✅ none |
| `/about` | 0 | 1440 | ✅ none |

## Errors

_None — zero console / pageerror / requestfailed across all widths and slugs._
