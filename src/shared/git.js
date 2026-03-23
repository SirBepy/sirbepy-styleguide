"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const state = require("../state");
const { RED, YELLOW, RESET } = require("./colors");

function commitIfDirty(message) {
  try {
    const status = execSync("git status --porcelain", { encoding: "utf8" });
    if (status.trim().length > 0) {
      execSync("git add .", { stdio: "inherit" });
      execSync(`git commit -m "${message}"`, { stdio: "inherit" });
    }
    return true;
  } catch (e) {
    return false;
  }
}

function runClaudeCli(promptFile) {
  const promptPath = path.join(state.scriptDir, "prompts", promptFile);

  if (!fs.existsSync(promptPath)) {
    console.log(RED + `❌ Prompt file not found: ${promptPath}` + RESET);
    console.log(YELLOW + `💡 Run it manually: claude < "${promptPath}"` + RESET);
    return false;
  }

  try {
    execSync(
      process.platform === "win32" ? "where claude" : "which claude",
      { stdio: "pipe" },
    );
  } catch (e) {
    console.log(RED + "❌ Claude CLI not found on PATH." + RESET);
    console.log(YELLOW + `💡 Run it manually: claude < "${promptPath}"` + RESET);
    return false;
  }

  try {
    execSync(`claude -p < "${promptPath}"`, { stdio: "inherit" });
    return true;
  } catch (e) {
    console.log(RED + "❌ Claude CLI call failed." + RESET);
    console.log(YELLOW + `💡 Run it manually: claude -p < "${promptPath}"` + RESET);
    return false;
  }
}

module.exports = { commitIfDirty, runClaudeCli };
