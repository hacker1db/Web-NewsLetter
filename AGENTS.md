# Repository delivery requirements

Before implementation, search existing issues. Every PR must reference a concrete child issue attached to a parent feature using GitHub sub-issues. Reuse matching issues; create missing ones before opening a PR. Use `Closes #child` only for complete delivery; otherwise use `Refs #child` and explain what remains.

Use isolated worktrees and preserve unrelated changes. Run `pnpm install --frozen-lockfile`, `pnpm test`, and `pnpm build`. Record exact results and failures; never claim unrun checks passed. Run additional lint, type and browser checks when introduced.

For user-visible changes, use the Playwright MCP server to exercise acceptance criteria and capture actual desktop/mobile screenshots. Inspect and return the images. If MCP is unavailable, disclose that limitation; Playwright Test does not establish MCP availability. Keep evidence tied to the tested SHA, URL, viewport, scenario, timestamp and mock/live mode. Screenshots do not prove email delivery or database state.

PRs must contain issue/feature links, behavior changes, acceptance evidence, tested SHA, commands/results, accessible report/screenshot links, and remaining limitations. Local paths are not GitHub evidence links. Backend/tooling-only PRs may explain why screenshots do not apply. Refresh evidence after code changes. Never include credentials, real subscriber data, session cookies or confirmation tokens.
