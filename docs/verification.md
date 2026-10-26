# Verification and browser evidence

Use Node 22.13 or newer in the Node 22 line and the pnpm version in package.json.

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm lint
pnpm format:check
pnpm test
pnpm exec playwright install --with-deps chromium
pnpm test:e2e
pnpm test:mcp
```

`test:e2e` builds the production app and starts an isolated preview on 127.0.0.1:4174. It runs Chromium desktop and mobile emulation. Signup requests are browser-mocked; the missing-confirmation and anonymous-admin tests hit real routes. Screenshots prove rendering, not live email or database behavior. The server post feed may return data or its fallback; assertions do not depend on external feed content. Live WorkOS/Neon/Resend coverage remains issue #8. No production credentials are needed.

`test:mcp` expects the app to be built and starts a separate preview on 127.0.0.1:4175. It uses the MCP SDK over stdio to connect to the installed Playwright MCP server, discovers tools, navigates, reads accessibility snapshots, and captures desktop/mobile PNGs through `browser_take_screenshot`. It records SHA, dirty state, URLs, timestamps and viewport sizes in `test-results/mcp/manifest.json`. A dirty result is exploratory evidence and must be rerun on the committed tree before publishing final proof.

## Agent connection

After installing dependencies and Chromium, configure your MCP client with the repository's `.mcp.json`, or copy its server command into the client's MCP settings with this repository as the working directory:

```json
{
	"command": "node",
	"args": ["scripts/playwright-mcp.mjs"]
}
```

Codex can load the checked-in `.codex/config.toml` in a trusted project; other compatible clients can use `.mcp.json`. Global settings are not modified. See the [official MCP configuration documentation](https://developers.openai.com/codex/mcp). Reload the client, confirm tool discovery, then use `browser_navigate`, `browser_snapshot`, and `browser_take_screenshot`. Screenshots are saved under `test-results/mcp`. The server uses an isolated headless profile and lockfile-matched Chromium. Start the app separately with `pnpm dev --host 127.0.0.1` for interactive agent work. Never connect test automation to a personal browser session or production admin account.

## PR evidence

CI uploads a `browser-evidence-<head SHA>` artifact for 14 days, including the HTML report, attachments, failure traces, and MCP screenshots/manifest. The checkout tested by pull_request CI may be GitHub's merge commit; consult the manifest for its exact SHA and the artifact name for the PR head. Record both when they differ.

Attach passing screenshots to the PR with `gh pr comment --attach`, or link the Actions artifact. Include acceptance criteria, commands/results, tested SHA, mock/live mode and limitations. Refresh proof after code changes. Keep credentials and real subscriber data out of images, traces and reports.

## WorkOS migration coverage

`pnpm test` exercises both send entry points, admin allowlisting, non-admin denial, public-route auth bypass, provider logout, refresh-versus-logout handling, and duplicate-resolve protection with mocked SDK/database/email adapters. Separate tests use the actual WorkOS SDK to check PKCE/state cookies, forged-session rejection, and invalid callbacks. No test proves live email delivery or a successful live WorkOS login.

The browser suite uses fake WorkOS configuration and inspects the real form redirect without following it to the provider. MCP captures desktop/mobile home, login, and callback-error pages. Live authenticated browser sends and provider-session termination remain deployment acceptance steps in `DEPLOYMENT.md` and issue #13, pending the selected WorkOS environment and web-hacker1db branch configuration.
