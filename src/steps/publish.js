"use strict";

const { execSync } = require("child_process");
const state = require("../state");
const { prompt } = require("../shared/prompt");
const { GREEN, YELLOW, RESET } = require("../shared/colors");

async function stepPublish() {
  const answer = await prompt("Publish to GitHub? [Y/n]", "y");
  if (answer.toLowerCase() === "n") return;

  try {
    execSync("where gh", { stdio: "pipe" });
  } catch (e) {
    console.log(YELLOW + "⚠️  GitHub CLI (gh) not found. Install it from https://cli.github.com" + RESET);
    return;
  }

  // Ensure at least one commit exists (AI setup may have been skipped)
  try {
    execSync("git rev-parse HEAD", { stdio: "pipe" });
  } catch (e) {
    execSync("git add .", { stdio: "inherit" });
    execSync('git commit -m "CHORE: initial project setup"', { stdio: "inherit" });
  }

  try {
    console.log(YELLOW + "🌐 Creating GitHub repo and pushing..." + RESET);
    execSync(
      "gh repo create " + state.projectName + " --public --source=. --remote=origin --push",
      { stdio: "inherit" },
    );

    const owner = execSync("gh api user --jq .login", { encoding: "utf8" }).trim();

    try {
      execSync(
        "gh api --method POST repos/" + owner + "/" + state.projectName + "/pages --field build_type=workflow",
        { stdio: "pipe" },
      );
      console.log(GREEN + "✅ GitHub Pages enabled." + RESET);
      console.log(GREEN + "   Pages URL: https://" + owner + ".github.io/" + state.projectName + RESET);
    } catch (e) {
      console.log(YELLOW + "⚠️  Could not auto-enable GitHub Pages. Enable it manually in repo settings." + RESET);
    }

    console.log(GREEN + "✅ Repo: https://github.com/" + owner + "/" + state.projectName + RESET);
  } catch (e) {
    console.log(YELLOW + "⚠️  Publish failed: " + e.message + RESET);
  }
}

module.exports = stepPublish;
