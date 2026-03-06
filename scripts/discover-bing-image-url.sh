#!/usr/bin/env bash

set -euo pipefail

query="${1:?Missing query}"

curl -fsSL -A 'Mozilla/5.0' "https://www.bing.com/images/search?q=$(python3 -c 'import sys, urllib.parse; print(urllib.parse.quote_plus(sys.argv[1]))' "$query")" \
  | python3 -c 'import sys, re, html
doc = sys.stdin.read()
patterns = [
    r"murl&quot;:&quot;(https:[^&]+?)&quot;",
    r"murl\":\"(https:[^\"]+?)\"",
]
for pattern in patterns:
    match = re.search(pattern, doc, re.I)
    if match:
        print(html.unescape(match.group(1)).replace("\\/", "/"))
        raise SystemExit
print("")'
