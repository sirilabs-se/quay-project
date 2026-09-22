# Quay — Architecture & Design

A local-first, browser-based command center for Git and GitHub. Scope for this
phase: **Linux (Arch), single machine, single user.**

This document consolidates the decisions made during design, in the order the
original brief asked for them. It's the reference for implementation — if an
implementation detail contradicts this doc, either the doc is wrong (fix it)
or the code is (fix that instead).

---

## 1. Final architecture

```
Browser (SvelteKit SPA, port 3000)
    │  HTTP + WebSocket, bearer session token
    ▼
Local backend (Node.js + TypeScript)
    │  execFile (argv arrays, never shell strings)
    ├── git ────────────► local repositories
    ├── gh  ────────────► GitHub (subcommands, plus `gh api`/`gh api graphql`
    │                      as fallback — the backend never calls
    │                      api.github.com directly)
    └── SQLite (better-sqlite3) ── app state (repos, favorites, cache)
```

- The frontend never runs a shell command directly; every OS interaction goes
  through the backend's HTTP/WS API.
- No cloud component. Local git functionality works offline; GitHub features
  degrade visibly (not silently) when the network or a token is unavailable.

## 2. Backend: Node.js + TypeScript

**Chosen over Go.** Go's main advantage — a single statically-linked
cross-platform binary — stops mattering once the target is Linux-only: `git`
and `gh` are already installed, and requiring `node`/`npm` as a dependency is
a non-issue for this audience. In exchange, Node lets the backend and the
SvelteKit frontend share one `types/` package, so a request/response shape
change is a compile error in both places instead of a runtime surprise in
one. That shared-types benefit is the deciding factor with the cross-platform
tradeoff removed.

## 3. Frontend: SvelteKit (adapter-static) + TypeScript

- Svelte 5 runes (`$state`, `$derived`, `$effect`, `$props`, snippets).
- `adapter-static` — the backend serves the built static output; no SSR
  (pointless for a localhost-only tool).
- Styling: Tailwind + shadcn-svelte/Bits UI for a coherent component system.
- Diff/code rendering: **CodeMirror 6**, not Monaco — Monaco is VS Code's
  full editor engine and heavier than a read-focused diff viewer needs;
  CodeMirror 6 is modular and easier to virtualize for large files.

## 4. Directory structure

```
quay/
├── frontend/                 # SvelteKit app
│   └── src/
│       ├── lib/{components,ui,api,types,utils,stores}/
│       ├── features/{repositories,git,branches,commits,changes,
│       │             pull-requests,issues,actions,releases,accounts,settings}/
│       └── routes/
├── backend/                  # Node.js + TS
│   └── src/
│       ├── services/{git,github,repository,account,process,filesystem,config}/
│       ├── api/               # REST route handlers
│       ├── ws/                # WebSocket/SSE handlers
│       └── db/                # SQLite schema + migrations
├── shared/                   # types package, imported by both
└── packaging/
    └── PKGBUILD               # AUR package (see §11)
```

## 5. API design

REST for request/response, WebSocket for anything long-running or streamed
(fetch/pull/push output, Actions logs, the command console, file-watch
events). Example surface (full set in `shared/types`):

```
GET    /api/repositories
GET    /api/repositories/:id/status
GET    /api/repositories/:id/diff
POST   /api/repositories/:id/stage
POST   /api/repositories/:id/commit
WS     /api/repositories/:id/push            (streamed output)

GET    /api/github/accounts
POST   /api/github/accounts/switch            (session-local only, see §8)

GET    /api/github/repos/:owner/:repo/pulls
POST   /api/github/repos/:owner/:repo/pulls
```

Every request/response is typed via `shared/types` — no `any` across the
frontend/backend boundary.

## 6. Git service design

- All git invocations use `execFile`/`spawn` with **argument arrays**, never
  a shell string — a branch name or commit message can never be interpreted
  as a shell command.
- Every filesystem path from the client is resolved (symlinks included) and
  checked against that repository's registered root before touching disk.
