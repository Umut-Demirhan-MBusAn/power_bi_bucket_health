export const meta = {
  name: 'adversarial-review',
  description:
    'Multi-dimension review of a diff/branch; blocker and major findings must survive a skeptic before being reported as confirmed',
  whenToUse:
    'Owner-triggered only (never a pipeline step or a default post-change step): a second opinion on a risky branch when one code-reviewer pass is not enough',
  phases: [
    { title: 'Scope', detail: 'resolve the target diff and its file list' },
    { title: 'Review', detail: 'one agent per dimension the diff can touch' },
    { title: 'Verify', detail: 'one skeptic per blocker/major finding' },
  ],
};

// args: { target?: string } — a ref/range for `git diff` (default: origin/main...HEAD)
const target = (args && args.target) || 'origin/main...HEAD';

// Every agent() names its model and effort: an omitted one inherits the session's, which is the
// expensive tier. Review is Opus at high; scoping and refutation are mechanical Sonnet work.
const REVIEW_MODEL = 'opus';
const REVIEW_EFFORT = 'high';
const MECHANICAL_MODEL = 'sonnet';

// Worst case with every dimension relevant: 1 scope + 5 reviewers + 5 × 4 skeptics = 26 agents.
const MAX_FINDINGS_PER_DIMENSION = 4;
const SEVERITY_ORDER = ['blocker', 'major', 'minor'];
const VERIFIED_SEVERITIES = ['blocker', 'major'];

const SCOPE_SCHEMA = {
  type: 'object',
  properties: {
    files: { type: 'array', items: { type: 'string' } },
    overview: { type: 'string' },
  },
  required: ['files', 'overview'],
};

const FINDINGS_SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          line: { type: 'number' },
          title: { type: 'string' },
          detail: { type: 'string' },
          severity: { type: 'string', enum: SEVERITY_ORDER },
        },
        required: ['file', 'title', 'detail', 'severity'],
      },
    },
  },
  required: ['findings'],
};

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    refuted: { type: 'boolean' },
    reasoning: { type: 'string' },
  },
  required: ['refuted', 'reasoning'],
};

