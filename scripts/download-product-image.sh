#!/usr/bin/env bash

set -euo pipefail

url="${1:?Missing URL}"
target_base="${2:?Missing target base path without extension}"

tmp_file="$(mktemp)"
trap 'rm -f "$tmp_file"' EXIT

curl -fsSL -A 'Mozilla/5.0' -L "$url" -o "$tmp_file"

mime_type="$(file --mime-type -b "$tmp_file")"

case "$mime_type" in
  image/jpeg) ext="jpg" ;;
  image/png) ext="png" ;;
  image/webp) ext="webp" ;;
  image/avif) ext="avif" ;;
  image/gif) ext="gif" ;;
  *)
    echo "Unsupported mime type: $mime_type" >&2
    exit 1
    ;;
esac

mkdir -p "$(dirname "$target_base")"
final_path="${target_base}.${ext}"
mv "$tmp_file" "$final_path"
trap - EXIT

printf '%s\n' "$final_path"