- **Per-repository operation queue.** One git process per repo at a time;
  concurrent requests against the same repo queue rather than race.
- **File watching over polling.** `chokidar` watches `.git` and the working
  tree (debounced) to catch changes made outside Quay (another terminal, an
  editor's git integration) and trigger a status refresh — cheaper and more
  immediate than a polling interval, and avoids the lag/waste tradeoff either
  way a fixed interval forces.

## 7. GitHub service design

`GitHubService` wraps the `gh` binary as the **only** interface to GitHub —
the backend never opens its own connection to `api.github.com`. Every
GitHub operation is an `execFile` call to `gh`, the same way git operations
are calls to `git`:

```
GitHubService
    ├── gh subcommands            (default — gh pr, gh issue, gh repo,
    │                              gh release, gh discussion, etc. cover the
    │                              large majority of what the app needs,
    │                              including Discussions as of gh ≥2.94.0)
    └── gh api / gh api graphql   (fallback, only where no dedicated
                                   subcommand reaches the operation at all:
                                   PR review-thread resolution via the
                                   resolveReviewThread mutation, marking a
                                   Discussion comment as the answer via
                                   markDiscussionCommentAsAnswer — both
                                   still just a `gh` subprocess call, not a
                                   direct HTTP request)
```

This keeps authentication to the one path in §8 and removes the need for a
separate HTTP client or GraphQL query builder in the backend — `gh` already
handles retries, pagination (`--paginate`), and structured output
(`--json`/`--jq`) for nearly everything.

Two consequences worth being explicit about:

- **Process-spawn overhead.** Every call forks a `gh` process — low
  single-digit milliseconds. A non-issue for user-triggered actions (create
  PR, merge, checkout) and for periodic background refresh on the
  configured interval (default 15s). It would matter for live typeahead
  search against GitHub's API, but nothing in the current plan needs that;
  revisit only if a future phase adds it.
- **Rate-limit visibility** doesn't need header parsing: `gh api
  rate_limit` hits the REST `rate_limit` endpoint directly and returns
  clean JSON (`resources.core.remaining`, etc.). Conditional requests
  (`If-None-Match`) are possible later via `gh api -H`/`-i` if API volume
  ever becomes a real constraint, but aren't built in from day one — that's
  complexity with no current payoff.

## 8. Multi-account authentication design

**Requires `gh` ≥ 2.40.0** (verified: this is the version that shipped
`auth token --user <login> --hostname <host>`, `auth switch`, and additive
`auth login` for multiple accounts per host).

- Quay **never** calls `gh auth switch`. That changes `gh`'s *global* active
  account — every other terminal session on the machine would silently
  change identity too, which directly violates "never silently switch
  accounts."
- Instead, the backend resolves a token **per request**: `gh auth token
  --user <login> --hostname <host>`, injected as `GH_TOKEN`/`GH_HOST` for a
  CLI child process, or used directly as a Bearer token for REST/GraphQL.
  The "active account" in Quay is a value the backend passes explicitly on
  every call, not global state anywhere.
- **Repository → account mapping** is resolved from the remote URL. HTTPS
  remotes match by host directly. SSH remotes are resolved through
  `~/.ssh/config` `Host` aliases (e.g. `github-work` → `HostName github.com`)
  rather than assumed from `github.com` literally, since this machine uses
  per-account SSH aliases. The mapping is stored explicitly per repository
  and re-validated on demand, not polled, since SSH config and `gh` accounts
  can drift independently of each other.
- If the active account doesn't match the resolved account for a repo, the
  UI shows an explicit mismatch warning (see the mockup's Overview tab) —
  never a silent fallback.
- First-time account setup still requires one interactive `gh auth login`;
  everything after that is non-interactive via `--user`/`--hostname`.

## 9. Data model

- **SQLite** (`better-sqlite3`), one file under the XDG config dir. Holds:
  repositories (path, favorite, group, account mapping), cached PR/issue
  data (for offline browsing and to reduce API calls), UI state that should
  survive a restart.
- **Flat config file** for single-value settings only (editor path, terminal,
  theme, refresh interval) — SQLite is overkill for values with no relations.
- **Credentials are never stored by Quay.** They're delegated entirely to
  `gh`'s own storage: the OS keyring (libsecret — GNOME Keyring, KWallet)
  when a Secret Service backend is running, falling back to plaintext
  `~/.config/gh/hosts.yml` with restrictive file permissions when it isn't.
  Quay's Settings surfaces which backend is active (verified: `gh`'s
  behavior here, confirmed via `glab`'s documentation, which explicitly
  mirrors it) rather than pretending to manage it — this matters concretely
  on a minimal `plasma-desktop` install, which may not run a Secret Service
  daemon by default.

## 10. Security model

- Binds to `localhost`/`127.0.0.1` only.
- A random session token is generated per launch and required as a header on
  every HTTP and WebSocket call. Strict `Origin`/`Host` validation rejects
  anything else; no permissive CORS. This is built in Phase 1, not deferred
  to polish — any website open in the same browser can otherwise reach a
  `localhost` server, and DNS rebinding can get around bare same-origin
  assumptions.
- No arbitrary command execution endpoint. The command console (§`Terminal /
  Command Console` in the original brief) still runs real `git`/`gh`
  commands, but through the same `execFile`-argv-array path as everything
  else — never a raw shell.
- Every destructive operation (discard, reset --hard, force push, branch/tag
  delete, PR merge/close, repo delete) requires explicit confirmation that
  states plainly what will happen — matches the UX mockup's confirm-modal
  pattern throughout.
- **No telemetry, no error reporting phoned home.** Stated explicitly here
  rather than left as an omission, given "local-first" is a stated
  requirement.

## 11. MVP implementation plan

Phases as originally scoped, reaffirmed for Linux/Arch:

- **Phase 1 — Foundation:** SvelteKit + TS + Vite scaffold, backend HTTP API
  skeleton, session-token auth, process manager, `git`/`gh` detection
  (version + path), basic settings.
- **Phase 2 — Local Git:** repository discovery/list/dashboard, status,
  diff, stage/unstage, commit, branches, checkout, fetch/pull/push, history,
  remotes, stash, tags.
- **Phase 3 — GitHub Accounts:** account detection/auth per §8 above,
  switching, host management, repo/account mapping, mismatch warnings.
- **Phase 4 — Pull Requests**, **Phase 5 — Issues**, **Phase 6 — GitHub
  Features** (Actions, Releases, Labels, Milestones, Collaborators,
  Organizations, Discussions, Notifications), **Phase 7 — Advanced Git**
  (hunk/line staging, merge, rebase, conflict resolution UI, interactive
  rebase), **Phase 8 — Polish** (command palette, shortcuts, performance,
  packaging) — unchanged from the original brief's ordering.

Packaging target for Phase 8: an **AUR PKGBUILD** declaring `nodejs`/`npm`
as dependencies, rather than a bundled single-executable binary — Node's SEA
tooling is explicitly an MVP effort that doesn't bundle npm modules and
doesn't cross-compile, neither of which is a good fit here, whereas an AUR
package fits the workflow already in use for this machine's other tooling.

## 12. Testing strategy

- **Unit + integration:** Vitest, both packages — git command construction
  and output parsing, GitHub API parsing, account resolution, path
  validation, permission handling; integration tests use temporary git
  repositories for commits/branches/merges/rebases/conflicts/stashes/tags.
- **UI:** Playwright, driving a real browser against `localhost` exactly as
  the app is actually used — repository/account switching, staging,
  committing, branch creation, the full PR/issue create-edit-review-merge
  cycle.
- **GitHub tests:** mocked API responses and a dedicated test
  repository/account — never automated tests against personal production
  repositories or accounts.
- Single-OS (Linux) CI matrix — no cross-platform fixtures needed at this
  scope.
