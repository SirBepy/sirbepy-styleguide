#!/usr/bin/env bash
# run-setup.sh - Clone each repo from repos.txt, run /bepy-project-setup, commit and push if changed

set -uo pipefail

FORCE=false
SKIP_DONE=false
for arg in "$@"; do
  case "$arg" in
    --force) FORCE=true ;;
    --skip-done) SKIP_DONE=true ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPOS_FILE="$SCRIPT_DIR/repos.txt"
LOG_FILE="$SCRIPT_DIR/run-setup.log"
TMPDIR_BASE=$(mktemp -d)

echo "Run started at $(date)" > "$LOG_FILE"
echo "Temp directory: $TMPDIR_BASE" >> "$LOG_FILE"
echo ""

if [ ! -f "$REPOS_FILE" ]; then
  echo "ERROR: $REPOS_FILE not found. Run fetch-repos.sh first."
  exit 1
fi

SUCCESS=0
FAIL=0
SKIP=0
TOTAL=$(wc -l < "$REPOS_FILE" | tr -d ' ')

while IFS= read -r repo; do
  # Skip empty lines
  if [ -z "$repo" ]; then
    continue
  fi

  echo "----------------------------------------"
  echo "[$((SUCCESS + FAIL + SKIP + 1))/$TOTAL] Processing: $repo"
  echo "" >> "$LOG_FILE"
  echo "=== $repo ===" >> "$LOG_FILE"

  REPO_DIR="$TMPDIR_BASE/$(echo "$repo" | tr '/' '_')"

  # Clone
  echo "  Cloning..."
  if ! gh repo clone "$repo" "$REPO_DIR" -- --depth 1 2>> "$LOG_FILE"; then
    echo "  FAIL: clone failed"
    echo "RESULT: clone failed" >> "$LOG_FILE"
    FAIL=$((FAIL + 1))
    continue
  fi

  cd "$REPO_DIR"

  # Skip if already set up (has .portfolio-data)
  if [ "$SKIP_DONE" = true ] && [ -d ".portfolio-data" ]; then
    echo "  SKIP: already done (.portfolio-data exists)"
    echo "RESULT: skipped (already done)" >> "$LOG_FILE"
    cd /
    rm -rf "$REPO_DIR"
    SKIP=$((SKIP + 1))
    continue
  fi

  # Build the prompt
  PROMPT="/bepy-project-setup auto"
  if [ "$FORCE" = true ]; then
    PROMPT="/bepy-project-setup auto -- Force re-run all sub-skills even if they were already applied. Do not skip any skill."
  fi

  # Run the skill
  echo "  Running claude $PROMPT ..."
  CLAUDE_OUT="$TMPDIR_BASE/claude_output.txt"
  claude --dangerously-skip-permissions -p "$PROMPT" > "$CLAUDE_OUT" 2>&1
  CLAUDE_EXIT=$?
  cat "$CLAUDE_OUT"
  cat "$CLAUDE_OUT" >> "$LOG_FILE"
  if [ $CLAUDE_EXIT -ne 0 ]; then
    echo "  FAIL: claude skill failed (exit $CLAUDE_EXIT)"
    echo "RESULT: claude skill failed" >> "$LOG_FILE"
    cd /
    rm -rf "$REPO_DIR"
    FAIL=$((FAIL + 1))
    continue
  fi

  # Check for unpushed commits or uncommitted changes
  echo "  Checking for changes..."
  AHEAD=$(git rev-list --count @{u}..HEAD 2>/dev/null || echo "0")
  HAS_DIRTY=false
  if ! git diff --quiet HEAD 2>/dev/null; then
    HAS_DIRTY=true
  fi
  if [ -n "$(git ls-files --others --exclude-standard)" ]; then
    HAS_DIRTY=true
  fi

  # If there are uncommitted changes, stage and commit them
  if [ "$HAS_DIRTY" = true ]; then
    echo "  Committing leftover changes..."
    git add -A
    git commit -m "chore: run bepy-project-setup skill" 2>> "$LOG_FILE"
    AHEAD=$(git rev-list --count @{u}..HEAD 2>/dev/null || echo "0")
  fi

  # Push if ahead of origin
  if [ "$AHEAD" -gt 0 ] 2>/dev/null; then
    echo "  Pushing $AHEAD commit(s)..."
    if git push 2>> "$LOG_FILE"; then
      echo "  OK: pushed"
      echo "RESULT: success ($AHEAD commits pushed)" >> "$LOG_FILE"
      SUCCESS=$((SUCCESS + 1))
    else
      echo "  FAIL: push failed"
      echo "RESULT: push failed" >> "$LOG_FILE"
      FAIL=$((FAIL + 1))
    fi
  else
    echo "  SKIP: no changes"
    echo "RESULT: no changes" >> "$LOG_FILE"
    SKIP=$((SKIP + 1))
  fi

  echo "  Cleaning up..."
  cd /
  rm -rf "$REPO_DIR"

done < "$REPOS_FILE"

# Cleanup temp base dir
rm -rf "$TMPDIR_BASE"

echo ""
echo "----------------------------------------"
echo "Done. Success: $SUCCESS, Skipped: $SKIP, Failed: $FAIL"
echo "" >> "$LOG_FILE"
echo "Run finished at $(date)" >> "$LOG_FILE"
echo "Success: $SUCCESS, Skipped: $SKIP, Failed: $FAIL" >> "$LOG_FILE"
echo "Full log: $LOG_FILE"
