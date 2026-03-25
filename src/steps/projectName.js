"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const state = require("../state");
const { prompt } = require("../shared/prompt");
const { GREEN, YELLOW, CYAN, RESET } = require("../shared/colors");

function toSnakeCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[-\s]+/g, "_")
    .toLowerCase();
}

function repoNameFromUrl(url) {
  const match = url.trim().match(/\/([^/]+?)(?:\.git)?$/);
  return match ? match[1] : null;
}

async function stepProjectName() {
  const folderName = path.basename(process.cwd());

  let remoteUrl = null;
  let repoName = null;
  try {
    remoteUrl = execSync("git remote get-url origin", { stdio: "pipe" }).toString().trim();
    repoName = repoNameFromUrl(remoteUrl);
  } catch (e) {
    // no remote
  }

  console.log(CYAN + "  Folder:  " + folderName + RESET);
  if (repoName) {
    console.log(CYAN + "  Repo:    " + repoName + RESET);
  }

  const defaultName = toSnakeCase(repoName || folderName);
  const name = await prompt("Project name?", defaultName);

  const folderChanged = name !== folderName;
  const repoChanged = repoName && name !== repoName;

  if (folderChanged) {
    try {
      const newPath = path.join(path.dirname(process.cwd()), name);
      fs.renameSync(process.cwd(), newPath);
      process.chdir(newPath);
      console.log(GREEN + "Folder renamed to " + name + "." + RESET);
    } catch (e) {
      console.log(YELLOW + "⚠️  Could not rename folder (it may be open in another process). Rename it to \"" + name + "\" manually, then re-run." + RESET);
    }
  }

  if (repoChanged) {
    try {
      execSync(`gh repo rename "${name}" --yes`, { stdio: "inherit" });
      console.log(GREEN + "GitHub repo renamed to " + name + "." + RESET);
    } catch (e) {
      console.log(YELLOW + "⚠️  Could not rename GitHub repo (gh CLI missing or not authenticated). Rename it manually." + RESET);
    }
  }

  state.projectName = name;
}

module.exports = stepProjectName;
