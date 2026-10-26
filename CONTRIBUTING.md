# Contributing

Public contributions begin with an issue. Describe the problem, expected behavior and reproduction steps, or the proposed feature and acceptance criteria. Never include credentials or subscriber data.

Pull requests are reserved for trusted repository collaborators with write access. Maintainers should enable **Settings → General → Features → restrict pull request creation to collaborators**, while keeping Issues enabled. This document alone does not enforce that setting.

## Implementation workflow

1. Find or create the feature issue and a native sub-issue for the work.
2. Use an isolated branch/worktree and make a focused change.
3. Install with `pnpm install --frozen-lockfile`; run `pnpm test` and `pnpm build`.
4. Fill in the PR template with actual results and limitations. Link the child issue and parent feature. Use a closing keyword only when all child acceptance criteria are complete.
5. For UI changes, attach Playwright screenshots and assertion/report evidence tied to the tested commit. Label mocked coverage accurately. Agent authors must also follow AGENTS.md.

The canonical implementation plan is [Newsletter modernization, CI and PR evidence](https://planmanager.hacker1db.dev/plans/mUWHBz1OiWnz5GgoAtmT2), tracked by feature #4. CI runs type checking, ESLint, formatting, Super-Linter, unit tests, build, Playwright and MCP verification. CodeQL remains managed by GitHub default setup; do not add an advanced CodeQL workflow while default setup is enabled.
