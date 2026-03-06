#!/usr/bin/env bash

set -euo pipefail

url="${1:?Missing URL}"

curl -fsSL --connect-timeout 10 --max-time 25 -A 'Mozilla/5.0' "$url" 2>/dev/null | python3 -c '
import re
import sys
from html import unescape

doc = sys.stdin.read()
patterns = [
    r"<meta[^>]+property=[\"\x27]og:image[\"\x27][^>]+content=[\"\x27]([^\"\x27]+)",
    r"<meta[^>]+content=[\"\x27]([^\"\x27]+)[\"\x27][^>]+property=[\"\x27]og:image[\"\x27]",
    r"<meta[^>]+name=[\"\x27]twitter:image[\"\x27][^>]+content=[\"\x27]([^\"\x27]+)",
    r"\"image\"\s*:\s*\"(https:[^\"\\\\]+)\"",
    r"https:[^\"\x27 >]+\\.(?:jpg|jpeg|png|webp)"
]

for pattern in patterns:
    match = re.search(pattern, doc, re.I)
    if match:
        print(unescape(match.group(1)).replace("\\/", "/"))
        raise SystemExit
'
