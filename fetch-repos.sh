#!/usr/bin/env bash
# fetch-repos.sh - Fetch all non-archived repos for the authenticated GitHub user into repos.txt

set -euo pipefail

OUTPUT="repos.txt"

echo "Fetching repositories..."
gh repo list --limit 1000 --no-archived --json nameWithOwner --jq '.[].nameWithOwner' > "$OUTPUT"

COUNT=$(wc -l < "$OUTPUT" | tr -d ' ')
echo "Wrote $COUNT repos to $OUTPUT"
echo "Review the file and remove any repos you want to skip, then run ./run-setup.sh"
