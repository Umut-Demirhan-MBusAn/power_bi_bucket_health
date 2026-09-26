/* eslint-disable powerbi-visuals/non-literal-fs-path -- test-only I/O against the repo's own
   hook file and a mkdtemp()-generated temp dir, not the visual's runtime code. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.join(__dirname, "../..");
const HOOK = path.join(ROOT, ".claude", "hooks", "git-guard.mjs");
const libLoaded = import("../../scripts/git-guard.lib.mjs");

// [command, MESSAGES key] under the Bash tool's quoting rules.
const BLOCKED = [
    ["git push origin main", "pushMain"],
    ["git push origin master", "pushMain"],
    ["git push origin HEAD:main", "pushMain"],
    ["git push origin HEAD:master", "pushMain"],
    ["git push origin +main", "pushMain"],
    ["git push origin :main", "pushMain"],
    ["git push origin refs/heads/main", "pushMain"],
    ["git push origin HEAD:refs/heads/main", "pushMain"],
    ["git push origin main:main", "pushMain"],
    ["git push --force-with-lease origin main", "pushMain"],
    ["git push origin --delete main", "pushMain"],
    ["git push origin --delete master", "pushMain"],
    ["git push origin -d main", "pushMain"],
    ["git -C ../x push origin HEAD:main", "pushMain"],
    ["git -c core.hooksPath=/dev/null push origin main", "pushMain"],
    ["git --git-dir .git push origin main", "pushMain"],
    ["FOO=1 git push origin main", "pushMain"],
    ["npm test && git push origin main", "pushMain"],
    ["git status || git push origin main", "pushMain"],
    ["git status; git push origin main", "pushMain"],
    ["echo x | git push origin main", "pushMain"],
    ["git status\ngit push origin main", "pushMain"],
    ['echo "$(git push origin main)"', "pushMain"],
    ["echo `git push origin main`", "pushMain"],
    ['"git" push origin main', "pushMain"],
    ['"C:/Program Files/Git/cmd/git.exe" push origin main', "pushMain"],
    ["git push origin \\\nmain", "pushMain"],
    ["g\\it push origin main", "pushMain"],
    ["git push origin main>log", "pushMain"],
    ["git push origin main 2>&1 | tee log", "pushMain"],
    ["git -c alias.x=push x origin main", "pushMain"],
    ['git -c alias.p="push origin main" p', "pushMain"],

    ["git add -A", "addAll"],
    ["cd foo && git add -A", "addAll"],
    ["git add .", "addAll"],
    ["git add --all", "addAll"],
    ["git add -Av", "addAll"],
    ["git add :/", "addAll"],

    ["git stash", "stash"],
    ["git stash -u", "stash"],
    ["git stash pop", "stash"],
    ["git stash clear", "stash"],
    ["git stash save wip", "stash"],

    ["gh pr merge 12 --squash", "merge"],
    ["gh -R x/y pr merge 12", "merge"],
    ["gh --repo=x/y pr merge 12", "merge"],
    ["BUCKET_HEALTH_MERGE_OK=0 gh pr merge 12 --squash", "merge"],
    ["export BUCKET_HEALTH_MERGE_OK=1; gh pr merge 12 --squash", "merge"],
    ["BUCKET_HEALTH_MERGE_OK=1 git status && gh pr merge 12 --squash", "merge"],

    // wrappers
    ["timeout 60 git push origin main", "pushMain"],
    ["timeout -s KILL 5m git push origin main", "pushMain"],
    ["env -i PATH=/usr/bin git push origin main", "pushMain"],
    ["sudo -u me git push origin main", "pushMain"],
    ["command git push origin main", "pushMain"],
    ["exec git push origin main", "pushMain"],
    ["nohup git push origin main", "pushMain"],
    ["nice -n 10 git push origin main", "pushMain"],
    ["time git push origin main", "pushMain"],
    ["stdbuf -oL git push origin main", "pushMain"],
    ["setsid git push origin main", "pushMain"],
    ["echo x | xargs -n1 git add -A", "addAll"],
    ['eval "git push origin main"', "pushMain"],
    ['bash -c "git push origin main"', "pushMain"],
    ['bash -lc "git add -A"', "addAll"],
    ["sh -c 'git stash'", "stash"],
    ['pwsh -Command "git push origin main"', "pushMain"],
    ['pwsh -c "git stash pop"', "stash"],
    ['cmd /c "git push origin main"', "pushMain"],
    ['cmd.exe /C "git stash"', "stash"],
    ['cmd //c "git add -A"', "addAll"],
    ['cmd /d /s /c "C:\\tools\\git.exe push origin main"', "pushMain"],
    ['cat <<< "hello"\ngit push origin main', "pushMain"],
    ["if true; then git push origin main; fi", "pushMain"],
    ["if git push origin main; then echo ok; fi", "pushMain"],
    ["while git stash pop; do sleep 1; done", "stash"],
    ["{ git push origin main; }", "pushMain"],
    ["! git push origin main", "pushMain"],
];

const ALLOWED = [
    "git push -u origin feat/x",
    "git push origin HEAD",
    "git push --force-with-lease origin HEAD",
    "git push --force origin feat/x",
    "git push origin feat/maintenance",
    "git push origin fix/main-menu",
    "git push origin --delete feat/x",
    "git push origin feat/x 2>&1 | tee log",
    "git add src/a.ts src/b.ts",
    "git add -p src/a.ts",
    "git stash push -u -m my-tag",
    "git stash push -u",
    'git stash list --format="%H %gs"',
    "git stash apply abc1234",
    "git stash apply stash@{0}",
    "git stash drop stash@{0}",
    "git stash show -p",
    "git log --oneline -5",
    "git -C ../x status --short",
    'git commit -m "never git push origin main"',
    "git branch -d merged",
    "gh pr create --fill --base main",
    "gh pr view 1 --json state",
    "gh pr checks 1 --watch",
    "gh pr list --state merged",
    "gh -R x/y pr view 12",
    "BUCKET_HEALTH_MERGE_OK=1 gh pr merge 1 --squash --delete-branch",
    "env BUCKET_HEALTH_MERGE_OK=1 gh pr merge 1 --squash --delete-branch",
    'echo "git stash is shared across worktrees"',
    "# git push origin main is forbidden",
    "cat <<'EOF' > notes.md\ngit push origin main\n| `git stash` / `git stash pop` | blocked |\nEOF",
    "cat <<EOF\ngit add -A\nEOF",
    "node -e \"const cmds = [\n 'git push --force origin feat/x',\n 'git push origin main',\n];\nconsole.log(cmds.length)\"",
    "python -c \"print('git push origin main')\"",
    "gh pr comment 1 --body 'never run `git stash` or $(git push origin main) here'",
    "echo 'it''s `git push origin main`'",
    "npm test",
    "",
    "timeout 60 npm test",
    "env -i PATH=/usr/bin git status",
    'eval "git status"',
    "if true; then git status; fi",
    "{ git status; }",
    'bash -lc "git status"',
    'pwsh -Command "git status"',
    'cmd /c "git status"',
    "cmd /c dir",
    'cat <<< "git push origin main"',
    "git -c alias.st=status st",
    "git -c alias.x=push x -u origin feat/x",
];

// [command, MESSAGES key] under the PowerShell tool's quoting rules.
const PS_BLOCKED = [
    ["git push origin `\nmain", "pushMain"],
    ["g`it push origin main", "pushMain"],
    ["C:\\tools\\git.exe push origin main", "pushMain"],
    ['iex "git push origin main"', "pushMain"],
    ["Invoke-Expression 'git add -A'", "addAll"],
    ['Start-Process git -ArgumentList "push origin main" -Wait', "pushMain"],
    ["Start-Process -FilePath git -ArgumentList 'push','origin','main'", "pushMain"],
    ["wsl -d Ubuntu -e git push origin main", "pushMain"],
    ["if ($true) { git push origin main }", "pushMain"],
    ['foreach ($b in @("x")) { git stash }', "stash"],
    ["while (git push origin main) { break }", "pushMain"],
    ["if ($x) { git status } else { git push origin main }", "pushMain"],
    ["if ($a) { git status } elseif (git push origin main) { exit }", "pushMain"],
    ['Start-Process -NoNewWindow git -ArgumentList "push origin main"', "pushMain"],
    ['Write-Output "a`tb"; git add .', "addAll"],
    ["BUCKET_HEALTH_MERGE_OK=1 gh pr merge 1 --squash", "merge"],
    ["$env:BUCKET_HEALTH_MERGE_OK='1'; gh pr merge 1 --squash", "merge"],
    ["$r = gh pr merge 5 --squash --delete-branch", "merge"],
    ["$out = git push origin main 2>&1", "pushMain"],
    ["$null = git stash", "stash"],
    ["$x = git add -A", "addAll"],
    ["[void](git stash)", "stash"],
    ["@(git push origin main)", "pushMain"],
    ["$x=git push origin main", "pushMain"],
    ["$log += git stash pop", "stash"],
    ["[string[]]$lines = git push origin main", "pushMain"],
    ["$x = [string](git push origin main)", "pushMain"],
    ["[void] (git add .)", "addAll"],
    ["$script:out =git stash", "stash"],
    ['cmd /c "git push origin main"', "pushMain"],
];

const PS_ALLOWED = [
    'iex "git status"',
    'Start-Process git -ArgumentList "status" -Wait',
    "wsl -d Ubuntu -e git status",
    "if ($true) { git status }",
    "foreach ($f in Get-ChildItem) { Write-Output $f }",
    "C:\\tools\\git.exe status",
    "echo `git push origin main`",
    "git stash list",
    "$b = git branch --show-current",
    "$x = git stash list",
    "$out = git push origin feat/x 2>&1",
    "[void](git add src/a.ts)",
    "@(git log --oneline -5)",
    "$env:BUCKET_HEALTH_MERGE_OK='1'",
    '$msg = "git push origin main"',
];

for (const [command, key] of BLOCKED) {
    test(`git-guard blocks ${JSON.stringify(command)}`, async () => {
        const { evaluate, MESSAGES } = await libLoaded;
        assert.deepEqual(evaluate(command), { block: true, message: MESSAGES[key] });
    });
}

for (const command of ALLOWED) {
    test(`git-guard allows ${JSON.stringify(command)}`, async () => {
        const { evaluate } = await libLoaded;
        assert.deepEqual(evaluate(command), { block: false });
    });
}

for (const [command, key] of PS_BLOCKED) {
    test(`git-guard blocks the PowerShell form ${JSON.stringify(command)}`, async () => {
        const { evaluate, MESSAGES } = await libLoaded;
        assert.deepEqual(evaluate(command, { shell: "powershell" }), {
            block: true,
            message: MESSAGES[key],
        });
    });
}

for (const command of PS_ALLOWED) {
    test(`git-guard allows the PowerShell form ${JSON.stringify(command)}`, async () => {
        const { evaluate } = await libLoaded;
        assert.deepEqual(evaluate(command, { shell: "powershell" }), { block: false });
    });
}

test("git-guard reports the first offending segment of a chain", async () => {
    const { evaluate, MESSAGES } = await libLoaded;
    assert.equal(evaluate("git stash && git push origin main").message, MESSAGES.stash);
    assert.equal(evaluate("git add src/a.ts && git push origin main").message, MESSAGES.pushMain);
});

test("git-guard's merge message names the opt-in and the Bash tool", async () => {
    const { MESSAGES } = await libLoaded;
    assert.match(MESSAGES.merge, /BUCKET_HEALTH_MERGE_OK=1 gh pr merge <n> --squash --delete-branch/);
    assert.match(MESSAGES.merge, /through the Bash tool/);
});

function runHook(input, hookPath = HOOK) {
    return spawnSync(process.execPath, [hookPath], {
        input: typeof input === "string" ? input : JSON.stringify(input),
        encoding: "utf8",
    });
}

test("git-guard hook blocks a Bash payload with exit 2 and the reason on stderr", async () => {
    const { MESSAGES } = await libLoaded;
    const run = runHook({ tool_name: "Bash", tool_input: { command: "git push origin main" } });
    assert.equal(run.status, 2);
    assert.equal(run.stderr.trim(), MESSAGES.pushMain);
});

test("git-guard hook evaluates a PowerShell payload", async () => {
    const { MESSAGES } = await libLoaded;
    const run = runHook({ tool_name: "PowerShell", tool_input: { command: "git add -A" } });
    assert.equal(run.status, 2);
    assert.equal(run.stderr.trim(), MESSAGES.addAll);
});

test("git-guard hook parses a PowerShell payload with PowerShell escaping", () => {
    const command = 'Write-Output "`git push origin main`"';
    assert.equal(runHook({ tool_name: "PowerShell", tool_input: { command } }).status, 0);
    assert.equal(runHook({ tool_name: "Bash", tool_input: { command } }).status, 2);
});

test("git-guard hook allows a harmless command with exit 0", () => {
    const run = runHook({ tool_name: "Bash", tool_input: { command: "git status" } });
    assert.equal(run.status, 0, run.stderr);
});

test("git-guard hook fails closed with exit 2 on input that is not JSON", () => {
    const run = runHook("{not json");
    assert.equal(run.status, 2);
    assert.match(run.stderr, /git-guard: could not parse the tool input/);
});

for (const payload of [
    { tool_name: "Bash", tool_input: {} },
    { tool_name: "Bash", tool_input: { command: 7 } },
]) {
    test(`git-guard hook fails closed with exit 2 without a command string: ${JSON.stringify(payload)}`, () => {
        const run = runHook(payload);
        assert.equal(run.status, 2);
        assert.match(run.stderr, /git-guard: the tool input has no command string/);
    });
}

// The settings tests run the shipped rules through this model of Claude Code's matcher, not
// through Claude Code itself: a legacy trailing `:*` matches the prefix itself or the prefix
// followed by a space (a word boundary); any other `*` matches any run of characters,
// case-sensitively.
function ruleMatches(rule, command) {
    if (rule.endsWith(":*")) {
        const prefix = rule.slice(0, -2);
        return command === prefix || command.startsWith(`${prefix} `);
    }
    const source = rule
        .split("*")
        .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join(".*");
    return new RegExp(`^${source}$`, "s").test(command);
}

// Gitignore-style path glob, as Claude Code reads a Read() rule.
function pathMatches(glob, file) {
    const source = glob
        .replace(/^\.\//, "")
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\*\*\//g, "\u0000")
        .replace(/\*/g, "[^/]*")
        .replaceAll("\u0000", "(?:.*/)?");
    return new RegExp(`^${source}$`).test(file);
}

