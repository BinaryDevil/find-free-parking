#!/bin/sh
# Usage: fetch.sh <name> <url>   Saves raw/<name> and appends a retrieval line to retrievals.tsv
set -u
D=$(cd "$(dirname "$0")/.." && pwd)
code=$(curl -sL --max-time 60 -A "Mozilla/5.0 (find-free-parking source review)" -o "$D/raw/$1" -w '%{http_code}' "$2")
printf '%s\t%s\t%s\t%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$code" "$1" "$2" >> "$D/retrievals.tsv"
echo "$code $1 $(wc -c < "$D/raw/$1")"
