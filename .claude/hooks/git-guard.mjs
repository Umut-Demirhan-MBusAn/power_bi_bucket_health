#!/usr/bin/env node
// PreToolUse guard for the Bash and PowerShell tools. Exit 2 + a stderr message blocks the call
// and feeds the message back to the agent; exit 0 allows it. The decision logic lives in
// scripts/git-guard.lib.mjs so it is unit-tested with the rest of the suite. Claude Code treats
// any other exit code as a non-blocking error and runs the command anyway, so every failure path
// here exits 2: a safety hook fails closed. The lib is imported dynamically because a failed
// static import exits 1 before any of this code runs.
import { readFileSync } from 'node:fs';

function refuse(reason) {
  process.stderr.write(`git-guard: ${reason}, refusing to run an unchecked command.\n`);
  process.exit(2);
}

function describe(error) {
  return error instanceof Error ? error.message : String(error);
}

let lib;
try {
  lib = await import('../../scripts/git-guard.lib.mjs');
} catch (error) {
  refuse(`could not load scripts/git-guard.lib.mjs (${describe(error)})`);
}

let payload;
try {
  payload = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  refuse('could not parse the tool input');
}
const command = (payload?.tool_input ?? payload)?.command;
if (typeof command !== 'string') refuse('the tool input has no command string');
const shell = payload.tool_name === 'PowerShell' ? 'powershell' : 'bash';

let verdict;
try {
  verdict = lib.evaluate(command, { shell });
} catch (error) {
  refuse(`failed while checking the command (${describe(error)})`);
}

if (verdict.block) {
  process.stderr.write(`${verdict.message}\n`);
  process.exit(2);
}
process.exit(0);
