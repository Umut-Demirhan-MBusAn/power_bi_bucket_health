/**
 * Decision logic for the PreToolUse guard .claude/hooks/git-guard.mjs (Bash and PowerShell
 * tools); `evaluate` is pure, so test/unit/gitGuard.test.js pins the exact contract. Agents run
 * autonomously, so it blocks only what cannot be undone or takes another session's work:
 * - `git push` whose refspec or `--delete` targets main/master (main moves only by squash PR);
 * - `git add -A` / `--all` / `.` / `:/` (stage by path so unrelated files never ride along);
 * - bare `git stash`, `stash save|pop|clear` (one stash stack is shared by every worktree);
 * - `gh pr merge` unless its own segment carries `BUCKET_HEALTH_MERGE_OK=1` under the Bash tool.
 * Everything else stays a prompt-level rule so a false positive never stalls a run. Only the
 * command position of each segment is inspected: quoted strings, comments and heredoc bodies are
 * data, never commands.
 */

// `<<<` is a here-string (one word of stdin), not a heredoc: its word ends nothing.
const HEREDOC_START = /(?<!<)<<(?!<)-?\s*(['"]?)([A-Za-z_][\w-]*)\1/;

// Leading tokens that wrap the real command. `values`: options that consume the next token;
// `scripts`: options whose value is a command string; `operands`: positionals before the command.
const WRAPPERS = new Map([
  ['sudo', { values: ['-u', '--user', '-g', '--group', '-C', '-D', '--chdir', '-p', '-r', '-t', '-U', '-T'] }],
  ['time', { values: ['-f', '--format', '-o', '--output'] }],
  ['command', {}],
  ['exec', { values: ['-a'] }],
  ['nohup', {}],
  ['env', { values: ['-u', '--unset', '-C', '--chdir'], scripts: ['-S', '--split-string'] }],
  ['timeout', { values: ['-s', '--signal', '-k', '--kill-after'], operands: 1 }],
  ['nice', { values: ['-n', '--adjustment'] }],
  ['xargs', { values: ['-a', '--arg-file', '-d', '--delimiter', '-E', '-I', '-L', '--max-lines', '-n', '--max-args', '-P', '--max-procs', '-s', '--max-chars'] }],
  ['stdbuf', { values: ['-i', '-o', '-e', '--input', '--output', '--error'] }],
  ['setsid', {}],
  ['wsl', { values: ['-d', '--distribution', '--cd', '-u', '--user'] }],
  ['eval', { evalRest: true }],
  ['iex', { evalRest: true }],
  ['invoke-expression', { evalRest: true }],
  // Keywords; tokenize drops grouping parens, so `while (git push ...)` reaches the command too.
  ...['if', 'elif', 'elseif', 'then', 'else', 'while', 'until', 'do', '{', '!'].map((k) => [k, {}]),
]);
const SHELLS = new Set(['bash', 'sh', 'zsh', 'dash', 'pwsh', 'powershell', 'cmd']);
const POWERSHELLS = new Set(['pwsh', 'powershell']);
// PowerShell prefixes that leave the command in place: `[type]` casts (one level of nested
// brackets, as in `[string[]]`), `$var =` / `+=` / `??=` assignments, and `@(` / `[type](` groups.
const PS_CAST = String.raw`\[[\w.]+(?:\[[\w.,\s]*\])*\]`;
const PS_CAST_ONLY = new RegExp(`^(?:${PS_CAST})+$`);
const PS_ASSIGNEE = new RegExp(`^(?:${PS_CAST})*\\$[\\w:]+$`);
const PS_GLUED_ASSIGNMENT = new RegExp(`^(?:${PS_CAST})*\\$[\\w:]+(?:[-+*/%]|\\?\\?)?=(.*)$`, 's');
const PS_OPERATOR = /^(?:[-+*/%]|\?\?)?=(.*)$/s;
const PS_GROUP_START = new RegExp(`^(?:@|(?:${PS_CAST})+)\\(`);
const START_PROCESS = new Set(['start-process', 'saps', 'start']);
const START_PROCESS_SWITCHES = new Set(['-wait', '-nonewwindow', '-passthru', '-loaduserprofile', '-useshellexecute', '-usenewenvironment']);
const START_PROCESS_VALUES = new Set(['-workingdirectory', '-verb', '-windowstyle', '-redirectstandardoutput', '-redirectstandarderror', '-redirectstandardinput', '-credential', '-environment']);

const MAIN_REFSPEC = /^\+?(?:refs\/heads\/|origin\/)?(?:main|master)(?::|$)|:(?:refs\/heads\/)?(?:main|master)$/;
const GIT_VALUE_OPTIONS = ['-C', '-c', '--git-dir', '--work-tree', '--namespace'];
const GH_VALUE_FLAGS = new Set(['-R', '--repo']);

export const MESSAGES = {
  pushMain:
    'BLOCKED: pushing to main/master is forbidden (the "Protect main" ruleset; main changes only through squash-merged PRs). Push your feature branch instead: git push -u origin <branch>.',
  addAll:
    'BLOCKED: git add -A/--all/. is forbidden - stage explicitly by path (git add <file> ...) so unrelated files never ride along.',
  stash:
    'BLOCKED: the stash stack is shared across worktrees and sessions, so a bare stash/pop/clear can take or drop another session\'s work. Prefer a WIP commit; otherwise git stash push -u -m "<unique-tag>" and restore with git stash apply <sha>.',
  merge:
    'BLOCKED: gh pr merge runs only once the PR\'s review is approved and CI is green. Then re-run it through the Bash tool as: BUCKET_HEALTH_MERGE_OK=1 gh pr merge <n> --squash --delete-branch (the PowerShell tool never honours the variable).',
};

// Marks the positions inside single quotes, where neither shell substitutes.
function singleQuoted(line, shell) {
  const escape = shell === 'bash' ? '\\' : '`';
  const mask = [];
  let quote = null;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    mask[i] = quote === "'" || (ch === "'" && quote === null);
    if (quote === "'") {
      if (ch === "'") quote = null;
    } else if (ch === escape) {
      i += 1;
      mask[i] = false;
    } else if (ch === '"') {
      quote = quote === '"' ? null : '"';
    } else if (ch === "'" && quote === null) {
      quote = "'";
    }
  }
  return mask;
}

// Bash backticks are command substitution; PowerShell's backtick is its escape character, so
// lifting them there would read escaped text as a command.
function liftSubstitutions(line, shell, lifted) {
  const pattern = shell === 'bash' ? /\$\(([^()]*)\)|`([^`]*)`/g : /\$\(([^()]*)\)/g;
  let rest = line;
  for (;;) {
    const quoted = singleQuoted(rest, shell);
    const m = [...rest.matchAll(pattern)].find((match) => !quoted[match.index]);
    if (m === undefined) return rest;
    lifted.push(m[1] ?? m[2]);
    rest = `${rest.slice(0, m.index)}_${rest.slice(m.index + m[0].length)}`;
  }
}

// Splits a line on the control operators (`;`, `|`, `||`, `&`, `&&`) outside quotes;
// PowerShell's statement braces separate commands too. `>&`, `<&` and `&>` are redirections.
function splitSegments(line, shell) {
  const escape = shell === 'bash' ? '\\' : '`';
  const separators = shell === 'bash' ? ';|&' : ';|&{}';
  const parts = [];
  let start = 0;
  let quote = null;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quote === "'") {
      if (ch === "'") quote = null;
    } else if (ch === escape) {
      i += 1;
    } else if (quote === '"') {
      if (ch === '"') quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (separators.includes(ch)) {
      const redirect = ch === '&' && (/[<>]/.test(line[i - 1] ?? '') || line[i + 1] === '>');
      if (!redirect) {
        parts.push(line.slice(start, i));
        if ((ch === '&' || ch === '|') && line[i + 1] === ch) i += 1;
        start = i + 1;
      }
    }
  }
  parts.push(line.slice(start));
  return parts;
}

