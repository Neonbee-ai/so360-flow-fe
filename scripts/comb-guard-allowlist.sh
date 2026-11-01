#!/usr/bin/env bash
# comb-guard-allowlist.sh — print the Comb guard allowlist JSON for an MFE repo.
#
# Usage (from anywhere):
#   bash scripts/comb-guard-allowlist.sh <repo_root> [scan_root ...]   (default scan root: src)
#   bash scripts/comb-guard-allowlist.sh . src > src/__tests__/comb-guard.allowlist.json
#
# Needs only bash + grep -E (macOS BSD grep and GNU grep). No node/npm.
#
# KEEP IN SYNC with src/__tests__/comb-guard.spec.ts: every $'...' pattern below is
# character-for-character the same as the '...' string in the spec's RULES
# (portable ERE/JS subset, no backslashes except \' for the quote). Change both together.
# Canonical copies: SO360 V.2/scripts/comb-guard/.
set -euo pipefail
export LC_ALL=C

repo="${1:-.}"; shift || true
roots=("$@"); [ ${#roots[@]} -eq 0 ] && roots=(src)
cd "$repo"

# Path exclusions (mirrors EXCLUDE_RE in the spec; grep output is "path:line:text").
EXCLUDE_RE='^([^:]*/)?(__tests__|__mocks__|__fixtures__|test|tests|node_modules)/|^[^:]*[.](test|spec|stories)[.]tsx?:|^[^:]*[.]d[.]ts:'
# Comment lines and reviewed exceptions (mirrors COMMENT_RE / EXCEPTION_MARK).
COMMENT_RE='^[^:]+:[0-9]+:[ 	]*(//|/[*]|[*]|[{]/[*])'
EXCEPTION_MARK='comb-exception'

# rule-id | include-glob(s) | pattern
RULES=(
  "raw-table|tsx|"$'<table( |>|$)'
  "raw-palette|ts,tsx|"$'(^|[^a-zA-Z0-9_-])(bg|text|border|border-[xytrbls]|ring|ring-offset|from|to|via|fill|stroke|divide|outline|placeholder|accent|caret|decoration)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3}'
  "raw-palette|ts,tsx|"$'[[]#[0-9a-fA-F]{3,8}]'
  "raw-palette|ts,tsx|"$'style=[{][{].*: *[\'"]#[0-9a-fA-F]{3,8}[\'"]'
  "local-primitive|ts,tsx|"$'export (default )?(async )?(function|const|let|class) (Button|IconButton|Card|Modal|Dialog|Drawer|Badge|Tabs|Table|Select|Input|Spinner|Tooltip)([^a-zA-Z0-9_]|$)'
  "native-dialog|ts,tsx|"$'window[.](confirm|alert|prompt)[(]'
  "native-dialog|ts,tsx|"$'(^|[^.a-zA-Z0-9_$])(confirm|alert|prompt)[(][`\'"]'
  "view-action-column|ts,tsx|"$'label(: *|=[{]?)[\'"]View[\'"]'
  "view-action-column|ts,tsx|"$'>View<'
  "grid-12-cards|ts,tsx|"$'(^|[^a-zA-Z0-9_-])grid-cols-12([^0-9]|$)'
  "raw-control|tsx|"$'<(button|select|input|textarea)( |>|$)'
  "arbitrary-size|ts,tsx|"$'(^|[^a-zA-Z0-9_-])-?(text|w|min-w|max-w|h|min-h|max-h|size|p|px|py|pt|pr|pb|pl|ps|pe|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y|space-x|space-y|leading|tracking|top|right|bottom|left|inset|inset-x|inset-y)-[[](-?[0-9.]|calc|min|max|clamp)'
)
# Per-rule "unless" (mirrors Rule.unless in the spec): a matching line is not a violation.
unless_for() {
  case "$1" in
    raw-control) printf '%s' $'type=[{]?[\'"](file|hidden)[\'"]' ;;
    *) printf '' ;;
  esac
}

pairs=""
for entry in "${RULES[@]}"; do
  id="${entry%%|*}"; rest="${entry#*|}"
  exts="${rest%%|*}"; pat="${rest#*|}"
  inc=()
  for e in ${exts//,/ }; do inc+=("--include=*.${e}"); done
  unless="$(unless_for "$id")"; [ -z "$unless" ] && unless='^$'   # '^$' never matches a grep -n line
  out="$(grep -rnE "${inc[@]}" -e "$pat" "${roots[@]}" 2>/dev/null \
    | grep -vE "$EXCLUDE_RE" | grep -vE "$COMMENT_RE" | grep -vF "$EXCEPTION_MARK" \
    | grep -vE "$unless" | grep -oE '^[^:]+' || true)"
  [ -n "$out" ] && pairs+="$(printf '%s\n' "$out" | sed "s/\$/	$id/")"$'\n'
done

# Emit sorted JSON: { "file": ["rule", ...], ... }
printf '%s' "$pairs" | { grep -v '^$' || true; } | sort -u | {
  printf '{'
  prev=""; first_file=1
  while IFS=$'\t' read -r file rule; do
    if [ "$file" != "$prev" ]; then
      [ -n "$prev" ] && printf ']'
      [ $first_file -eq 1 ] && first_file=0 || printf ','
      printf '\n  "%s": ["%s"' "$file" "$rule"
      prev="$file"
    else
      printf ', "%s"' "$rule"
    fi
  done
  [ -n "$prev" ] && printf ']\n'
  printf '}\n'
}