function loadSettings() {
    return JSON.parse(fs.readFileSync(path.join(ROOT, ".claude", "settings.json"), "utf8"));
}

function bashRules(list, prefix) {
    return list
        .filter((rule) => rule.startsWith("Bash("))
        .map((rule) => rule.slice(5, -1))
        .filter((rule) => rule.startsWith(prefix));
}

test("settings: git-guard runs for both the Bash and the PowerShell tool", () => {
    const matchers = loadSettings()
        .hooks.PreToolUse.filter((entry) => entry.hooks.some((h) => h.command.includes("git-guard.mjs")))
        .map((entry) => entry.matcher);
    assert.deepEqual(matchers, ["Bash|PowerShell"]);
});

test("settings: the git-guard hook command fails closed when node or the hook file is missing", () => {
    const commands = loadSettings()
        .hooks.PreToolUse.flatMap((entry) => entry.hooks)
        .filter((h) => h.command.includes("git-guard.mjs"))
        .map((h) => h.command);
    assert.deepEqual(commands, ['node "$CLAUDE_PROJECT_DIR/.claude/hooks/git-guard.mjs" || exit 2']);
});

test("settings: the graphify hooks stay wired for Bash and Read|Glob", () => {
    const matchers = loadSettings()
        .hooks.PreToolUse.filter((entry) => entry.hooks.some((h) => h.command.includes("graphify-out/graph.json")))
        .map((entry) => entry.matcher);
    assert.deepEqual(matchers, ["Bash", "Read|Glob"]);
});

