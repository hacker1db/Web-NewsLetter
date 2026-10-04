#!/bin/bash
# Run with bash, not source: credentials stay in this process's memory only.
set +x
set +v
set +a
set -euo pipefail
ulimit -c 0

if [[ "${BASH_SOURCE[0]}" != "$0" ]]; then
  printf '%s\n' 'Run this script with bash; do not source it.' >&2
  return 1
fi

fail() {
  printf '%s\n' "$1" >&2
  exit 1
}

for tool in node vercel stty; do
  command -v "$tool" >/dev/null 2>&1 || fail "Required command missing: $tool"
done

repo_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)
scope=hacker1dbs-projects
# Environment overrides must not redirect uploads away from the verified link.
unset VERCEL_PROJECT_ID VERCEL_ORG_ID

verify_link() {
  if ! node -e '
    const fs = require("fs");
    try {
      const link = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
      if (link.projectId !== "prj_4g3wZ9odO5QJjLSiFfn8kWZZPmLV" ||
          link.orgId !== "team_DvCjPY1ensEY9XKr2941JQC9") process.exit(1);
    } catch (_) { process.exit(1); }
  ' "$repo_root/.vercel/project.json" >/dev/null 2>&1; then
    printf '%s\n' 'Missing, invalid, or wrong Vercel project link. Run:' >&2
    printf 'vercel link --yes --project prj_4g3wZ9odO5QJjLSiFfn8kWZZPmLV --scope %s --cwd "%s"\n' "$scope" "$repo_root" >&2
    exit 1
  fi
}
verify_link

if ! { exec 9<>/dev/tty; } 2>/dev/null; then
  fail 'An interactive terminal is required for hidden prompts.'
fi

unset setup_values setup_reply
setup_values=()
cleanup() {
  unset setup_values setup_reply
  if [[ -n "${tty_state:-}" ]]; then
    stty "$tty_state" <&9 >/dev/null 2>&1 || :
  fi
  exec 9>&-
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
trap 'exit 129' HUP

# Disable echo before displaying prompts, including pasted input arriving early.
tty_state=$(stty -g <&9) || fail 'Unable to read terminal settings.'
stty -echo <&9 || fail 'Unable to disable terminal echo.'

names=(DATABASE_URL RESEND_API_KEY CLERK_SECRET_KEY VITE_CLERK_PUBLISHABLE_KEY ADMIN_USER_IDS SUBSCRIBER_TOKEN_SECRET)

validate() {
  # Only the field name is argv; the candidate arrives through stdin.
  node -e '
    const fs = require("fs");
    const value = fs.readFileSync(0, "utf8");
    let valid = false;
    switch (process.argv[1]) {
      case "DATABASE_URL":
        try {
          const url = new URL(value);
          valid = /^postgres(?:ql)?:\/\//.test(value) &&
            !/\s/.test(value) && Boolean(url.hostname && url.username &&
              url.password && url.pathname.length > 1) && !url.hash;
        } catch (_) {}
        break;
      case "RESEND_API_KEY": valid = /^re_[A-Za-z0-9_-]{10,}$/.test(value); break;
      case "CLERK_SECRET_KEY": valid = /^sk_(live|test)_[A-Za-z0-9_-]{10,}$/.test(value); break;
      case "VITE_CLERK_PUBLISHABLE_KEY": valid = /^pk_(live|test)_[A-Za-z0-9+/=_-]{10,}$/.test(value); break;
      case "ADMIN_USER_IDS": valid = /^user_[A-Za-z0-9]+(\s*,\s*user_[A-Za-z0-9]+)*$/.test(value); break;
      case "SUBSCRIBER_TOKEN_SECRET": valid = value.length >= 32 && !/\s/.test(value); break;
    }
    process.exit(valid ? 0 : 1);
  ' "$1" >/dev/null 2>&1
}

printf '%s\n' \
  'Production only. Input is hidden; nothing is saved locally.' \
  'Enter keeps the existing value (or leaves a missing value unset).' \
  'DATABASE_URL: Enter keeps the Neon integration value.' \
  'SUBSCRIBER_TOKEN_SECRET: Enter keeps existing; GENERATE explicitly creates a new secret.' \
  'Replacing that secret invalidates existing subscriber tokens. Use GENERATE only intentionally.' >&9

for name in "${names[@]}"; do
  while :; do
    setup_reply=''
    printf '%s [Enter = keep]: ' "$name" >&9
    if ! IFS= read -r -s setup_reply <&9; then
      printf '\n' >&9
      fail 'Input interrupted. No values were uploaded.'
    fi
    printf '\n' >&9
    if [[ "$name" == SUBSCRIBER_TOKEN_SECRET && "$setup_reply" == GENERATE ]]; then
      command -v openssl >/dev/null 2>&1 || fail 'openssl is required for explicit secret generation. No values were uploaded.'
      if ! setup_reply=$(openssl rand -hex 32 2>/dev/null); then
        fail 'Secret generation failed. No values were uploaded.'
      fi
      [[ "$setup_reply" =~ ^[a-fA-F0-9]{64}$ ]] || fail 'Invalid generated secret. No values were uploaded.'
    fi
    if [[ -z "$setup_reply" ]] || builtin printf '%s' "$setup_reply" | validate "$name"; then
      setup_values+=("$setup_reply")
      unset setup_reply
      break
    fi
    printf '%s\n' 'Invalid shape; retry. URLs need PostgreSQL credentials and a database; keys need provider prefixes; IDs need comma-separated user_ IDs; subscriber secrets need 32+ non-whitespace characters.' >&9
  done
done

verify_link
printf '%s\n' 'All prompts complete. Uploading supplied values and public constants.' >&9

upload() {
  local upload_name=$1
  local mode=$2
  shift 2
  if [[ "$mode" == sensitive ]]; then
    set -- --sensitive
  else
    set -- --no-sensitive
  fi
  # CLI output is suppressed because error/debug output may contain input.
  if ! vercel env add "$upload_name" production --yes --force "$@" \
      --scope "$scope" --cwd "$repo_root" 9>&- >/dev/null 2>&1; then
    fail "Upload failed for $upload_name. Earlier uploads may have succeeded; no deployment or migration was run. Check CLI login/access and retry."
  fi
}

for ((i = 0; i < ${#names[@]}; i++)); do
  name=${names[$i]}
  if [[ -z "${setup_values[$i]}" ]]; then
    printf 'Kept %s unchanged (missing values remain unset).\n' "$name" >&9
  else
    if [[ "$name" == VITE_CLERK_PUBLISHABLE_KEY ]]; then
      builtin printf '%s' "${setup_values[$i]}" | upload "$name" public
    else
      builtin printf '%s' "${setup_values[$i]}" | upload "$name" sensitive
    fi
    printf 'Uploaded %s.\n' "$name" >&9
  fi
done
unset setup_values

builtin printf '%s' 'https://newsletter.hacker1db.dev' | upload PUBLIC_SITE_URL public
builtin printf '%s' 'https://hacker1db.dev' | upload PUBLIC_BLOG_URL public
builtin printf '%s' 'https://newsletter.hacker1db.dev' | upload CLERK_AUTHORIZED_PARTIES public

printf '%s\n' \
  'Uploads complete. No deployment or migration was run.' \
  'Before proceeding, confirm all required production values exist, including every field you skipped.' \
  'After configuration is complete, run pnpm db:migrate from the repo root in a trusted session with DATABASE_URL securely available.' \
  'Then deploy explicitly with:' >&9
printf 'vercel --prod --scope %s --cwd "%s"\n' "$scope" "$repo_root" >&9
