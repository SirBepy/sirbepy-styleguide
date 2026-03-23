"use strict";

const { execSync } = require("child_process");
const { RED, RESET } = require("../shared/colors");

function upgradeAssertGitRepo() {
  try {
    execSync("git rev-parse --git-dir", { stdio: "pipe" });
  } catch (e) {
    console.error(RED + "❌ Not a git repository. Please initialize git first." + RESET);
    process.exit(1);
  }
}

module.exports = upgradeAssertGitRepo;
