"use strict";

const { execSync } = require("child_process");
const { prompt } = require("../shared/prompt");
const { YELLOW, RESET } = require("../shared/colors");

async function upgradeHandleDirtyTree() {
  const status = execSync("git status --porcelain", { encoding: "utf8" });
  if (status.trim().length > 0) {
    console.log(YELLOW + "⚠️  You have uncommitted changes:" + RESET);
    console.log(status);
    const answer = await prompt('Commit as "Clean repo before doing bepy-project-init"? (y/n)', "n");
    if (answer !== "y") {
      console.log("Aborting. Please commit or stash your changes first.");
      process.exit(0);
    }
    execSync("git add .", { stdio: "inherit" });
    execSync('git commit -m "CHORE: stash uncommitted changes before upgrade"', { stdio: "inherit" });
  }
}

module.exports = upgradeHandleDirtyTree;