for (const command of [
    "git branch -D feat/x",
    "git branch --force feat/x origin/main",
    "git branch -f main origin/feat/x",
    "git branch -a -D feat/x",
    "git switch --discard-changes main",
    "git switch -f main",
    "git switch feat/x --discard-changes",
    "git switch --force-create feat/x",
]) {
    test(`settings: asks before ${JSON.stringify(command)}`, () => {
        const { ask } = loadSettings().permissions;
        assert.ok(bashRules(ask, "git ").some((rule) => ruleMatches(rule, command)));
    });
}

for (const command of [
    "git branch",
    "git branch -d merged",
    "git branch --show-current",
    "git switch -c feat/x",
    "git status --short",
    "git worktree list",
]) {
    test(`settings: allows ${JSON.stringify(command)} without asking`, () => {
        const { allow, ask } = loadSettings().permissions;
        assert.equal(bashRules(ask, "git ").some((rule) => ruleMatches(rule, command)), false);
        assert.ok(bashRules(allow, "git ").some((rule) => ruleMatches(rule, command)));
    });
}

for (const command of ["git add -A", "git add .", "git push origin main", "git push --force origin feat/x", "git push -f origin feat/x"]) {
    test(`settings: denies ${JSON.stringify(command)}`, () => {
        const { deny } = loadSettings().permissions;
        assert.ok(bashRules(deny, "git ").some((rule) => ruleMatches(rule, command)));
    });
}