// Words of one segment with quotes and escapes resolved. Unquoted grouping parentheses are
// dropped, and so are redirections with their targets (`>log`, `2>&1`, `<<EOF`).
function tokenize(segment, shell) {
  const escape = shell === 'bash' ? '\\' : '`';
  const tokens = [];
  let current = '';
  let started = false;
  let quote = null;
  let tailParens = 0;
  let redirectTarget = false;
  const reset = () => ([current, started, tailParens] = ['', false, 0]);
  const append = (text) => ([current, started, tailParens] = [current + text, true, 0]);
  const finish = () => {
    const word = current.slice(0, current.length - tailParens);
    if (started && redirectTarget) redirectTarget = false;
    else if (started && word) tokens.push(word);
    reset();
  };
  for (let i = 0; i < segment.length; i += 1) {
    const ch = segment[i];
    if (quote === "'") {
      if (ch === quote) quote = null;
      else append(ch);
    } else if (ch === escape && i + 1 < segment.length && (quote === null || shell !== 'bash' || /["\\$`]/.test(segment[i + 1]))) {
      i += 1;
      append(segment[i]);
    } else if (quote === '"') {
      if (ch === quote) quote = null;
      else append(ch);
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      append('');
    } else if (/\s/.test(ch)) {
      finish();
    } else if (ch === '>' || ch === '<' || (ch === '&' && segment[i + 1] === '>')) {
      if (/^[\d*&]*$/.test(current)) reset();
      else finish();
      while (/[<>&|]/.test(segment[i + 1] ?? '')) i += 1;
      redirectTarget = true;
    } else if (shell !== 'bash' && !started && PS_GROUP_START.test(segment.slice(i))) {
      i += PS_GROUP_START.exec(segment.slice(i))[0].length - 1;
    } else if (ch !== '(' || started) {
      current += ch;
      started = true;
      tailParens = ch === ')' ? tailParens + 1 : 0;
    }
  }
  finish();
  return tokens;
}

// The command a PowerShell Start-Process call launches: -FilePath (or the first positional)
// followed by -ArgumentList (or the second positional).
function startProcessCommand(args) {
  let file;
  const argv = [];
  let inArgs = false;
  for (let i = 0; i < args.length; i += 1) {
    const lower = args[i].toLowerCase();
    if (lower === '-filepath') {
      i += 1;
      file = args[i];
      inArgs = false;
    } else if (lower === '-argumentlist' || lower === '-args') {
      inArgs = true;
    } else if (START_PROCESS_SWITCHES.has(lower) || START_PROCESS_VALUES.has(lower)) {
      if (START_PROCESS_VALUES.has(lower)) i += 1;
      inArgs = false;
    } else if (inArgs || file !== undefined) {
      argv.push(args[i]);
    } else {
      file = args[i];
    }
  }
  return file === undefined ? '' : [file, ...argv].join(' ').replace(/,/g, ' ');
}

function baseName(token) {
  return token.split(/[\\/]/).pop().replace(/\.(?:exe|cmd|ps1)$/i, '').toLowerCase();
}

// Drops a wrapper's own options from `rest`; returns the command string when an option carries
// the command as a single value (`env -S`).
function skipWrapperOptions(rest, spec) {
  while (rest.length > 0 && rest[0].startsWith('-')) {
    const flag = rest.shift();
    if (flag === '--') break;
    if (spec.scripts?.includes(flag)) return rest.shift() ?? '';
    const eq = flag.indexOf('=');
    if (eq > 0 && spec.scripts?.includes(flag.slice(0, eq))) return flag.slice(eq + 1);
    if (spec.values?.includes(flag)) rest.shift();
  }
  for (let n = spec.operands ?? 0; n > 0 && rest.length > 0; n -= 1) rest.shift();
  return undefined;
}

// Strips leading `KEY=value` assignments and wrapper binaries, returning the assignments so a
// rule can require an explicit opt-in variable, or the command string a wrapper evaluates.
// PowerShell casts and `$var =` assignments are stripped too, but never count as the opt-in.
function unwrap(tokens, shell) {
  const env = {};
  const rest = [...tokens];
  for (;;) {
    const head = rest[0];
    if (head === undefined) break;
    const assignment = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/s.exec(head);
    if (assignment) {
      env[assignment[1]] = assignment[2];
      rest.shift();
      continue;
    }
    if (shell === 'powershell') {
      const glued = PS_GLUED_ASSIGNMENT.exec(head);
      const spaced = !glued && PS_ASSIGNEE.test(head) ? PS_OPERATOR.exec(rest[1] ?? '') : null;
      if (glued || spaced) {
        rest.splice(0, glued ? 1 : 2, ...[(glued ?? spaced)[1]].filter(Boolean));
        continue;
      }
      if (PS_CAST_ONLY.test(head)) {
        rest.shift();
        continue;
      }
    }
    const base = baseName(head);
    if (START_PROCESS.has(base)) return { env, rest: [], script: startProcessCommand(rest.slice(1)) };
    const spec = WRAPPERS.get(base);
    if (!spec) break;
    rest.shift();
    if (spec.evalRest) return { env, rest: [], script: rest.join(' ') };
    const script = skipWrapperOptions(rest, spec);
    if (script !== undefined) return { env, rest: [], script };
  }
  return { env, rest };
}

function gitVerdict(args, ctx, expanded = false) {
  const aliases = new Map();
  let i = 0;
  while (i < args.length && args[i].startsWith('-')) {
    const opt = args[i];
    i += 1;
    if (GIT_VALUE_OPTIONS.includes(opt)) {
      const alias = opt === '-c' ? /^alias\.([^=]+)=(.*)$/s.exec(args[i] ?? '') : null;
      if (alias) aliases.set(alias[1].toLowerCase(), alias[2]);
      i += 1;
    }
  }
  const sub = args[i];
  const rest = args.slice(i + 1);
  const alias = sub === undefined || expanded ? undefined : aliases.get(sub.toLowerCase());
  if (alias !== undefined) {
    if (alias.startsWith('!')) return evaluateIn([alias.slice(1), ...rest].join(' '), ctx);
    return gitVerdict([...alias.split(/\s+/).filter(Boolean), ...rest], ctx, true);
  }
  if (sub === 'push') return rest.some((t) => MAIN_REFSPEC.test(t)) ? MESSAGES.pushMain : null;
  if (sub === 'add') {
    const all = rest.some((t) => ['-A', '--all', '.', './', '*', ':/'].includes(t) || /^-[a-zA-Z]*A[a-zA-Z]*$/.test(t));
    return all ? MESSAGES.addAll : null;
  }
  if (sub === 'stash') {
    const verb = rest.find((t) => !t.startsWith('-'));
    if (!verb) return MESSAGES.stash;
    return ['save', 'pop', 'clear'].includes(verb) ? MESSAGES.stash : null;
  }
  return null;
}

// A `KEY=value` prefix is not an assignment in PowerShell, so the merge opt-in is honoured only
// for the Bash tool.
function ghVerdict(args, env, ctx) {
  const words = [];
  for (let i = 0; i < args.length && words.length < 2; i += 1) {
    if (!args[i].startsWith('-')) words.push(args[i]);
    else if (GH_VALUE_FLAGS.has(args[i])) i += 1;
  }
  if (words[0] !== 'pr' || words[1] !== 'merge') return null;
  return ctx.shell === 'bash' && env.BUCKET_HEALTH_MERGE_OK === '1' ? null : MESSAGES.merge;
}

// `bash -c "<script>"` runs the script verbatim, so it is inspected like a command; `-c` may sit
// inside combined flags (`bash -lc`). PowerShell accepts any prefix of `-Command`; cmd takes
// `/c` or `/k` (`//c` from Git Bash, which would otherwise rewrite `/c` as a path).
function nestedShellScript(tool, rest) {
  const scriptFlag =
    tool === 'cmd' ? /^\/\/?[ck]$/i : POWERSHELLS.has(tool) ? /^-c(?:o(?:m(?:m(?:a(?:n(?:d)?)?)?)?)?)?$/i : /^-[a-z]*c[a-z]*$/;
  const flagAt = rest.findIndex((t) => scriptFlag.test(t));
  return flagAt === -1 ? null : rest.slice(flagAt + 1).join(' ');
}

function segmentVerdict(segment, ctx) {
  if (segment.startsWith('#')) return null;
  const { env, rest, script } = unwrap(tokenize(segment, ctx.shell), ctx.shell);
  if (script !== undefined) return evaluateIn(script, ctx);
  if (rest.length === 0) return null;
  const tool = baseName(rest[0]);
  const args = rest.slice(1);
  if (tool === 'git') return gitVerdict(args, ctx);
  if (tool === 'gh') return ghVerdict(args, env, ctx);
  if (!SHELLS.has(tool)) return null;
  const nested = nestedShellScript(tool, args);
  // cmd keeps backslashes literal, as PowerShell does, so its paths tokenize the same way.
  const shell = tool === 'cmd' || POWERSHELLS.has(tool) ? 'powershell' : 'bash';
  return nested ? evaluateIn(nested, { ...ctx, shell }) : null;
}

// Returns the block message of the first offending segment, or null. Heredoc bodies are
// skipped; a line ending in the shell's continuation character joins the next one.
function evaluateIn(command, ctx) {
  const continuation = ctx.shell === 'bash' ? '\\' : '`';
  let terminator = null;
  let pending = '';
  for (const rawLine of String(command).split(/\r?\n/)) {
    if (terminator !== null) {
      if (rawLine.trim() === terminator) terminator = null;
      continue;
    }
    if (rawLine.endsWith(continuation)) {
      pending += `${rawLine.slice(0, -1)} `;
      continue;
    }
    const fullLine = pending + rawLine;
    pending = '';
    const lifted = [];
    const line = liftSubstitutions(fullLine, ctx.shell, lifted);
    for (const inner of lifted) {
      const message = evaluateIn(inner, ctx);
      if (message) return message;
    }
    for (const part of splitSegments(line, ctx.shell)) {
      const trimmed = part.trim();
      const message = trimmed ? segmentVerdict(trimmed, ctx) : null;
      if (message) return message;
    }
    const heredoc = HEREDOC_START.exec(fullLine);
    if (heredoc) terminator = heredoc[2];
  }
  return pending ? evaluateIn(pending, ctx) : null;
}

/** @param {string} command @param {{ shell?: 'bash' | 'powershell' }} [options] */
export function evaluate(command, options = {}) {
  const message = evaluateIn(command, { shell: options.shell ?? 'bash' });
  return message ? { block: true, message } : { block: false };
}
