# Power BI Certification & AppSource Readiness

Goal: list the **BucketHealth** visual on Microsoft AppSource and earn the **Certified** badge.
Sourced from the official Microsoft requirements (reviewed 2026-06-23):

- [Get your Power BI visuals certified](https://learn.microsoft.com/en-us/power-bi/developer/visuals/power-bi-custom-visuals-certified)
- [Guidelines for publishing Power BI custom visuals](https://learn.microsoft.com/en-us/power-bi/developer/visuals/guidelines-powerbi-visuals)
- [Power BI visuals additional certification policies (1200.x)](https://learn.microsoft.com/en-us/legal/marketplace/certification-policies#1200-power-bi-visuals-additional-certification)

## Two tracks

1. **List on AppSource** — submit through Partner Center so the visual is discoverable/installable.
2. **Certify** (optional, separate request) — Microsoft reviews the source to confirm it accesses no
   external resources. Certified visuals can export to PowerPoint/PDF, appear in email subscriptions,
   and run where tenants enforce "certified visuals only."

Certification requires the visual to be (or be in the process of being) published on AppSource first.

## Hard certification requirements — current status

| Requirement | Status | Notes |
| --- | --- | --- |
| Not an R-visual | ✅ | TypeScript visual. |
| No external services/resources (no HTTP/S, WebSocket) | ✅ | No network calls; only the SVG XML namespace URI. |
| `WebAccess` privileges empty/omitted | ✅ | `capabilities.json` → `"privileges": []`. |
| No `XMLHttpRequest` / `fetch` | ✅ | None in `src/`. |
| No `innerHTML` / `D3.html(user data)` | ✅ | DOM built with `createElement` + `textContent` (auto-escaped). |
| No `eval` / `Function` / unsafe timers on user input | ✅ | `setInterval`/`setTimeout` use fixed callbacks (alarm audio), not user data. |
| No console errors/exceptions for any input | ✅ (code) ⚠️ (verify) | `update()` is wrapped in try/catch with an error state. Verify across edge data in Desktop. |
| No minified source | ✅ | Source is plain TS; `pbiviz` bundles. |
| Public, reviewable OSS deps only | ✅ | `powerbi-visuals-api`, `powerbi-visuals-utils-formattingmodel`. (d3 removed.) |
| Supports the Rendering Events API | ✅ | `events.renderingStarted/Finished/Failed`. |
| Required files present (capabilities/pbiviz/package/package-lock/tsconfig) | ✅ | All present. |
| `.gitignore` ignores `node_modules`, `.tmp`, `dist` | ✅ | Confirmed. |
| `package.json` has typescript + eslint + eslint-plugin-powerbi-visuals | ✅ | All present. |
| `package.json` lint command is exactly `npx eslint . --ext .js,.jsx,.ts,.tsx` | ✅ | Fixed in the `eslint` script. |
| `npm audit` → no high/moderate | ✅ | 0 vulnerabilities. |
| `pbiviz package --certification-audit` clean | ✅ | No unsafe calls flagged. |
| ESLint (powerbi-visuals config) → no errors | ✅ | `npm run eslint` exits 0. |
| Use the **latest** API + powerbi-visuals-tools | ⚠️ verify | Currently API `5.11.0`, tools `7.1.0`. Check npm for newer and bump before submitting. |
| GitHub branch named `certification` matching the submitted package | ❌ TODO | Create at submission time (see below). |

**Bottom line:** the code already satisfies the safety/structure rules that are the core of certification.
The remaining hard items are paperwork/process (cert branch, possibly an API bump), not code rewrites.

## Recommended quality features (the "full on" list)

These are *recommended* (and listed in the submission description), not hard gates — but they make a
complete, professional visual. Status and risk:

| Feature | Status | Risk to implement | Needs Desktop to verify |
| --- | --- | --- | --- |
| Alarm motion respects accessibility | ✅ Done | low | yes (visual check) |
| Context menu (right-click) | ❌ TODO | medium | yes |
| Selection / cross-filtering | ❌ TODO | medium-high (DataView identities) | yes |
| Keyboard navigation + focus | ❌ TODO | medium | yes |
| High-contrast mode | ❌ TODO | medium (cross-cutting colors) | yes |
| Landing page (no-data guidance) | ◐ Partial | low | yes |
| Report-page tooltips (official API) | ◐ N/A by choice | — | — |

Notes:
- **Selection/keyboard/context menu/high contrast cannot be verified here** (no Power BI Desktop in
  this environment). They will be implemented against the documented host APIs and must be smoke-tested
  in the Developer Visual before being considered done.
- **Report-page tooltips:** we intentionally ship a custom themed HTML tooltip. That is certification-
  safe. The official tooltip API would additionally enable report-page tooltips; it can be added later
  without removing the custom design.

## Alarm flashing vs. accessibility — resolved (no compromise)

Flashing alarms and accessibility were reconciled with a single **Alarm motion** formatting setting:

- **Always flash** (default) — flashes regardless of the OS reduced-motion setting. Keeps the current
  control-room behavior.
- **Auto** — flashes, but honors the OS `prefers-reduced-motion` setting (shows a **solid**, still-
  prominent alarm when reduced motion is requested).
- **Never** — always solid (non-flashing) but still prominent.

The alarm is never hidden or silenced in any mode — only the animation changes. This satisfies
accessibility review while preserving the flashing feature.

> If you tested earlier and "nothing flashed," your machine likely has Windows animation effects
> turned off. With the default **Always flash**, it now flashes regardless. Choose **Auto** if you
> want it to defer to the system setting.

## What only YOU can do (action checklist)

### 1. Partner Center account
Register at **partner.microsoft.com** and create a Marketplace/commercial-marketplace account. This is
required to submit any AppSource offer.

### 2. Confirm the GitHub repo + fix the URL
`package.json` `repository.url` points to `github.com/demirhanayhan/power_bi_bucket_health`, but the
push remote is `github.com/Umut-Demirhan-MBusAn/power_bi_bucket_health`. Decide which account is
canonical for publishing and make `package.json`, the remote, and the Partner Center submission all
agree. The repo must contain **only this one visual**.

### 3. Marketing/submission assets (required for AppSource)
- Visual **icon** (have `assets/icon.png` — confirm it meets size specs)
- **5+ screenshots** of the visual in a report
- A **sample `.pbix`** report demonstrating the visual (you'll build this in Desktop with the fixture)
- **Description** that lists supported features (mention high contrast, tooltips, drill where applicable)
- **Privacy policy URL** (required)
- **Support URL / contact**
- **EULA** (or use the standard marketplace terms)
- Optional but recommended: a short screen-recording demo

### 4. Publish to AppSource
Follow Partner Center → create a "Power BI visual" offer → upload the `.pbiviz` from `dist/` → fill in
the assets above → submit. New visuals appear on AppSource within hours and reach Desktop/Service in
~10–14 days.

### 5. Create the `certification` branch
When the submitted package is final, create a branch named **`certification`** (lowercase) whose code
matches the submitted `.pbiviz` exactly:
```
git checkout main
git pull
git checkout -b certification
git push -u origin certification
```
Only update this branch on your next submission.

### 6. Request certification + provide source access
In Partner Center → your visual → **Product setup** → check **Request Power BI certification** →
on **Review and publish**, in **Notes for certification**, paste the link to the `certification` branch.
- **Public repo:** just provide the link.
- **Private repo:** create a dedicated account, enable 2FA, generate recovery codes, and grant
  **read-only** access to **`pbicvsupport`** (github.com/pbicvsupport); include the link, credentials,
  and recovery codes in the notes.

### 7. Timeline
AppSource listing: hours; production rollout: ~10–14 days. Certification badge: ~3 weeks after approval.

## Verification commands (run before every submission)
```
npm install
npm audit                       # must be free of high/moderate
npm run eslint                  # must be 0 errors
pbiviz package --certification-audit   # must report no unsafe calls
pbiviz package                  # must build the .pbiviz cleanly
npm test                        # unit tests
```

## Suggested order of remaining engineering work
1. **High contrast** + finalize **landing page** (low risk).
2. **Context menu** (small, expected by the guidelines).
3. **Selection / cross-filtering** (largest — needs DataView identities; reconcile with click-to-dismiss-audio).
4. **Keyboard navigation** + focus indicators + ARIA.
5. Smoke-test all of the above in the Power BI Developer Visual, build the sample `.pbix`, then submit.