for (const command of ["git push --force-with-lease origin HEAD", "git push -u origin feat/x", "git add src/a.ts"]) {
    test(`settings: does not deny ${JSON.stringify(command)}`, () => {
        const { deny } = loadSettings().permissions;
        assert.equal(bashRules(deny, "git ").some((rule) => ruleMatches(rule, command)), false);
    });
}

test("settings: npm audit is allowed only in its read-only forms", () => {
    const rules = bashRules(loadSettings().permissions.allow, "npm audit");
    assert.ok(rules.some((rule) => ruleMatches(rule, "npm audit")));
    assert.ok(rules.some((rule) => ruleMatches(rule, "npm audit --audit-level=moderate")));
    for (const command of ["npm audit fix", "npm audit fix --force"]) {
        assert.equal(rules.some((rule) => ruleMatches(rule, command)), false, command);
    }
});

test("settings: browser-pane input and page scripting prompt; read and preview tools stay allowed", () => {
    const { allow } = loadSettings().permissions;
    for (const tool of ["computer", "form_input", "javascript_tool"]) {
        assert.equal(allow.includes(`mcp__Claude_Browser__${tool}`), false, `${tool} must prompt`);
    }
    for (const tool of ["preview_start", "read_page", "get_page_text", "read_console_messages"]) {
        assert.ok(allow.includes(`mcp__Claude_Browser__${tool}`), `${tool} should stay allowed`);
    }
});

