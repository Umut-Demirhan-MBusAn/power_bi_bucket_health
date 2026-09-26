# Worktree setup on this machine (Windows)

A new worktree is a fresh checkout: it inherits no `node_modules` and no dev server.

- **Deps:** `npm ci` in every worktree, and again after a rebase that changes `package-lock.json`;
  a stale `node_modules` fails the jsdom tests in ways that look like code bugs. Never symlink
  `node_modules`.
- **pbiviz:** a global install, never a dependency: `npm i -g powerbi-visuals-tools@7.1.0`. Every
  worktree shares it; `pbiviz --version` confirms.
- **Dev server:** `pbiviz start` serves https://localhost:8080, and the Power BI Service Developer
  Visual only looks there, so it is machine-wide: one worktree serves at a time — stop the other
  first. Start it through `.claude/launch.json` (`pbiviz-start`), not a foreground shell. The owner
  signs in to the Service; an agent never does.
- **Certificate:** `pbiviz install-cert` once per machine. If Power BI still shows a localhost
  error, open https://localhost:8080/assets in the same browser and trust the certificate.
- **Placement:** sibling directories (`../<repo>-<slug>`) keep paths short. Never rename a worktree
  directory by hand; use `git worktree repair`.
