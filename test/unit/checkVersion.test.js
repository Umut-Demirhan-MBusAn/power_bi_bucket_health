/* eslint-disable powerbi-visuals/non-literal-fs-path -- test-only fixture I/O against a
   mkdtemp()-generated temp dir, not the visual's runtime code. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const SCRIPT_PATH = path.join(__dirname, "../../scripts/check-version.js");

function makeFixtureDir(version) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "check-version-"));
    const threePart = version.slice(0, version.lastIndexOf("."));

    fs.writeFileSync(
        path.join(dir, "pbiviz.json"),
        JSON.stringify({ visual: { version }, version }, null, 4)
    );
    fs.writeFileSync(
        path.join(dir, "package.json"),
        JSON.stringify({ name: "fixture", version: threePart }, null, 4)
    );
    fs.writeFileSync(
        path.join(dir, "CHANGELOG.md"),
        `# Changelog\n\n## ${version} — 2026-01-01\n\nFixture release.\n\n- one\n- two\n`
    );

    return dir;
}

function runCheckVersion(cwd, args = []) {
    return spawnSync(process.execPath, [SCRIPT_PATH, ...args], {
        cwd,
        encoding: "utf8",
    });
}

test("check-version: passes when pbiviz.json, package.json, and CHANGELOG.md agree", () => {
    const dir = makeFixtureDir("1.2.3.0");
    const result = runCheckVersion(dir);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /OK \(1\.2\.3\.0\)/);
});

test("check-version: --tag passes when the tag matches visual.version", () => {
    const dir = makeFixtureDir("1.0.0.0");
    const result = runCheckVersion(dir, ["--tag", "v1.0.0.0"]);
    assert.equal(result.status, 0, result.stderr);
});

test("check-version: --tag fails when the tag does not match visual.version", () => {
    const dir = makeFixtureDir("1.0.0.0");
    const result = runCheckVersion(dir, ["--tag", "v1.0.0.1"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /does not match expected "v1\.0\.0\.0"/);
});

test("check-version: --notes prints the matching CHANGELOG section", () => {
    const dir = makeFixtureDir("2.1.0.0");
    const result = runCheckVersion(dir, ["--notes"]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Fixture release\./);
    assert.match(result.stdout, /- one/);
    assert.match(result.stdout, /- two/);
});

test("check-version: fails when pbiviz.json version and visual.version disagree", () => {
    const dir = makeFixtureDir("1.0.0.0");
    const pbivizPath = path.join(dir, "pbiviz.json");
    const pbiviz = JSON.parse(fs.readFileSync(pbivizPath, "utf8"));
    pbiviz.version = "1.0.0.1";
    fs.writeFileSync(pbivizPath, JSON.stringify(pbiviz, null, 4));

    const result = runCheckVersion(dir);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /must equal visual\.version/);
});

test("check-version: fails when visual.version does not match MAJOR.MINOR.PATCH.0", () => {
    const dir = makeFixtureDir("1.0.0.0");
    const pbivizPath = path.join(dir, "pbiviz.json");
    fs.writeFileSync(
        pbivizPath,
        JSON.stringify({ visual: { version: "1.0.0.1" }, version: "1.0.0.1" }, null, 4)
    );

    const result = runCheckVersion(dir);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /must match MAJOR\.MINOR\.PATCH\.0/);
});

test("check-version: fails when package.json version is not the first three parts", () => {
    const dir = makeFixtureDir("1.0.0.0");
    const packagePath = path.join(dir, "package.json");
    fs.writeFileSync(packagePath, JSON.stringify({ name: "fixture", version: "0.9.0" }, null, 4));

    const result = runCheckVersion(dir);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /package\.json version "0\.9\.0" must equal/);
});

test("check-version: fails when CHANGELOG.md has no heading for the version", () => {
    const dir = makeFixtureDir("1.0.0.0");
    fs.writeFileSync(path.join(dir, "CHANGELOG.md"), "# Changelog\n\n## 0.9.0.0 — 2025-01-01\n\nOld.\n");

    const result = runCheckVersion(dir);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /has no heading for version 1\.0\.0\.0/);
});