const DOC_FILE = /(^docs\/|\.md$)/;
const CODE_FILE = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const TEST_FILE = /(\.test\.|^test\/)/;
const HOST_SURFACE = [
  /^capabilities\.json$/,
  /^pbiviz\.json$/,
  /^src\//,
  /^package(-lock)?\.json$/,
  /secret/i,
  /(^|\/)\.env/,
  /^\.github\/workflows\//,
  /^\.claude\/(hooks|settings)/,
  /^scripts\/git-guard/,
];
const A11Y_SURFACE = [/^src\/visual\.ts$/, /^src\/rendering\//, /^style\//, /^src\/settings\.ts$/];

// A dimension runs only when the diff holds a file it could find something in. Relevance is plain
// code over the scope's file list, never a judgement left to the reviewer.
const DIMENSIONS = [
  {
    key: 'correctness',
    relevant: (files) => files.some((f) => !DOC_FILE.test(f)),
    prompt:
      'Review ONLY for correctness bugs: logic errors, broken edge cases, race conditions, wrong data flow, regressions against existing behavior. Read the surrounding code, not just the diff.',
  },
  {
    key: 'host-contract',
    relevant: (files) => files.some((f) => HOST_SURFACE.some((re) => re.test(f))),
    prompt:
      'Review ONLY for Power BI host-contract and security breaks: a non-empty `privileges` list in capabilities.json; network, storage or export behaviour; innerHTML / outerHTML / insertAdjacentHTML or any other string-to-DOM path; secrets in code; a changed pbiviz.json guid or a renamed, removed or retyped data role; drift between capabilities.json, src/settings.ts and docs/VISUAL_CONTRACT.md / docs/SPEC.md.',
  },
  {
    key: 'accessibility',
    relevant: (files) => files.some((f) => A11Y_SURFACE.some((re) => re.test(f))),
    prompt:
      'Review ONLY accessibility: keyboard reach and order (arrow keys, Enter/Space, focus visibility), ARIA roles and labels on the SVG and cards, contrast at least 3:1 for non-text and 4.5:1 for text, reduced motion where the Alarm motion setting says Auto, and high-contrast mode through the host colorPalette.',
  },
  {
    key: 'conventions',
    relevant: (files) => files.some((f) => /^(src|test)\//.test(f) && !DOC_FILE.test(f)),
    prompt:
      'Review ONLY for AGENTS.md convention violations: `any`, renderers reading raw host objects instead of the typed model built in src/data/, hand-edited generated files (assets/icon.png), a capabilities or formatting change without its docs/VISUAL_CONTRACT.md and docs/SPEC.md update, comment-style violations (change-history narration, issue numbers as the reason).',
  },
  {
    key: 'tests',
    relevant: (files) => files.some((f) => CODE_FILE.test(f) && !TEST_FILE.test(f)),
    prompt:
      'Review ONLY test adequacy: changed behavior without new/updated node:test coverage (jsdom, host double test/helpers/mockHost.js), tests that assert nothing, edge cases the diff introduces but never exercises.',
  },
];

const bySeverity = (a, b) =>
  SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity);

phase('Scope');
const scope = await agent(
  `Run \`git diff --name-only ${target}\` and \`git diff --stat ${target}\`. Return \`files\`: every changed path exactly as git prints it (forward slashes, repo-relative), and \`overview\`: the stat block followed by one line per file saying what changed in it (max 60 lines). An empty diff returns an empty \`files\` list.`,
  { label: 'scope', phase: 'Scope', model: MECHANICAL_MODEL, effort: 'low', schema: SCOPE_SCHEMA }
);
if (!scope || scope.files.length === 0) {
  return { target, confirmed: [], unverified: [], note: 'empty diff — nothing to review' };
}

const active = DIMENSIONS.filter((d) => d.relevant(scope.files));
const skipped = DIMENSIONS.filter((d) => !active.includes(d)).map((d) => d.key);
if (skipped.length) log(`skipped (no file in the diff it could apply to): ${skipped.join(', ')}`);

const perDimension = await pipeline(
  active,
  (d) =>
    agent(
      `You are reviewing the diff \`${target}\` in this repo (run \`git diff ${target}\` yourself). Diff overview:\n${scope.overview}\n\n${d.prompt}\n\nReport at most ${MAX_FINDINGS_PER_DIMENSION} findings, most severe first, each anchored to a file and explained concretely. No style nitpicks outside your dimension. An empty findings list is a valid, good answer.`,
      {
        label: `review:${d.key}`,
        phase: 'Review',
        model: REVIEW_MODEL,
        effort: REVIEW_EFFORT,
        schema: FINDINGS_SCHEMA,
      }
    ),
  (review, d) => {
    const all = (review ? review.findings : []).slice().sort(bySeverity);
    const kept = all.slice(0, MAX_FINDINGS_PER_DIMENSION);
    if (all.length > kept.length) {
      log(`${d.key}: ${all.length - kept.length} lower-severity finding(s) dropped over the cap`);
    }
    return parallel(
      kept.map((f) => () => {
        const finding = { ...f, dimension: d.key };
        if (!VERIFIED_SEVERITIES.includes(f.severity)) {
          return Promise.resolve({ finding, status: 'unverified' });
        }
        return agent(
          `Adversarially verify this ${d.key} review finding on diff \`${target}\`. Try to REFUTE it by reading the actual code: is it real, reachable, and correctly described?\n\nFinding: [${f.severity}] ${f.file}${f.line ? ':' + f.line : ''} — ${f.title}\n${f.detail}\n\nDefault to refuted=true if you cannot confirm it from the code.`,
          {
            label: `verify:${d.key}:${f.file}`,
            phase: 'Verify',
            model: MECHANICAL_MODEL,
            effort: 'medium',
            schema: VERDICT_SCHEMA,
          }
        ).then((verdict) => {
          if (!verdict) return { finding, status: 'unverified' };
          return {
            finding: { ...finding, skeptic: verdict.reasoning },
            status: verdict.refuted ? 'refuted' : 'confirmed',
          };
        });
      })
    );
  }
);

const outcomes = perDimension.flat().filter(Boolean);
const pick = (status) =>
  outcomes
    .filter((o) => o.status === status)
    .map((o) => o.finding)
    .sort(bySeverity);
const confirmed = pick('confirmed');
const unverified = pick('unverified');
const refuted = pick('refuted').length;

log(
  `${confirmed.length} confirmed, ${unverified.length} unverified (minor, or the skeptic failed), ${refuted} refuted`
);
return { target, ran: active.map((d) => d.key), skipped, confirmed, unverified, refuted };
