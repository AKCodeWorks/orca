#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

find "$ROOT_DIR" \
  -type f \
  -name "example.env" \
  -not -path "*/node_modules/*" \
  -not -path "*/.svelte-kit/*" \
  -not -path "*/dist/*" \
  | while IFS= read -r example_file; do
    env_file="$(dirname "$example_file")/.env"

    if [[ ! -f "$env_file" ]]; then
      cp "$example_file" "$env_file"
      echo "created: $env_file"
      continue
    fi

    added=0
    while IFS= read -r line || [[ -n "$line" ]]; do
      [[ -z "${line// }" ]] && continue
      [[ "${line#\#}" != "$line" ]] && continue
      [[ "$line" != *"="* ]] && continue

      key="${line%%=*}"
      if grep -Eq "^${key}=" "$env_file"; then
        continue
      fi

      printf '\n%s\n' "$line" >> "$env_file"
      added=$((added + 1))
    done < "$example_file"

    if [[ "$added" -gt 0 ]]; then
      echo "updated: $env_file (added $added missing vars)"
    else
      echo "up-to-date: $env_file"
    fi
  done
