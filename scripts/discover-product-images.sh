#!/usr/bin/env bash

set -euo pipefail

UA='Mozilla/5.0'
limit="${1:-0}"
count=0

extract_first_result() {
  python3 -c 'import re, sys, urllib.parse
html = sys.stdin.read()
match = re.search(r"uddg=([^&]+)", html)
print(urllib.parse.unquote(match.group(1)) if match else "")'
}

extract_image_url() {
  python3 -c 'import re, sys, html as html_lib
doc = sys.stdin.read()
patterns = [
    r"<meta[^>]+property=[\"\\x27]og:image[\"\\x27][^>]+content=[\"\\x27]([^\"\\x27]+)",
    r"<meta[^>]+content=[\"\\x27]([^\"\\x27]+)[\"\\x27][^>]+property=[\"\\x27]og:image[\"\\x27]",
    r"<meta[^>]+name=[\"\\x27]twitter:image[\"\\x27][^>]+content=[\"\\x27]([^\"\\x27]+)",
    r"\"image\"\\s*:\\s*\"(https:[^\"\\\\]+)\"",
    r"https:[^\"\\x27 >]+\\.(?:jpg|jpeg|png|webp)"
]
for pattern in patterns:
    match = re.search(pattern, doc, re.I)
    if match:
        print(html_lib.unescape(match.group(1)).replace("\\/", "/"))
        sys.exit(0)
print(\"\")'
}

while IFS='|' read -r slug query; do
  [[ -z "${slug}" ]] && continue

  if [[ "$limit" != "0" && "$count" -ge "$limit" ]]; then
    break
  fi
  count=$((count + 1))

  search_url="https://duckduckgo.com/html/?q=$(python3 -c 'import sys, urllib.parse; print(urllib.parse.quote_plus(sys.argv[1]))' "$query")"
  page_url="$(
    curl -fsSL --connect-timeout 10 --max-time 20 -A "$UA" "$search_url" 2>/dev/null | extract_first_result || true
  )"

  if [[ -z "${page_url}" ]]; then
    printf '%s\t%s\t%s\n' "$slug" "NO_PAGE" "NO_IMAGE"
    continue
  fi

  image_url="$(
    curl -fsSL --connect-timeout 10 --max-time 20 -A "$UA" "$page_url" 2>/dev/null | extract_image_url || true
  )"

  printf '%s\t%s\t%s\n' "$slug" "$page_url" "${image_url:-NO_IMAGE}"
done <<'EOF'
g9-soft-hand-mask|G9 Skin Self Aesthetic Soft Hand Mask 23g
frudia-hand-cream-collection|Frudia My Orchard Hand Cream
vaseline-healthy-hands-stronger-nails|Vaseline Healthy Hands Stronger Nails hand cream 75ml
mixa-creme-mains-reparatrice|Mixa Intensif Peaux Seches creme mains reparatrice
mixa-creme-mains-protectrice|Mixa Intensif Peaux Seches creme mains protectrice
oral-b-vitality-pro|Oral B Vitality Pro Protect X Clean black toothbrush
portable-oral-irrigator|Oral irrigator PPS portable pink
listerine-cool-mint|Listerine Cool Mint mouthwash
butcher-boy-coconut-oil|Butcher Boy Coconut Oil 214 ml
listerine-grapefruit-rose|Listerine grapefruit rose zero alcohol mouthwash
listerine-total-care|Listerine Total Care Clean Mint 500ml
neutrogena-lipcare-spf20|Neutrogena Norwegian Formula Lipcare SPF 20
ariel-all-in-1-pods-color|Ariel All in 1 PODS Color+
vanish-oxi-action-colour-safe|Vanish Oxi Action Colour Safe stain remover
eau-eclarlate-decolor-stop|Eau Eclarlate Decolor Stop 22 lingettes
palmers-brazilian-coco-body-oil|Palmers Brazilian Coco body oil
palmers-tahitian-vanilla-body-oil|Palmers Tahitian Vanilla body oil
loccitane-amande-shower-oil|L Occitane Amande Shower Oil 250ml
dexeryl-essentiel-huile-de-douche|Dexeryl Essentiel Huile de douche apaisante
veetgold-gluta-white-oil|Veetgold Gluta White x10 Rapid white oil
byphasse-cleansing-oil|Byphasse Huile Demaquillante Douceur vitamine E
x-white-gluta-white-oil|X White Paris Gluta White x10 Face and Body Corrector Oil
veetgold-turmeric-oil|Veetgold Turmeric Super Whitening Oil
skin-doctor-gluta-glow-oil|Skin Doctor Paris Gluta Glow Face and Body Corrector
vaseline-vitamin-b3-body-oil|Vaseline Intensive Care Vitamin B3 body oil
mixa-anti-vergetures|Mixa Expert Peau Sensible huile anti vergetures
vaseline-cocoa-radiant-body-gel-oil|Vaseline Cocoa Radiant body gel oil
medix-argan-vitamin-e-body-oil|Medix 5.5 Argan Oil Vitamin E body oil
vaseline-sunlit-glow-gel-oil|Vaseline Sunlit Glow Gel Oil
vaseline-golden-hour-gel-oil|Vaseline Golden Hour Glow Gel Oil
byphasse-gel-douche-dermo-micellaire-argan|Byphasse Gel Douche Dermo Micellaire Argan
irish-spring-original-clean-body-wash|Irish Spring Original Clean body wash 30 oz
palmers-coconut-oil-lip-balm-duo|Palmers Coconut Oil Formula Protect Hydrate SPF 15 lip balm swivel stick duo
EOF