test("settings: every allowed npm run names a script in package.json", () => {
    const { scripts } = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
    const named = bashRules(loadSettings().permissions.allow, "npm run ").map((rule) =>
        rule.replace(/^npm run /, "").replace(/:\*$/, "")
    );
    assert.ok(named.length > 0);
    for (const name of named) assert.ok(name in scripts, `npm run ${name} is not a package.json script`);
});

for (const file of [
    ".env",
    ".env.local",
    "sub/.env",
    "sub/.env.production",
    "cert.pfx",
    "certs/dev.pfx",
    "key.pem",
    "certs/server.key",
    "a/b.p12",
]) {
    test(`settings: denies reading the secret file ${JSON.stringify(file)}`, () => {
        const { deny } = loadSettings().permissions;
        assert.ok(deny.filter((r) => r.startsWith("Read(")).some((r) => pathMatches(r.slice(5, -1), file)));
    });
}

for (const file of ["src/visual.ts", "capabilities.json", "docs/MAINTENANCE.md", "test/fixtures/bucket_health_components.csv"]) {
    test(`settings: lets ${JSON.stringify(file)} be read`, () => {
        const { deny } = loadSettings().permissions;
        assert.equal(deny.filter((r) => r.startsWith("Read(")).some((r) => pathMatches(r.slice(5, -1), file)), false);
    });
}

test("git-guard hook fails closed with exit 2 when its decision logic cannot load", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "git-guard-"));
    try {
        const hooks = path.join(dir, ".claude", "hooks");
        fs.mkdirSync(hooks, { recursive: true });
        fs.copyFileSync(HOOK, path.join(hooks, "git-guard.mjs"));
        const run = runHook(
            { tool_name: "Bash", tool_input: { command: "git status" } },
            path.join(hooks, "git-guard.mjs")
        );
        assert.equal(run.status, 2);
        assert.match(run.stderr, /git-guard: could not load/);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});
