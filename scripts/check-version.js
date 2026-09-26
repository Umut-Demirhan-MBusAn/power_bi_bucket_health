#!/usr/bin/env node
'use strict';

/**
 * Verifies that pbiviz.json, package.json, and CHANGELOG.md agree on the
 * visual's version, and (optionally) that a git tag / CHANGELOG section
 * matches it too.
 *
 * Usage:
 *   node scripts/check-version.js                 # verify version consistency
 *   node scripts/check-version.js --tag v1.0.0.0   # also verify the tag matches
 *   node scripts/check-version.js --notes          # print the CHANGELOG section for the version
 *
 * No dependencies. Reads files relative to the current working directory.
 */

const fs = require('fs');
const path = require('path');

const VERSION_PATTERN = /^\d+\.\d+\.\d+\.0$/;

function fail(message) {
  process.stderr.write(`check-version: ${message}\n`);
  process.exit(1);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseArgs(argv) {
  const args = { tag: null, notes: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--tag') {
      args.tag = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--tag=')) {
      args.tag = arg.slice('--tag='.length);
    } else if (arg === '--notes') {
      args.notes = true;
    } else {
      fail(`unrecognized argument "${arg}"`);
    }
  }
  return args;
}

function readJsonFile(filePath) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    fail(`could not read ${filePath}: ${err.message}`);
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    fail(`could not parse ${filePath} as JSON: ${err.message}`);
  }
  return undefined;
}

function readTextFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    fail(`could not read ${filePath}: ${err.message}`);
  }
  return undefined;
}

// Returns the changelog body (lines after the heading, up to the next
// "## " heading or end of file) for the given four-part version.
function extractChangelogSection(changelogText, version, changelogPath) {
  const lines = changelogText.split(/\r?\n/);
  const headingPattern = new RegExp(`^##\\s+${escapeRegExp(version)}\\b`);
  const headingIndex = lines.findIndex((line) => headingPattern.test(line));
  if (headingIndex === -1) {
    fail(`${changelogPath} has no heading for version ${version} (expected a line starting with "## ${version}")`);
  }

  let endIndex = lines.length;
  for (let i = headingIndex + 1; i < lines.length; i += 1) {
    if (/^##\s+/.test(lines[i])) {
      endIndex = i;
      break;
    }
  }

  const body = lines.slice(headingIndex + 1, endIndex).join('\n').trim();
  return body;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const cwd = process.cwd();
  const pbivizPath = path.join(cwd, 'pbiviz.json');
  const packagePath = path.join(cwd, 'package.json');
  const changelogPath = path.join(cwd, 'CHANGELOG.md');

  const pbiviz = readJsonFile(pbivizPath);
  const pkg = readJsonFile(packagePath);
  const changelogText = readTextFile(changelogPath);

  const visualVersion = pbiviz && pbiviz.visual && pbiviz.visual.version;
  if (typeof visualVersion !== 'string') {
    fail(`${pbivizPath} is missing visual.version`);
  }

  if (!VERSION_PATTERN.test(visualVersion)) {
    fail(`${pbivizPath} visual.version "${visualVersion}" must match MAJOR.MINOR.PATCH.0`);
  }

  if (pbiviz.version !== visualVersion) {
    fail(`${pbivizPath} version "${pbiviz.version}" must equal visual.version "${visualVersion}"`);
  }

  const threePart = visualVersion.slice(0, visualVersion.lastIndexOf('.'));
  if (pkg.version !== threePart) {
    fail(`${packagePath} version "${pkg.version}" must equal the first three parts of pbiviz.json visual.version ("${threePart}")`);
  }

  // Validated as a side effect: fails loudly if the heading is missing.
  const section = extractChangelogSection(changelogText, visualVersion, changelogPath);

  if (args.tag !== null) {
    const expectedTag = `v${visualVersion}`;
    if (args.tag !== expectedTag) {
      fail(`tag "${args.tag}" does not match expected "${expectedTag}"`);
    }
  }

  if (args.notes) {
    process.stdout.write(`${section}\n`);
    return;
  }

  process.stdout.write(`check-version: OK (${visualVersion})\n`);
}

main();
